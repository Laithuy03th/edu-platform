import "server-only";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { cols, type QuizContent, type QuizQuestion } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { loadEditableCourse, touchCourseDraft } from "@/modules/courses/authoring";
import { canReadLesson, toPolicyCourse } from "@/modules/courses/policy";
import { requireLessonAccess } from "@/modules/learning/access";
import { markComplete } from "@/modules/learning/progress";
import { initialSchedule } from "@/modules/review/schedule";
import { gradeQuiz, placementRecommendations, questionFingerprint, type SubmittedAnswer } from "./grading";

export const MAX_QUESTIONS = 30;
export const ATTEMPTS_KEPT = 10;

/* ================= Soạn quiz (giảng viên) ================= */

export async function createQuiz(viewer: Viewer, courseId: ObjectId, expectedRevision: number, kind: "lesson" | "placement", title: string) {
  const revision = await touchCourseDraft(viewer, courseId, expectedRevision);
  const c = await cols();
  const now = new Date();
  const res = await c.quizzes.insertOne({
    courseId,
    kind,
    draft: { title, passPercent: kind === "placement" ? 0 : 70, showExplanations: "after_submit", questions: [], rules: [] },
    publishedVersion: null,
    createdAt: now,
    updatedAt: now,
  });
  if (kind === "placement") await c.courses.updateOne({ _id: courseId }, { $set: { "draft.placementQuizId": res.insertedId } });
  return { revision, quizId: res.insertedId };
}

export type QuestionInput = {
  questionId?: string;
  prompt: string;
  options: { optionId?: string; text: string }[];
  correctIndex: number;
  explanation: string;
  topicKey: string | null;
};

/** Lưu bản nháp quiz; questionId/optionId ổn định; version câu tăng khi nội dung chấm điểm đổi. */
export async function saveQuizDraft(
  viewer: Viewer,
  courseId: ObjectId,
  quizId: ObjectId,
  expectedRevision: number,
  input: { title: string; passPercent: number; showExplanations: QuizContent["showExplanations"]; questions: QuestionInput[]; rules: { topicKey: string; chapterId: ObjectId; thresholdPercent: number }[] },
) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const quiz = await c.quizzes.findOne({ _id: quizId, courseId });
  if (!quiz) throw notFound("Không tìm thấy quiz");
  if (input.questions.length > MAX_QUESTIONS) throw new AppError("LIMIT_REACHED", `Tối đa ${MAX_QUESTIONS} câu hỏi.`);
  for (const r of input.rules) {
    if (!(await c.chapters.findOne({ _id: r.chapterId, courseId }))) throw notFound("Chương trong quy tắc không thuộc khóa học");
  }
  const prev = new Map(quiz.draft.questions.map((q) => [q.questionId, q]));
  const questions: QuizQuestion[] = input.questions.map((qi, idx) => {
    if (qi.options.length < 2 || qi.options.length > 6) throw new AppError("VALIDATION_FAILED", `Câu ${idx + 1}: cần 2–6 lựa chọn.`);
    if (qi.correctIndex < 0 || qi.correctIndex >= qi.options.length) throw new AppError("VALIDATION_FAILED", `Câu ${idx + 1}: chưa chọn đáp án đúng.`);
    const old = qi.questionId ? prev.get(qi.questionId) : undefined;
    const oldOptionIds = new Set(old?.options.map((o) => o.optionId));
    const options = qi.options.map((o) => ({ optionId: o.optionId && oldOptionIds.has(o.optionId) ? o.optionId : randomUUID().slice(0, 8), text: o.text }));
    const draft = { prompt: qi.prompt, options, correctOptionId: options[qi.correctIndex]!.optionId, explanation: qi.explanation };
    const version = old ? (questionFingerprint(old) === questionFingerprint(draft) ? old.version : old.version + 1) : 1;
    return { questionId: old?.questionId ?? randomUUID(), version, kind: "single_choice", topicKey: qi.topicKey, ...draft };
  });
  const revision = await touchCourseDraft(viewer, courseId, expectedRevision);
  await c.quizzes.updateOne(
    { _id: quizId },
    { $set: { draft: { title: input.title, passPercent: input.passPercent, showExplanations: input.showExplanations, questions, rules: input.rules }, updatedAt: new Date() } },
  );
  return revision;
}

export async function getQuizForEditor(viewer: Viewer, courseId: ObjectId, quizId: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const quiz = await c.quizzes.findOne({ _id: quizId, courseId });
  if (!quiz) throw notFound("Không tìm thấy quiz");
  return quiz;
}

/* ================= Làm quiz ================= */

