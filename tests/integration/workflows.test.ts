import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as enroll from "@/modules/enrollments/service";
import * as users from "@/modules/users/service";
import * as admin from "@/modules/admin/service";
import * as qa from "@/modules/discussions/service";
import * as notes from "@/modules/notes/service";
import { makeUser, publishedCourse } from "./helpers";

/** A08: đơn xin làm giảng viên — một đơn chờ/user, chỉ admin duyệt, duyệt → có role instructor, không duyệt lại được. */
describe("đơn giảng viên (A08)", () => {
  it("nộp → trùng bị chặn → học viên không duyệt được → admin duyệt → có quyền giảng viên", async () => {
    const u = await makeUser(["student"]);
    const a = await makeUser(["admin"]);
    await users.applyInstructor(u.id, "Tôi muốn dạy Next.js cho người mới bắt đầu.", null);
    await expect(users.applyInstructor(u.id, "Nộp lần hai khi còn đơn chờ", null)).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
    const c = await cols();
    const app = (await c.instructorApplications.findOne({ userId: u.id, status: "pending" }))!;
    await expect(admin.decideApplication(u, app._id, "approved", "")).rejects.toThrow();
    await admin.decideApplication(a, app._id, "approved", "Hồ sơ tốt");
    expect((await c.users.findOne({ _id: u.id }))!.roles).toContain("instructor");
    await expect(admin.decideApplication(a, app._id, "rejected", "đổi ý")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(users.applyInstructor(u.id, "Đã là giảng viên rồi mà vẫn nộp", null)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});

/** D01/D03: hỏi đáp theo bài — chấp nhận câu trả lời; báo cáo idempotent; admin ẩn → đóng báo cáo. */
describe("hỏi đáp & kiểm duyệt (D01, D03)", () => {
  it("chỉ người hỏi chấp nhận; chỉ giảng viên đánh dấu hữu ích; báo cáo 2 lần = 1; ẩn có audit", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const asker = await makeUser(["student"]);
    const helper = await makeUser(["student"]);
    await enroll.enroll(asker, p.courseId);
    await enroll.enroll(helper, p.courseId);

    await qa.createQuestion(asker, lesson._id, "params là Promise nghĩa là gì?", "Em chưa hiểu vì sao phải await params trong page.");
    const q = (await c.questions.findOne({ authorId: asker.id, lessonId: lesson._id }))!;
    await qa.createAnswer(helper, q._id, "Từ Next 15 params là Promise nên cần await trước khi đọc slug.");
    const ans = (await c.answers.findOne({ questionId: q._id }))!;

    await expect(qa.acceptAnswer(helper, ans._id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await qa.acceptAnswer(asker, ans._id, true);
    expect((await c.questions.findOne({ _id: q._id }))!.acceptedAnswerId?.equals(ans._id)).toBe(true);
    await qa.acceptAnswer(asker, ans._id, false);
    expect((await c.questions.findOne({ _id: q._id }))!.acceptedAnswerId).toBeNull();

    await expect(qa.markHelpful(asker, ans._id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await qa.markHelpful(p.instructor, ans._id, true);
    expect((await c.answers.findOne({ _id: ans._id }))!.markedHelpfulBy?.equals(p.instructor.id)).toBe(true);

    // Báo cáo idempotent theo người báo + đối tượng
    await qa.reportContent(asker, "answer", ans._id, "spam", "quảng cáo");
    await qa.reportContent(asker, "answer", ans._id, "spam", "quảng cáo");
    expect(await c.contentReports.countDocuments({ targetId: ans._id, status: "open" })).toBe(1);
    await expect(qa.moderationQueue(asker)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await qa.moderationQueue(p.admin)).some((r) => r.targetId === ans._id.toHexString())).toBe(true);

    await qa.moderate(p.admin, "answer", ans._id, "hide", "spam");
    expect((await c.answers.findOne({ _id: ans._id }))!.status).toBe("hidden");
    expect(await c.contentReports.countDocuments({ targetId: ans._id, status: "open" })).toBe(0);
    expect(await c.auditLogs.countDocuments({ action: "moderation.hide", targetId: ans._id.toHexString() })).toBe(1);
  });
});

/** L11: xuất ghi chú Markdown — chỉ ghi chú của CHÍNH người xem, lọc theo khóa. */
describe("xuất ghi chú (L11)", () => {
  it("không lẫn ghi chú người khác; lọc theo khóa", async () => {
    const p = await publishedCourse();
    const p2 = await publishedCourse();
    const c = await cols();
    const l1 = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const l2 = (await c.lessons.findOne({ courseId: p2.courseId, published: { $ne: null } }))!;
    const me = await makeUser(["student"]);
    const other = await makeUser(["student"]);
    for (const u of [me, other]) {
      await enroll.enroll(u, p.courseId);
      await enroll.enroll(u, p2.courseId);
    }
    await notes.createNote(me, l1._id, 65, "Ghi chú của tôi ở khóa 1");
    await notes.createNote(me, l2._id, null, "Ghi chú của tôi ở khóa 2");
    await notes.createNote(other, l1._id, 10, "BÍ MẬT của người khác");

    const all = await notes.exportNotesMarkdown(me, null);
    expect(all).toContain("Ghi chú của tôi ở khóa 1");
    expect(all).toContain("Ghi chú của tôi ở khóa 2");
    expect(all).not.toContain("BÍ MẬT");
    const one = await notes.exportNotesMarkdown(me, p.courseId);
    expect(one).toContain("khóa 1");
    expect(one).not.toContain("khóa 2");
  });
});

/** T08: độ phủ nội dung — chỉ admin; khóa chưa review nằm trong hàng đợi; review đúng bản → ra khỏi hàng đợi. */
describe("độ phủ nội dung (T08)", async () => {
  const { contentCoverage } = await import("@/modules/admin/coverage");
  const tech = await import("@/modules/technologies/service");
  it("chưa review → trong hàng đợi; ghi nhận review → không còn", async () => {
    const p = await publishedCourse();
    await expect(contentCoverage(p.instructor)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const href = `/admin/courses/${p.courseId.toHexString()}`;
    const before = await contentCoverage(p.admin);
    expect(before.queue.find((q) => q.href === href)?.review).toBe("none");
    await tech.recordContentReview(p.admin, p.courseId, { reviewerName: "Người Review Thật", note: "" });
    const after = await contentCoverage(p.admin);
    expect(after.queue.some((q) => q.href === href)).toBe(false);
    expect(after.totals.reviewed).toBe(before.totals.reviewed + 1);
  });
});
