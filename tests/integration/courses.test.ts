import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as authoring from "@/modules/courses/authoring";
import { __uncached as catalog, parseCatalogQuery } from "@/modules/courses/catalog";
import { enroll } from "@/modules/enrollments/service";
import { requireLessonAccess } from "@/modules/learning/access";
import { makeUser, publishedCourse, revision } from "./helpers";

describe("duyệt & xuất bản (C1–C4)", () => {
  it("C1: khóa nháp/chờ duyệt không lộ ở catalog; bản chỉnh sửa chưa duyệt không thay bản công khai", async () => {
    const instructor = await makeUser(["instructor"]);
    const courseId = await authoring.createCourse(instructor, { title: "Khóa nháp bí mật", categoryId: null, level: "beginner" });
    const list = await catalog.listCatalog(parseCatalogQuery({}));
    expect(list.items.some((x) => x.id === courseId.toHexString())).toBe(false);
    const c = await cols();
    const draft = await c.courses.findOne({ _id: courseId });
    expect(await catalog.courseDetail(draft!.slug)).toBeNull();

    // Bản đã xuất bản + sửa nháp → catalog vẫn hiển thị nội dung cũ
    const p = await publishedCourse();
    const pc = await c.courses.findOne({ _id: p.courseId });
    const oldTitle = pc!.published!.title;
    await authoring.updateCourseDraft(p.instructor, p.courseId, await revision(p.courseId), { ...pc!.draft, title: "Tiêu đề MỚI chưa duyệt" });
    const detail = await catalog.courseDetail(pc!.slug);
    expect(detail?.title).toBe(oldTitle);
  });

  it("C2: giảng viên không tự duyệt được; C3: sửa sau khi gửi duyệt bị chặn", async () => {
    const instructor = await makeUser(["instructor"]);
    const courseId = await authoring.createCourse(instructor, { title: "Khóa của tôi", categoryId: null, level: "beginner" });
    await expect(authoring.approveCourse(instructor, courseId, 1)).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Chưa đủ điều kiện → không gửi duyệt được
    await expect(authoring.submitForReview(instructor, courseId, await revision(courseId))).rejects.toMatchObject({ code: "PUBLISH_REQUIREMENTS_FAILED" });
  });

  it("C3: đang chờ duyệt thì không sửa được; admin chỉ duyệt đúng revision đã nộp", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const pc = await c.courses.findOne({ _id: p.courseId });
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await expect(authoring.updateCourseDraft(p.instructor, p.courseId, rev, { ...pc!.draft, title: "Sửa lén" })).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(authoring.approveCourse(p.admin, p.courseId, rev - 1)).rejects.toMatchObject({ code: "STALE_REVISION" });
    await authoring.approveCourse(p.admin, p.courseId, rev);
  });

  it("C4/A9: giảng viên B không sửa được khóa của A; revision cũ bị từ chối", async () => {
    const p = await publishedCourse();
    const other = await makeUser(["instructor"]);
    await expect(authoring.createChapter(other, p.courseId, await revision(p.courseId), { title: "x", description: "" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(authoring.createChapter(p.instructor, p.courseId, 0, { title: "x", description: "" })).rejects.toMatchObject({ code: "STALE_REVISION" });
  });

  it("A10: không chuyển bài sang chương của khóa khác", async () => {
    const a = await publishedCourse();
    const b = await publishedCourse();
    const c = await cols();
    const l = await c.lessons.findOne({ _id: a.lessonIds[0] });
    await expect(authoring.updateLesson(a.instructor, a.courseId, a.lessonIds[0]!, await revision(a.courseId), { ...l!.draft!, chapterId: b.chapterId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("enrollment & quyền đọc bài (C5–C7)", () => {
  it("C5: chưa đăng ký không đọc được bài riêng; bài học thử thì được", async () => {
    const p = await publishedCourse({ lessons: 2, preview: true });
    const stranger = await makeUser();
    await expect(requireLessonAccess(stranger, p.lessonIds[1]!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireLessonAccess(null, p.lessonIds[1]!)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(requireLessonAccess(null, p.lessonIds[0]!)).resolves.toBeTruthy();
  });

  it("C6: đăng ký đồng thời chỉ tạo một enrollment, đếm đúng một lần", async () => {
    const p = await publishedCourse();
    const s = await makeUser();
    await Promise.all([enroll(s, p.courseId), enroll(s, p.courseId), enroll(s, p.courseId)]);
    const c = await cols();
    expect(await c.enrollments.countDocuments({ userId: s.id, courseId: p.courseId })).toBe(1);
    expect((await c.courses.findOne({ _id: p.courseId }))!.enrollmentCount).toBe(1);
    await expect(requireLessonAccess(s, p.lessonIds[1]!)).resolves.toBeTruthy();
  });

  it("C7: không đăng ký được khóa lưu trữ/đình chỉ; email chưa xác minh bị chặn", async () => {
    const p = await publishedCourse();
    const unverified = await makeUser([], { verified: false });
    await expect(enroll(unverified, p.courseId)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await authoring.setCourseStatus(p.admin, p.courseId, "archive", "");
    await expect(enroll(await makeUser(), p.courseId)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("khóa bị đình chỉ: học viên đã đăng ký cũng mất quyền đọc", async () => {
    const p = await publishedCourse();
    const s = await makeUser();
    await enroll(s, p.courseId);
    await authoring.setCourseStatus(p.admin, p.courseId, "suspend", "Vi phạm bản quyền (kiểm thử)");
    await expect(requireLessonAccess(s, p.lessonIds[0]!)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("catalog (C17, C18)", () => {
  it("C17: query không hợp lệ bị chuẩn hóa về mặc định", () => {
    const q = parseCatalogQuery({ sort: "$where", level: "hacker", page: "9999", category: "{$ne:1}" } as never);
    expect(q).toMatchObject({ sort: "newest", level: null, page: 50, category: null });
  });

  it("C18: tìm không dấu khớp tiêu đề có dấu", async () => {
    const p = await publishedCourse();
    const c = await cols();
    await c.courses.updateOne({ _id: p.courseId }, { $set: { "published.searchText": "lap trinh web nang cao" } });
    const r = await catalog.listCatalog(parseCatalogQuery({ q: "Lập Trình" }));
    expect(r.items.some((x) => x.id === p.courseId.toHexString())).toBe(true);
  });
});