async function loadPublishedQuiz(viewer: Viewer, quizId: ObjectId) {
  const c = await cols();
  const quiz = await c.quizzes.findOne({ _id: quizId });
  if (!quiz?.publishedVersion) throw notFound("Không tìm thấy quiz");
  const course = await c.courses.findOne({ _id: quiz.courseId });
  if (!course) throw notFound("Không tìm thấy quiz");
  let lessonId: ObjectId | null = null;
  if (quiz.kind === "lesson") {
    const lesson = await c.lessons.findOne({ courseId: quiz.courseId, "published.quizId": quizId }, { projection: { _id: 1 } });
    if (!lesson) throw notFound("Không tìm thấy quiz");
    await requireLessonAccess(viewer, lesson._id); // quyền học bài chứa quiz
    lessonId = lesson._id;
  } else {
    if (!course.published?.placementQuizId?.equals(quizId)) throw notFound("Không tìm thấy quiz");
    const enrollment = await c.enrollments.findOne({ userId: viewer.id, courseId: course._id });
    const decision = canReadLesson(viewer, toPolicyCourse(course), { isPreview: false }, enrollment);
    if (!decision.ok) throw new AppError("FORBIDDEN", "Bạn cần đăng ký khóa học để làm bài đánh giá đầu vào.");
  }
  const version = await c.quizVersions.findOne({ quizId, version: quiz.publishedVersion });
  if (!version) throw notFound("Không tìm thấy quiz");
  return { quiz, course, version, lessonId };
}

/** DTO trước khi nộp: KHÔNG có correctOptionId/explanation (C11). */
export async function getQuizForAttempt(viewer: Viewer, quizId: ObjectId) {
  const { quiz, course, version, lessonId } = await loadPublishedQuiz(viewer, quizId);
  const c = await cols();
  const result = await c.quizResults.findOne({ userId: viewer.id, quizId });
  const attempts = await c.quizAttempts.find({ userId: viewer.id, quizId }).project<{ _id: ObjectId; scorePercent: number; passed: boolean; submittedAt: Date; quizVersion: number }>({ scorePercent: 1, passed: 1, submittedAt: 1, quizVersion: 1 }).sort({ submittedAt: -1 }).limit(ATTEMPTS_KEPT).toArray();
  return {
    quizId: quizId.toHexString(),
    kind: quiz.kind,
    courseSlug: course.slug,
    courseTitle: course.published?.title ?? "",
    lessonId: lessonId?.toHexString() ?? null,
    version: version.version,
    title: version.title,
    passPercent: version.passPercent,
    questions: version.questions.map((q) => ({ questionId: q.questionId, prompt: q.prompt, options: q.options.map((o) => ({ optionId: o.optionId, text: o.text })) })),
    result: result ? { best: result.bestScorePercent, latest: result.latestScorePercent, attemptCount: result.attemptCount } : null,
    attempts: attempts.map((a) => ({ id: a._id.toHexString(), scorePercent: a.scorePercent, passed: a.passed, submittedAt: a.submittedAt.toISOString(), outdated: a.quizVersion !== version.version })),
  };
}

export type QuizResultDto = Awaited<ReturnType<typeof buildResult>>;

