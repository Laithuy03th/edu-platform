import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { cols } from "@/server/db/models";
import * as authoring from "@/modules/courses/authoring";
import { enroll } from "@/modules/enrollments/service";
import { computeProgress, markComplete, saveProgress, setUnderstanding } from "@/modules/learning/progress";
import { courseProgressFor } from "@/modules/learning/queries";
import { getQuizForAttempt, submitQuiz, saveQuizDraft } from "@/modules/quizzes/service";
import { answerReview, dueReviews } from "@/modules/review/service";
import { createNote, deleteNote, searchNotes, updateNote } from "@/modules/notes/service";
import { makeUser, publishedCourse, revision } from "./helpers";

async function enrolled(opts: Parameters<typeof publishedCourse>[0] = {}) {
  const p = await publishedCourse(opts);
  const s = await makeUser();
  await enroll(s, p.courseId);
  return { ...p, s };
}

describe("tiến độ (C8–C10)", () => {
  it("C8: event cũ không ghi đè vị trí mới; furthest chỉ tăng; completed không bị gỡ", async () => {
    const { s, lessonIds } = await enrolled();
    const l = lessonIds[0]!;
    const now = Date.now();
    await saveProgress(s, l, 120, now);
    await saveProgress(s, l, 30, now - 10_000); // beacon đến muộn
    const c = await cols();
    let p = await c.lessonProgress.findOne({ userId: s.id, lessonId: l });
    expect(p?.lastPositionSeconds).toBe(120);
    expect(p?.furthestPositionSeconds).toBe(120);
    await markComplete(s, l, "manual");
    await saveProgress(s, l, 10, Date.now() + 1000);
    p = await c.lessonProgress.findOne({ userId: s.id, lessonId: l });
    expect(p?.completedAt).toBeInstanceOf(Date);
    expect(p?.lastPositionSeconds).toBe(10);
    expect(p?.furthestPositionSeconds).toBe(120);
  });

  it("C9: vị trí không hợp lệ bị từ chối", async () => {
    const { s, lessonIds } = await enrolled();
    await expect(saveProgress(s, lessonIds[0]!, -1, Date.now())).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(saveProgress(s, lessonIds[0]!, Number.POSITIVE_INFINITY, Date.now())).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(saveProgress(s, lessonIds[0]!, 99999, Date.now())).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("C10: bài tùy chọn không tính mẫu số; hoàn thành khóa giữ nguyên khi thêm bài mới", async () => {
    const { s, lessonIds, courseId, instructor, admin, chapterId } = await enrolled({ lessons: 2, optional: 1 });
    let p = await courseProgressFor(s.id, courseId);
    expect(p.total).toBe(2);
    await markComplete(s, lessonIds[0]!);
    await markComplete(s, lessonIds[1]!);
    p = await courseProgressFor(s.id, courseId);
    expect(p).toMatchObject({ completed: 2, total: 2, percent: 100 });
    const c = await cols();
    expect((await c.enrollments.findOne({ userId: s.id, courseId }))?.completedAt).toBeInstanceOf(Date);

    // Giảng viên thêm bài bắt buộc mới và được duyệt → mẫu số tăng, completedAt cũ vẫn giữ
    const { lessonId } = await authoring.createLesson(instructor, courseId, await revision(courseId), { chapterId, title: "Bài mới", type: "reading" });
    await authoring.updateLesson(instructor, courseId, lessonId, await revision(courseId), { chapterId, title: "Bài mới", type: "reading", objectives: [], content: "x", durationSeconds: 60, isPreview: false, isRequired: true, mediaId: null, transcript: null });
    const rev = await revision(courseId);
    await authoring.submitForReview(instructor, courseId, rev);
    await authoring.approveCourse(admin, courseId, rev);
    p = await courseProgressFor(s.id, courseId);
    expect(p).toMatchObject({ completed: 2, total: 3 });
    const e = await c.enrollments.findOne({ userId: s.id, courseId });
    expect(e?.completedAt).toBeInstanceOf(Date);
    expect(e?.completedVersion).toBe(1);
  });

  it("computeProgress thuần", () => {
    const a = new ObjectId(), b = new ObjectId(), o = new ObjectId();
    expect(computeProgress([{ id: a, isRequired: true }, { id: b, isRequired: true }, { id: o, isRequired: false }], new Set([a.toHexString(), o.toHexString()]))).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it("D5: mức độ hiểu tách khỏi hoàn thành", async () => {
    const { s, lessonIds } = await enrolled();
    await markComplete(s, lessonIds[0]!);
    await setUnderstanding(s, lessonIds[0]!, "not_understood");
    const c = await cols();
    const p = await c.lessonProgress.findOne({ userId: s.id, lessonId: lessonIds[0] });
    expect(p?.completedAt).toBeInstanceOf(Date);
    expect(p?.understanding).toBe("not_understood");
  });
});

describe("quiz (C11–C15)", () => {
  it("C11: đề trước khi nộp không có đáp án/giải thích", async () => {
    const { s, quizId } = await enrolled({ withQuiz: true });
    const q = await getQuizForAttempt(s, quizId!);
    const json = JSON.stringify(q);
    expect(json).not.toContain("correctOptionId");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain("Hai");
  });

  it("C12/C13: chấm server; nộp lặp cùng submissionId chỉ tạo 1 attempt và 1 lần review item", async () => {
    const { s, quizId } = await enrolled({ withQuiz: true });
    const q = await getQuizForAttempt(s, quizId!);
    const wrong = q.questions.map((x) => ({ questionId: x.questionId, optionId: x.options[0]!.optionId }));
    const submissionId = randomUUID();
    const input = { quizVersion: q.version, submissionId, answers: wrong, scorePercent: 100, passed: true } as never;
    const [r1, r2] = await Promise.all([submitQuiz(s, quizId!, input), submitQuiz(s, quizId!, input)]);
    expect(r1.scorePercent).toBe(r2.scorePercent);
    expect(r1.scorePercent).toBe(50); // câu 2 đáp án đúng là lựa chọn đầu tiên
    const c = await cols();
    expect(await c.quizAttempts.countDocuments({ userId: s.id, quizId: quizId! })).toBe(1);
    expect(await c.reviewItems.countDocuments({ userId: s.id })).toBe(1);
    expect((await c.quizResults.findOne({ userId: s.id, quizId: quizId! }))?.attemptCount).toBe(1);
  });

  it("C14: quiz đổi version → nộp bản cũ bị từ chối; attempt cũ vẫn xem đúng theo version cũ", async () => {
    const p = await enrolled({ withQuiz: true });
    const q1 = await getQuizForAttempt(p.s, p.quizId!);
    const r1 = await submitQuiz(p.s, p.quizId!, { quizVersion: q1.version, submissionId: randomUUID(), answers: [] });
    await saveQuizDraft(p.instructor, p.courseId, p.quizId!, await revision(p.courseId), {
      title: "Quiz v2",
      passPercent: 50,
      showExplanations: "after_submit",
      questions: [{ prompt: "3 + 3 = ?", options: [{ text: "6" }, { text: "7" }], correctIndex: 0, explanation: "Sáu", topicKey: null }],
      rules: [],
    });
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);
    await expect(submitQuiz(p.s, p.quizId!, { quizVersion: q1.version, submissionId: randomUUID(), answers: [] })).rejects.toMatchObject({ code: "QUIZ_VERSION_CHANGED" });
    const { getAttemptResult } = await import("@/modules/quizzes/service");
    const old = await getAttemptResult(p.s, new ObjectId(r1.attemptId));
    expect(old.questions.map((x) => x.prompt)).toEqual(["1 + 1 = ?", "2 + 2 = ?"]);
  });

  it("C15: chỉ giữ 10 attempt gần nhất, aggregate đúng", async () => {
    const { s, quizId } = await enrolled({ withQuiz: true });
    const q = await getQuizForAttempt(s, quizId!);
    const right = [
      { questionId: q.questions[0]!.questionId, optionId: q.questions[0]!.options[1]!.optionId },
      { questionId: q.questions[1]!.questionId, optionId: q.questions[1]!.options[0]!.optionId },
    ];
    for (let i = 0; i < 12; i++) await submitQuiz(s, quizId!, { quizVersion: q.version, submissionId: randomUUID(), answers: i === 5 ? right : [] });
    const c = await cols();
    expect(await c.quizAttempts.countDocuments({ userId: s.id, quizId: quizId! })).toBe(10);
    const r = await c.quizResults.findOne({ userId: s.id, quizId: quizId! });
    expect(r).toMatchObject({ attemptCount: 12, bestScorePercent: 100, latestScorePercent: 0 });
    expect(r?.firstPassedAt).toBeInstanceOf(Date);
  });
});

describe("ôn tập câu sai (D3)", () => {
  it("câu sai vào lịch; trả lời đúng giãn lịch; revision chống double submit; câu đổi version → stale", async () => {
    const p = await enrolled({ withQuiz: true });
    const q = await getQuizForAttempt(p.s, p.quizId!);
    await submitQuiz(p.s, p.quizId!, { quizVersion: q.version, submissionId: randomUUID(), answers: [] });
    const c = await cols();
    // Đưa về đến hạn hôm nay
    await c.reviewItems.updateMany({ userId: p.s.id }, { $set: { nextReviewAt: new Date(Date.now() - 1000) } });
    const due = await dueReviews(p.s, {});
    expect(due).toHaveLength(2);
    expect(JSON.stringify(due)).not.toContain("correctOptionId");
    const item = due[0]!;
    const v = await c.quizVersions.findOne({ quizId: p.quizId!, version: q.version });
    const itemDoc = await c.reviewItems.findOne({ _id: new ObjectId(item.id) });
    const correct = v!.questions.find((x) => x.questionId === itemDoc!.questionId)!.correctOptionId;
    const r = await answerReview(p.s, new ObjectId(item.id), item.revision, correct);
    expect(r.correct).toBe(true);
    const after = await c.reviewItems.findOne({ _id: new ObjectId(item.id) });
    expect(after?.intervalStep).toBe(1);
    expect(after!.nextReviewAt.getTime() - Date.now()).toBeGreaterThan(2 * 86400_000);
    await expect(answerReview(p.s, new ObjectId(item.id), item.revision, correct)).rejects.toMatchObject({ code: "STALE_REVISION" });

    // Câu hỏi đổi nội dung sau khi duyệt → item còn lại bị đánh dấu stale
    const other = due[1]!;
    await saveQuizDraft(p.instructor, p.courseId, p.quizId!, await revision(p.courseId), {
      title: "Quiz đổi",
      passPercent: 50,
      showExplanations: "after_submit",
      questions: [{ prompt: "Câu mới hoàn toàn", options: [{ text: "a" }, { text: "b" }], correctIndex: 0, explanation: "", topicKey: null }],
      rules: [],
    });
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);
    await expect(answerReview(p.s, new ObjectId(other.id), other.revision, "x")).rejects.toMatchObject({ code: "QUESTION_CHANGED" });
    expect((await c.reviewItems.findOne({ _id: new ObjectId(other.id) }))?.status).toBe("stale");
  });
});

describe("ghi chú (D1)", () => {
  it("chỉ chủ sở hữu thấy/sửa/xóa; tìm kiếm scope theo user", async () => {
    const { s, lessonIds, courseId } = await enrolled();
    const other = await makeUser();
    await enroll(other, courseId);
    const n = await createNote(s, lessonIds[0]!, null, "Bí mật của tôi về React");
    await createNote(other, lessonIds[0]!, null, "React của người khác");
    const mine = await searchNotes(s, { q: "react", page: 1 });
    expect(mine.items.map((x) => x.content)).toEqual(["Bí mật của tôi về React"]);
    await expect(updateNote(other, new ObjectId(n.id), "chiếm", null)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteNote(other, new ObjectId(n.id))).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Người chưa đăng ký không tạo ghi chú được
    await expect(createNote(await makeUser(), lessonIds[0]!, null, "x")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("tìm kiếm không dấu và escape regex", async () => {
    const { s, lessonIds } = await enrolled();
    await createNote(s, lessonIds[0]!, null, "Ghi chú tiếng Việt có dấu");
    expect((await searchNotes(s, { q: "tieng viet", page: 1 })).total).toBe(1);
    expect((await searchNotes(s, { q: ".*", page: 1 })).total).toBe(0);
  });
});
