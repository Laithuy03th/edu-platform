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

/** M03: thông tin ảnh — chỉ chủ khóa; ảnh trong bài bắt buộc alt; ký tự điều khiển bị loại. */
describe("thông tin ảnh (M03)", async () => {
  const media = await import("@/modules/media/service");
  it("quyền + alt bắt buộc + làm sạch", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const now = new Date();
    const { ObjectId } = await import("mongodb");
    const res = await c.mediaAssets.insertOne({
      publicId: `lms/test/c/${p.courseId.toHexString()}/x`, assetId: "a", resourceType: "image", deliveryType: "upload", purpose: "lesson_image", format: "png",
      bytes: 1000, width: 100, height: 100, durationSeconds: null, version: 1, posterPublicId: null, ownerId: p.instructor.id, courseId: p.courseId,
      reservationId: new ObjectId(), status: "ready", refs: [], deletion: null, rejectReason: null, originalFilename: "so-do.png", createdAt: now, updatedAt: now,
    });
    const other = await makeUser(["instructor"]);
    await expect(media.updateImageMeta(other, res.insertedId, { alt: "Sơ đồ", caption: "", credit: "", license: "" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(media.updateImageMeta(p.instructor, res.insertedId, { alt: "", caption: "", credit: "", license: "" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await media.updateImageMeta(p.instructor, res.insertedId, { alt: "Sơ đồ\u0007 luồng   request", caption: "Luồng request", credit: "Tự Học", license: "CC BY 4.0" });
    expect((await c.mediaAssets.findOne({ _id: res.insertedId }))!.imageMeta).toEqual({ alt: "Sơ đồ luồng request", caption: "Luồng request", credit: "Tự Học", license: "CC BY 4.0" });
  });
});

/** A02/A07/P01: gửi lại email có cooldown; hồ sơ kiểm múi giờ; đề dự án giữ id tiêu chí và chỉ công khai sau duyệt. */
describe("tài khoản & dự án (A02, A07, P01)", async () => {
  const auth = await import("@/modules/auth/service");
  const projects = await import("@/modules/projects/service");
  const authoring = await import("@/modules/courses/authoring");
  it("A02: gửi lại ngay sau đăng ký → RATE_LIMITED; đã xác minh → INVALID_STATE", async () => {
    const mails: { text: string }[] = [];
    const deliver = (m: { text: string }) => void mails.push(m);
    const email = `resend_${Date.now()}@test.local`;
    const { userId } = await auth.registerUser({ displayName: "Người thử", email, password: "mat-khau-du-dai-123" }, { ip: `10.9.${Date.now() % 250}.1` }, deliver);
    await expect(auth.resendVerification(userId!, deliver)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const token = mails[0]!.text.match(/token=([A-Za-z0-9_-]+)/)![1]!;
    await auth.verifyEmail(token);
    await expect(auth.resendVerification(userId!, deliver)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(auth.verifyEmail(token)).rejects.toThrow(); // token một lần
  });

  it("A07: múi giờ không hợp lệ bị từ chối; hợp lệ được lưu", async () => {
    const u = await makeUser(["student"]);
    const base = { displayName: "Tên Mới", bio: "", timezone: "Mars/Olympus", learningGoal: "", dataSaver: true, weeklyGoalLessons: 3 };
    await expect(users.updateProfile(u.id, base)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await users.updateProfile(u.id, { ...base, timezone: "Asia/Tokyo" });
    const c = await cols();
    expect((await c.users.findOne({ _id: u.id }))).toMatchObject({ displayName: "Tên Mới", timezone: "Asia/Tokyo", dataSaver: true, weeklyGoalLessons: 3, roles: ["student"] });
  });

  it("P01: chỉ chủ khóa soạn; id tiêu chí rubric ổn định qua các lần lưu; công khai sau khi duyệt", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const rev = async () => (await c.courses.findOne({ _id: p.courseId }))!.draftRevision;
    const other = await makeUser(["instructor"]);
    await expect(projects.createAssignment(other, p.courseId, await rev(), "Đề lạ")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const { assignmentId } = await projects.createAssignment(p.instructor, p.courseId, await rev(), "Blog cá nhân");
    const content = {
      title: "Blog cá nhân", brief: "Xây blog bằng Next.js", objectives: ["Routing"], requirements: ["Có trang 404"], checklist: ["Build được"], resources: [], maxRounds: 3,
      rubric: [{ title: "Routing", maxPoints: 50, passDescription: "Đủ route", failDescription: "Thiếu route", skillTag: "routing" }],
    };
    await projects.saveAssignmentDraft(p.instructor, p.courseId, assignmentId, await rev(), content);
    const id1 = (await c.projectAssignments.findOne({ _id: assignmentId }))!.draft!.rubric[0]!.criterionId;
    await projects.saveAssignmentDraft(p.instructor, p.courseId, assignmentId, await rev(), { ...content, rubric: [{ ...content.rubric[0]!, criterionId: id1, maxPoints: 60 }] });
    const after = (await c.projectAssignments.findOne({ _id: assignmentId }))!;
    expect(after.draft!.rubric[0]).toMatchObject({ criterionId: id1, maxPoints: 60 });
    expect(after.published).toBeNull();
    // Đề chưa gắn vào bài nào → duyệt khóa KHÔNG xuất bản đề (không lộ đề "mồ côi")
    let r = await rev();
    await authoring.submitForReview(p.instructor, p.courseId, r);
    await authoring.approveCourse(p.admin, p.courseId, r);
    expect((await c.projectAssignments.findOne({ _id: assignmentId }))!.published).toBeNull();
    // Gắn vào một bài → duyệt → công khai
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, "draft.deleted": false }))!;
    const { order: _o, deleted: _d, ...ld } = lesson.draft!;
    await authoring.updateLesson(p.instructor, p.courseId, lesson._id, await rev(), { ...ld, projectAssignmentId: assignmentId });
    r = await rev();
    await authoring.submitForReview(p.instructor, p.courseId, r);
    await authoring.approveCourse(p.admin, p.courseId, r);
    expect((await c.projectAssignments.findOne({ _id: assignmentId }))!.published?.rubric[0]?.maxPoints).toBe(60);
  });
});

/** L05: bài đánh giá đầu vào — tạo → xuất bản → học viên làm → gợi ý theo chủ đề; payload trước khi nộp không có đáp án. */
describe("đánh giá đầu vào (L05)", async () => {
  const quiz = await import("@/modules/quizzes/service");
  const authoring = await import("@/modules/courses/authoring");
  it("chủ đề dưới ngưỡng → học trước, đạt → ôn nhanh", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const rev = async () => (await c.courses.findOne({ _id: p.courseId }))!.draftRevision;
    const chapters = await c.chapters.find({ courseId: p.courseId }).toArray();
    const { quizId } = (await quiz.createQuiz(p.instructor, p.courseId, await rev(), "placement", "Đánh giá đầu vào")) as unknown as { quizId: import("mongodb").ObjectId };
    const q = (topic: string, i: number) => ({ prompt: `Câu ${topic} ${i}`, options: [{ text: "Đúng" }, { text: "Sai" }], correctIndex: 0, explanation: "Giải thích", topicKey: topic });
    await quiz.saveQuizDraft(p.instructor, p.courseId, quizId, await rev(), {
      title: "Đánh giá đầu vào",
      passPercent: 50,
      showExplanations: "after_submit",
      questions: [q("routing", 1), q("routing", 2), q("data", 1), q("data", 2)],
      rules: [
        { topicKey: "routing", chapterId: chapters[0]!._id, thresholdPercent: 70 },
        { topicKey: "data", chapterId: (chapters[1] ?? chapters[0])!._id, thresholdPercent: 70 },
      ],
    });
    const r = await rev();
    await authoring.submitForReview(p.instructor, p.courseId, r);
    await authoring.approveCourse(p.admin, p.courseId, r);

    const learner = await makeUser(["student"]);
    await enroll.enroll(learner, p.courseId);
    const attempt = await quiz.getQuizForAttempt(learner, quizId);
    expect(JSON.stringify(attempt)).not.toMatch(/correctOptionId|Giải thích/);
    const v = (await c.quizVersions.findOne({ quizId, version: attempt.version }))!;
    const answers = v.questions.map((qq) => ({ questionId: qq.questionId, optionId: qq.topicKey === "routing" ? qq.correctOptionId : qq.options.find((o) => o.optionId !== qq.correctOptionId)!.optionId }));
    const res = (await quiz.submitQuiz(learner, quizId, { quizVersion: attempt.version, submissionId: `sub-${Date.now()}`, answers })) as unknown as { recommendations?: { topicKey: string; kind: string }[]; placement?: { recommendations: { topicKey: string; kind: string }[] } };
    const recs = res.recommendations ?? res.placement?.recommendations ?? [];
    expect(recs.find((x) => x.topicKey === "routing")?.kind).toBe("quick_review");
    expect(recs.find((x) => x.topicKey === "data")?.kind).toBe("study_first");
  });
});