async function buildResult(attemptId: ObjectId, userId: ObjectId) {
  const c = await cols();
  const a = await c.quizAttempts.findOne({ _id: attemptId, userId });
  if (!a) throw notFound("Không tìm thấy bài làm");
  // Hiển thị theo ĐÚNG phiên bản quiz lúc làm bài (C14).
  const v = await c.quizVersions.findOne({ quizId: a.quizId, version: a.quizVersion });
  const show = v?.showExplanations === "after_submit";
  const chapterIds = a.recommendations.map((r) => r.chapterId);
  const chapters = chapterIds.length ? await c.chapters.find({ _id: { $in: chapterIds } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray() : [];
  const chapterTitle = new Map(chapters.map((ch) => [ch._id.toHexString(), ch.published?.title ?? "Chương"]));
  return {
    attemptId: a._id.toHexString(),
    scorePercent: a.scorePercent,
    correctCount: a.correctCount,
    total: a.total,
    passed: a.passed,
    passPercent: v?.passPercent ?? 0,
    submittedAt: a.submittedAt.toISOString(),
    questions: (v?.questions ?? []).map((q) => {
      const ans = a.answers.find((x) => x.questionId === q.questionId);
      return {
        questionId: q.questionId,
        prompt: q.prompt,
        options: q.options,
        selectedOptionId: ans?.selectedOptionId ?? null,
        correct: ans?.correct ?? false,
        correctOptionId: show ? q.correctOptionId : null,
        explanation: show ? q.explanation : null,
      };
    }),
    topicBreakdown: a.topicBreakdown,
    recommendations: a.recommendations.map((r) => ({ chapterId: r.chapterId.toHexString(), chapterTitle: chapterTitle.get(r.chapterId.toHexString()) ?? "Chương", kind: r.kind, topicKey: r.topicKey, percent: r.percent })),
  };
}

export async function getAttemptResult(viewer: Viewer, attemptId: ObjectId) {
  return buildResult(attemptId, viewer.id);
}

/**
 * Nộp quiz: chấm server-side; cùng submissionId → trả kết quả cũ, không tạo attempt/review item trùng (C13).
 * Quiz đã đổi version → QUIZ_VERSION_CHANGED (C14).
 */
export async function submitQuiz(viewer: Viewer, quizId: ObjectId, input: { quizVersion: number; submissionId: string; answers: SubmittedAnswer[] }) {
  const c = await cols();
  const existing = await c.quizAttempts.findOne({ userId: viewer.id, submissionId: input.submissionId });
  if (existing) {
    if (!existing.quizId.equals(quizId)) throw new AppError("CONFLICT", "Mã bài nộp không hợp lệ.");
    return buildResult(existing._id, viewer.id);
  }
  const { quiz, version, lessonId } = await loadPublishedQuiz(viewer, quizId);
  if (input.quizVersion !== version.version) throw new AppError("QUIZ_VERSION_CHANGED", "Quiz vừa được cập nhật. Tải lại để làm phiên bản mới.");
  const g = gradeQuiz(version.questions, input.answers, version.passPercent);
  const placement = quiz.kind === "placement" ? placementRecommendations(g.graded, version.rules) : { topicBreakdown: [], recommendations: [] };
  const now = new Date();
  let attemptId: ObjectId;
  try {
    const ins = await c.quizAttempts.insertOne({
      userId: viewer.id,
      quizId,
      courseId: quiz.courseId,
      quizVersion: version.version,
      submissionId: input.submissionId,
      answers: g.graded.map(({ questionId, questionVersion, selectedOptionId, correct }) => ({ questionId, questionVersion, selectedOptionId, correct })),
      correctCount: g.correctCount,
      total: g.total,
      scorePercent: g.scorePercent,
      passed: g.passed,
      topicBreakdown: placement.topicBreakdown,
      recommendations: placement.recommendations,
      submittedAt: now,
    });
    attemptId = ins.insertedId;
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const dup = await c.quizAttempts.findOne({ userId: viewer.id, submissionId: input.submissionId });
    return buildResult(dup!._id, viewer.id);
  }

  // Giới hạn lịch sử: giữ 10 attempt gần nhất (C15).
  const old = await c.quizAttempts.find({ userId: viewer.id, quizId }).sort({ submittedAt: -1 }).skip(ATTEMPTS_KEPT).project<{ _id: ObjectId }>({ _id: 1 }).toArray();
  if (old.length) await c.quizAttempts.deleteMany({ _id: { $in: old.map((o) => o._id) } });

  await c.quizResults.updateOne(
    { userId: viewer.id, quizId },
    {
      $set: { latestScorePercent: g.scorePercent, lastAttemptAt: now, courseId: quiz.courseId },
      $max: { bestScorePercent: g.scorePercent },
      $inc: { attemptCount: 1 },
    },
    { upsert: true },
  );
  if (g.passed) await c.quizResults.updateOne({ userId: viewer.id, quizId, firstPassedAt: null }, { $set: { firstPassedAt: now } });

  // Câu sai → tạo/đặt lại review item (user + question + version), không trùng.
  if (quiz.kind === "lesson") {
    const user = await c.users.findOne({ _id: viewer.id }, { projection: { timezone: 1 } });
    const tz = user?.timezone ?? "Asia/Ho_Chi_Minh";
    for (const ans of g.graded.filter((x) => !x.correct)) {
      const s = initialSchedule(now, tz);
      await c.reviewItems.updateOne(
        { userId: viewer.id, questionId: ans.questionId, questionVersion: ans.questionVersion },
        {
          $set: { status: "active", intervalStep: s.intervalStep, correctStreak: 0, nextReviewAt: s.nextReviewAt, quizVersion: version.version },
          $setOnInsert: { userId: viewer.id, courseId: quiz.courseId, quizId, questionId: ans.questionId, questionVersion: ans.questionVersion, topicKey: ans.topicKey, lastReviewedAt: null, createdAt: now },
          $inc: { revision: 1 },
        },
        { upsert: true },
      );
    }
    if (g.passed && lessonId) await markComplete(viewer, lessonId, "quiz_passed").catch(() => {});
  }
  return buildResult(attemptId, viewer.id);
}
