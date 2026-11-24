import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { cols } from "@/server/db/models";
import { enroll } from "@/modules/enrollments/service";
import { markComplete } from "@/modules/learning/progress";
import { canReviewCourse, moderateReview, upsertReview } from "@/modules/reviews/service";
import { createAnswer, createQuestion, listQuestions, reportContent } from "@/modules/discussions/service";
import { createAssignment, getSubmission, reviewSubmission, saveAssignmentDraft, saveSubmissionDraft, setShowOnProfile, submitProject } from "@/modules/projects/service";
import { __uncached as profiles, setCourseOnProfile } from "@/modules/achievements/service";
import { updatePublicProfile } from "@/modules/users/service";
import { getPathDetail, savePath, setPathEnrollment } from "@/modules/learning-paths/service";
import * as authoring from "@/modules/courses/authoring";
import { makeUser, publishedCourse, revision } from "./helpers";

describe("đánh giá khóa học (D10)", () => {
  it("một user một review; giảng viên không tự đánh giá; aggregate đúng khi sửa/ẩn", async () => {
    const p = await publishedCourse();
    const a = await makeUser();
    const b = await makeUser();
    for (const u of [a, b]) {
      await enroll(u, p.courseId);
      await markComplete(u, p.lessonIds[0]!);
    }
    expect(await canReviewCourse(p.instructor, p.courseId)).toBe(false);
    await expect(upsertReview(p.instructor, p.courseId, 5, "tự khen")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await upsertReview(a, p.courseId, 5, "Hay");
    await upsertReview(a, p.courseId, 3, "Sửa lại");
    await upsertReview(b, p.courseId, 1, "Spam");
    const c = await cols();
    expect(await c.courseReviews.countDocuments({ courseId: p.courseId })).toBe(2);
    expect((await c.courses.findOne({ _id: p.courseId }))).toMatchObject({ ratingAvg: 2, ratingCount: 2 });
    const spam = await c.courseReviews.findOne({ userId: b.id, courseId: p.courseId });
    await moderateReview(p.admin, spam!._id, "hide", "Spam rõ ràng");
    expect((await c.courses.findOne({ _id: p.courseId }))).toMatchObject({ ratingAvg: 3, ratingCount: 1 });
  });

  it("chưa hoàn thành bài nào thì chưa đánh giá được", async () => {
    const p = await publishedCourse();
    const s = await makeUser();
    await enroll(s, p.courseId);
    await expect(upsertReview(s, p.courseId, 4, "")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("hỏi đáp (D11)", () => {
  it("người không có quyền học không đọc/viết được hỏi đáp bài riêng", async () => {
    const p = await publishedCourse({ lessons: 2 });
    const s = await makeUser();
    await enroll(s, p.courseId);
    await createQuestion(s, p.lessonIds[1]!, "Câu hỏi về bài", "Nội dung bí mật của bài học riêng");
    const stranger = await makeUser();
    await expect(listQuestions(stranger, p.lessonIds[1]!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Giảng viên của khóa đọc và trả lời được, được đánh dấu là giảng viên
    const qa = await listQuestions(p.instructor, p.lessonIds[1]!);
    expect(qa.isInstructor).toBe(true);
    await createAnswer(p.instructor, new ObjectId(qa.items[0]!.id), "Trả lời của giảng viên");
    const c = await cols();
    expect((await c.questions.findOne({ _id: new ObjectId(qa.items[0]!.id) }))?.hasInstructorAnswer).toBe(true);
    // Báo cáo trùng là idempotent
    await reportContent(s, "question", new ObjectId(qa.items[0]!.id), "spam", "");
    await reportContent(s, "question", new ObjectId(qa.items[0]!.id), "spam", "");
    expect(await c.contentReports.countDocuments({ reporterId: s.id })).toBe(1);
  });
});

async function courseWithProject() {
  const p = await publishedCourse();
  const { assignmentId } = await createAssignment(p.instructor, p.courseId, await revision(p.courseId), "Dự án kiểm thử");
  await saveAssignmentDraft(p.instructor, p.courseId, assignmentId, await revision(p.courseId), {
    title: "Dự án kiểm thử",
    brief: "Làm một trang web",
    objectives: [],
    requirements: [],
    checklist: [],
    rubric: [
      { title: "Chức năng", maxPoints: 60, passDescription: "", failDescription: "", skillTag: "html" },
      { title: "Mã nguồn", maxPoints: 40, passDescription: "", failDescription: "", skillTag: "git" },
    ],
    resources: [],
    maxRounds: 2,
  });
  const c = await cols();
  const l = await c.lessons.findOne({ _id: p.lessonIds[0] });
  await authoring.updateLesson(p.instructor, p.courseId, p.lessonIds[0]!, await revision(p.courseId), { ...l!.draft!, projectAssignmentId: assignmentId });
  const rev = await revision(p.courseId);
  await authoring.submitForReview(p.instructor, p.courseId, rev);
  await authoring.approveCourse(p.admin, p.courseId, rev);
  return { ...p, assignmentId };
}

describe("dự án & rubric (D6) + hồ sơ công khai (D7)", () => {
  it("vòng nộp, chấm rubric, giới hạn số vòng; người lạ không xem được bài nộp", async () => {
    const p = await courseWithProject();
    const s = await makeUser();
    await enroll(s, p.courseId);
    await saveSubmissionDraft(s, p.assignmentId, { repoUrl: "https://github.com/x/y", demoUrl: "", description: "v1", selfAssessment: [] });
    await submitProject(s, p.assignmentId);
    const c = await cols();
    const sub = await c.projectSubmissions.findOne({ userId: s.id });
    const a = await c.projectAssignments.findOne({ _id: p.assignmentId });
    const [r1, r2] = a!.published!.rubric;
    await expect(getSubmission(await makeUser(["instructor"]), sub!._id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(reviewSubmission(p.instructor, sub!._id, { roundNo: 1, scores: [{ criterionId: r1!.criterionId, points: 70, comment: "" }, { criterionId: r2!.criterionId, points: 10, comment: "" }], summary: "Vượt điểm tối đa", decision: "accepted" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await reviewSubmission(p.instructor, sub!._id, { roundNo: 1, scores: [{ criterionId: r1!.criterionId, points: 30, comment: "" }, { criterionId: r2!.criterionId, points: 20, comment: "" }], summary: "Cần bổ sung chức năng", decision: "needs_changes" });
    let doc = await c.projectSubmissions.findOne({ _id: sub!._id });
    expect(doc?.status).toBe("needs_changes");
    expect(doc?.rounds[0]?.feedback).toMatchObject({ totalPoints: 50, maxPoints: 100 });
    await saveSubmissionDraft(s, p.assignmentId, { repoUrl: "https://github.com/x/y", demoUrl: "https://demo.example", description: "v2", selfAssessment: [] });
    await submitProject(s, p.assignmentId);
    await reviewSubmission(p.instructor, sub!._id, { roundNo: 2, scores: [{ criterionId: r1!.criterionId, points: 55, comment: "" }, { criterionId: r2!.criterionId, points: 35, comment: "" }], summary: "Đạt yêu cầu tốt", decision: "accepted" });
    doc = await c.projectSubmissions.findOne({ _id: sub!._id });
    expect(doc).toMatchObject({ status: "reviewed", skills: ["html", "git"] });

    // D7: hồ sơ công khai chỉ hiện mục được chọn, không lộ email/điểm
    await updatePublicProfile(s.id, true, `hv-${Date.now()}`);
    const handle = (await c.users.findOne({ _id: s.id }))!.publicProfile.handle!;
    let pub = await profiles.loadPublicProfile(handle);
    expect(pub?.projects).toHaveLength(0);
    await setShowOnProfile(s, sub!._id, true);
    pub = await profiles.loadPublicProfile(handle);
    expect(pub?.projects).toHaveLength(1);
    const json = JSON.stringify(pub);
    expect(json).not.toContain(s.email);
    expect(json).not.toContain("totalPoints");
    expect(json).not.toContain("v2");
    // Tắt hồ sơ → không truy cập được
    await updatePublicProfile(s.id, false, handle);
    expect(await profiles.loadPublicProfile(handle)).toBeNull();
  });

  it("chỉ hiện khóa đã hoàn thành khi học viên chọn", async () => {
    const p = await publishedCourse({ lessons: 1 });
    const s = await makeUser();
    await enroll(s, p.courseId);
    await markComplete(s, p.lessonIds[0]!);
    await updatePublicProfile(s.id, true, `hv2-${Date.now()}`);
    const c = await cols();
    const handle = (await c.users.findOne({ _id: s.id }))!.publicProfile.handle!;
    expect((await profiles.loadPublicProfile(handle))?.courses).toHaveLength(0);
    const e = await c.enrollments.findOne({ userId: s.id, courseId: p.courseId });
    await setCourseOnProfile(s, e!._id, true);
    expect((await profiles.loadPublicProfile(handle))?.courses).toHaveLength(1);
  });
});

describe("lộ trình (D8, D9)", () => {
  it("không đếm trùng khóa và bài của khóa đó; mục bị gỡ không làm hỏng trang; chu trình bị từ chối", async () => {
    const p = await publishedCourse({ lessons: 2 });
    const owner = await makeUser(["instructor"]);
    await expect(savePath(owner, null, { title: "Vòng lặp", goal: "Kiểm thử vòng lặp", audience: "", prerequisites: "", status: "published", featured: false, items: [{ itemId: "a", kind: "milestone", refId: null, title: "A", required: false, dependsOn: ["b"] }, { itemId: "b", kind: "milestone", refId: null, title: "B", required: false, dependsOn: ["a"] }] })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    const r = await savePath(owner, null, {
      title: "Lộ trình kiểm thử",
      goal: "Kiểm thử đếm trùng",
      audience: "",
      prerequisites: "",
      status: "published",
      featured: false,
      items: [
        { itemId: "c", kind: "course", refId: p.courseId, title: null, required: true, dependsOn: [] },
        { itemId: "l", kind: "lesson", refId: p.lessonIds[0]!, title: null, required: true, dependsOn: ["c"] },
      ],
    });
    const s = await makeUser();
    await setPathEnrollment(s, new ObjectId(r.id), "active");
    await enroll(s, p.courseId);
    await markComplete(s, p.lessonIds[0]!);
    let d = await getPathDetail(r.slug, s);
    expect(d?.progress).toEqual({ completed: 1, total: 2, percent: 50 });
    // Gỡ khóa (đình chỉ) → mục không khả dụng, trang vẫn hiển thị
    await authoring.setCourseStatus(p.admin, p.courseId, "suspend", "Kiểm thử gỡ khóa");
    d = await getPathDetail(r.slug, s);
    expect(d?.items.every((i) => !i.available)).toBe(true);
    expect(d?.progress?.total).toBe(0);
  });
});
