import "server-only";
import type { Filter, ObjectId } from "mongodb";
import { AppError, notFound } from "@/lib/errors";
import { cols, type ReviewItemDoc } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { canReadLesson, toPolicyCourse } from "@/modules/courses/policy";
import { endOfTodayLocal, nextSchedule } from "./schedule";

async function currentQuestion(quizId: ObjectId, questionId: string) {
  const c = await cols();
  const quiz = await c.quizzes.findOne({ _id: quizId }, { projection: { publishedVersion: 1 } });
  if (!quiz?.publishedVersion) return null;
  const v = await c.quizVersions.findOne({ quizId, version: quiz.publishedVersion });
  return v?.questions.find((q) => q.questionId === questionId) ?? null;
}

async function assertCourseAccess(viewer: Viewer, courseId: ObjectId) {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  if (!course) throw notFound();
  const enrollment = await c.enrollments.findOne({ userId: viewer.id, courseId });
  const ok = canReadLesson(viewer, toPolicyCourse(course), { isPreview: false }, enrollment);
  if (!ok.ok) throw new AppError("FORBIDDEN", "Bạn không còn quyền truy cập khóa học của câu hỏi này.");
}

/** Danh sách cần ôn hôm nay (theo timezone người dùng). Câu đã đổi/gỡ được đánh dấu stale, không chấm tiếp. */
export async function dueReviews(viewer: Viewer, opts: { courseId?: ObjectId; topicKey?: string; limit?: number }) {
  const c = await cols();
  const now = new Date();
  const filter: Filter<ReviewItemDoc> = { userId: viewer.id, status: "active", nextReviewAt: { $lt: endOfTodayLocal(now, viewer.timezone) } };
  if (opts.courseId) filter.courseId = opts.courseId;
  if (opts.topicKey) filter.topicKey = opts.topicKey;
  const items = await c.reviewItems.find(filter).sort({ nextReviewAt: 1 }).limit(opts.limit ?? 20).toArray();
  const out = [];
  for (const it of items) {
    const q = await currentQuestion(it.quizId, it.questionId);
    if (!q || q.version !== it.questionVersion) {
      await c.reviewItems.updateOne({ _id: it._id, revision: it.revision }, { $set: { status: "stale" }, $inc: { revision: 1 } });
      continue;
    }
    out.push({
      id: it._id.toHexString(),
      revision: it.revision,
      courseId: it.courseId.toHexString(),
      topicKey: it.topicKey,
      intervalStep: it.intervalStep,
      prompt: q.prompt,
      options: q.options.map((o) => ({ optionId: o.optionId, text: o.text })), // không kèm đáp án
    });
  }
  return out;
}

export async function reviewCounts(viewer: Viewer) {
  const c = await cols();
  const now = new Date();
  const [due, active, mastered, byCourse] = await Promise.all([
    c.reviewItems.countDocuments({ userId: viewer.id, status: "active", nextReviewAt: { $lt: endOfTodayLocal(now, viewer.timezone) } }),
    c.reviewItems.countDocuments({ userId: viewer.id, status: "active" }),
    c.reviewItems.countDocuments({ userId: viewer.id, status: "mastered" }),
    c.reviewItems
      .aggregate<{ _id: ObjectId; n: number }>([{ $match: { userId: viewer.id, status: "active", nextReviewAt: { $lt: endOfTodayLocal(now, viewer.timezone) } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const courses = byCourse.length ? await c.courses.find({ _id: { $in: byCourse.map((b) => b._id) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray() : [];
  const title = new Map(courses.map((x) => [x._id.toHexString(), x.published?.title ?? "Khóa học"]));
  const topics = await c.reviewItems.distinct("topicKey", { userId: viewer.id, status: "active" });
  return { due, active, mastered, byCourse: byCourse.map((b) => ({ courseId: b._id.toHexString(), title: title.get(b._id.toHexString()) ?? "Khóa học", n: b.n })), topics: topics.filter((t): t is string => Boolean(t)) };
}

/** Trả lời câu ôn: server chấm + cập nhật lịch; revision chống double submit. */
export async function answerReview(viewer: Viewer, itemId: ObjectId, revision: number, optionId: string) {
  const c = await cols();
  const it = await c.reviewItems.findOne({ _id: itemId, userId: viewer.id });
  if (!it) throw notFound("Không tìm thấy câu ôn tập");
  if (it.revision !== revision) throw new AppError("STALE_REVISION", "Câu này vừa được trả lời ở nơi khác.");
  if (it.status !== "active") throw new AppError("INVALID_STATE", "Câu này không còn trong danh sách ôn.");
  await assertCourseAccess(viewer, it.courseId);
  const q = await currentQuestion(it.quizId, it.questionId);
  if (!q || q.version !== it.questionVersion) {
    await c.reviewItems.updateOne({ _id: itemId, revision }, { $set: { status: "stale" }, $inc: { revision: 1 } });
    throw new AppError("QUESTION_CHANGED", "Câu hỏi đã được giảng viên thay đổi hoặc gỡ nên không chấm tiếp.");
  }
  const correct = optionId === q.correctOptionId;
  const now = new Date();
  const next = nextSchedule({ intervalStep: it.intervalStep, correctStreak: it.correctStreak }, correct, now, viewer.timezone);
  const upd = await c.reviewItems.updateOne(
    { _id: itemId, revision },
    { $set: { ...next, lastReviewedAt: now }, $inc: { revision: 1 } },
  );
  if (upd.modifiedCount !== 1) throw new AppError("STALE_REVISION", "Câu này vừa được trả lời ở nơi khác.");
  return { correct, correctOptionId: q.correctOptionId, explanation: q.explanation, nextReviewAt: next.nextReviewAt.toISOString(), mastered: next.status === "mastered" };
}
