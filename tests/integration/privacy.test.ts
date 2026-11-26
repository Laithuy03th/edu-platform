import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import { hashPassword } from "@/server/auth/password";
import { resolveViewer } from "@/server/auth/viewer-core";
import { saveSnippet } from "@/modules/playground/service";
import { DELETED_NAME, deleteMyAccount, exportMyData } from "@/modules/users/privacy";
import { makeUser, publishedCourse } from "./helpers";

async function withPassword(email: string, password: string) {
  const c = await cols();
  await c.users.updateOne({ emailNormalized: email }, { $set: { passwordHash: await hashPassword(password) } });
}

/** Quyền với dữ liệu cá nhân: tải dữ liệu (JSON) và tự xóa tài khoản. */
describe("dữ liệu cá nhân: xuất và xóa tài khoản", () => {
  it("xuất đủ dữ liệu của chính mình, không có băm mật khẩu/token", async () => {
    const p = await publishedCourse();
    const u = await makeUser(["student"]);
    const c = await cols();
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const now = new Date();
    await c.enrollments.insertOne({ userId: u.id, courseId: p.courseId, source: "free", status: "active", revokedAt: null, revokedBy: null, revokedReason: null, lastLessonId: lesson._id, lastAccessedAt: now, completedAt: null, completedVersion: null, enrolledAt: now });
    await c.notes.insertOne({ userId: u.id, courseId: p.courseId, lessonId: lesson._id, timestampSeconds: 12, content: "ghi chú bí mật", contentNormalized: "ghi chu bi mat", createdAt: now, updatedAt: now });
    await saveSnippet(u, null, { kind: "python", title: "Thử", files: { py: "print(1)" } });

    const d = await exportMyData(u);
    expect(d.account.email).toBe(u.email);
    expect(d.enrollments[0]!.course.title).toBeTruthy();
    expect(d.notes[0]).toMatchObject({ content: "ghi chú bí mật", timestampSeconds: 12, lesson: lesson.published!.title });
    expect(d.playgroundSnippets[0]!.files.py).toBe("print(1)");
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/passwordHash|tokenHash|authVersion/);

    // người khác không thấy ghi chú của u
    const other = await makeUser(["student"]);
    expect((await exportMyData(other)).notes).toEqual([]);
  });

  it("xóa tài khoản: sai mật khẩu bị từ chối; đúng → ẩn danh hóa, xóa dữ liệu riêng tư, mất phiên, giữ đánh giá ẩn danh", async () => {
    const p = await publishedCourse();
    const u = await makeUser(["student"]);
    await withPassword(u.email, "mat-khau-dung-12345");
    const c = await cols();
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const now = new Date();
    await c.notes.insertOne({ userId: u.id, courseId: p.courseId, lessonId: lesson._id, timestampSeconds: null, content: "x", contentNormalized: "x", createdAt: now, updatedAt: now });
    await c.courseReviews.insertOne({ userId: u.id, courseId: p.courseId, rating: 5, comment: "Hay", status: "visible", hiddenReason: null, hiddenBy: null, createdAt: now, updatedAt: now });
    await c.authAccounts.insertOne({ userId: u.id, provider: "google", providerAccountId: `g-${u.idStr}`, emailAtLink: u.email, linkedAt: now });
    await saveSnippet(u, null, { kind: "web", title: "B", files: {} });
    const before = (await c.users.findOne({ _id: u.id }))!;

    await expect(deleteMyAccount(u, { currentPassword: "sai-mat-khau-0000", confirmEmail: "" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect((await c.users.findOne({ _id: u.id }))!.status).toBe("active");

    await deleteMyAccount(u, { currentPassword: "mat-khau-dung-12345", confirmEmail: "" });
    const after = (await c.users.findOne({ _id: u.id }))!;
    expect(after).toMatchObject({ status: "deleted", displayName: DELETED_NAME, passwordHash: null, bio: "", publicProfile: { enabled: false, handle: null } });
    expect(after.email).not.toBe(u.email);
    expect(after.authVersion).toBe(before.authVersion + 1);
    // Phiên cũ hết hiệu lực
    expect(await resolveViewer({ sub: u.idStr, av: before.authVersion, lat: Math.floor(Date.now() / 1000) })).toBeNull();
    expect(await resolveViewer({ sub: u.idStr, av: after.authVersion, lat: Math.floor(Date.now() / 1000) })).toBeNull();
    // Dữ liệu riêng tư đã xóa; đánh giá giữ lại (ẩn danh qua user)
    expect(await c.notes.countDocuments({ userId: u.id })).toBe(0);
    expect(await c.playgroundSnippets.countDocuments({ userId: u.id })).toBe(0);
    expect(await c.authAccounts.countDocuments({ userId: u.id })).toBe(0);
    expect(await c.courseReviews.countDocuments({ userId: u.id })).toBe(1);
    // Email cũ đăng ký lại được (không còn bị chiếm)
    expect(await c.users.countDocuments({ emailNormalized: u.email })).toBe(0);
  });

  it("tài khoản chỉ dùng Google xác nhận bằng email; giảng viên/quản trị không tự xóa được", async () => {
    const g = await makeUser(["student"]);
    await expect(deleteMyAccount(g, { currentPassword: "", confirmEmail: "khac@example.com" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await deleteMyAccount(g, { currentPassword: "", confirmEmail: g.email.toUpperCase() });
    const c = await cols();
    expect((await c.users.findOne({ _id: g.id }))!.status).toBe("deleted");

    const ins = await makeUser(["instructor"]);
    await expect(deleteMyAccount(ins, { currentPassword: "", confirmEmail: ins.email })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = await makeUser(["admin"]);
    await expect(deleteMyAccount(admin, { currentPassword: "", confirmEmail: admin.email })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
