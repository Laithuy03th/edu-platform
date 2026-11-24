import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as enroll from "@/modules/enrollments/service";
import { listIssues, myIssuesForLesson, openIssueCount, reportIssue, resolveIssue } from "@/modules/content-issues/service";
import { makeUser, publishedCourse } from "./helpers";

const body = { kind: "code_error" as const, message: "Chạy npm run dev báo lỗi params is a Promise", location: "Khởi tạo", environment: "Windows 11, Node 22" };

/** T06: báo lỗi nội dung → chỉ giảng viên CỦA KHÓA và admin xem/xử lý; người báo thấy trạng thái của mình. */
describe("báo lỗi nội dung (T06)", () => {
  it("cần quyền đọc bài; giới hạn 3 báo cáo mở/bài; quyền xem hộp thư đúng phạm vi", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, "published.isPreview": false, published: { $ne: null } })) ?? (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const learner = await makeUser(["student"]);
    const stranger = await makeUser(["student"]);
    const otherInstructor = await makeUser(["instructor"]);

    if (!lesson.published!.isPreview) await expect(reportIssue(stranger, lesson._id, body)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await enroll.enroll(learner, p.courseId);
    await expect(reportIssue(learner, lesson._id, { ...body, message: "ngắn" })).rejects.toThrow();
    const { id } = await reportIssue(learner, lesson._id, body);
    await reportIssue(learner, lesson._id, body);
    await reportIssue(learner, lesson._id, body);
    await expect(reportIssue(learner, lesson._id, body)).rejects.toMatchObject({ code: "LIMIT_REACHED" });

    // Hộp thư: giảng viên của khóa thấy; giảng viên khác không; học viên bị từ chối
    expect((await listIssues(p.instructor)).some((x) => x.id === id)).toBe(true);
    expect((await listIssues(otherInstructor)).some((x) => x.id === id)).toBe(false);
    await expect(listIssues(learner)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await openIssueCount(p.instructor)).toBeGreaterThanOrEqual(3);
    // Không lộ email người báo
    expect(JSON.stringify(await listIssues(p.instructor))).not.toContain(learner.email);

    // Xử lý: giảng viên khác → NOT_FOUND; thiếu ghi chú → lỗi; đúng người → người báo thấy kết quả
    const { ObjectId } = await import("mongodb");
    await expect(resolveIssue(otherInstructor, new ObjectId(id), "resolved", "đã sửa")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(resolveIssue(p.instructor, new ObjectId(id), "resolved", "")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await resolveIssue(p.instructor, new ObjectId(id), "resolved", "Đã cập nhật ví dụ cho Next.js 16");
    const mine = await myIssuesForLesson(learner, lesson._id);
    expect(mine.find((x) => x.id === id)).toMatchObject({ status: "resolved", resolution: "Đã cập nhật ví dụ cho Next.js 16" });
    expect(await myIssuesForLesson(stranger, lesson._id)).toEqual([]);
    // Admin thấy tất cả
    expect((await listIssues(p.admin, { status: "all" })).some((x) => x.id === id)).toBe(true);
  });
});
