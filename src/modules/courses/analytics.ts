import "server-only";
import { ObjectId } from "mongodb";
import { unstable_cache } from "next/cache";
import type { Viewer } from "@/server/auth/viewer-core";
import { cols } from "@/server/db/models";
import { loadEditableCourse } from "./authoring";

/**
 * Phân tích khóa học cho giảng viên/admin — CHỈ số liệu tổng hợp (đặc tả §8.3: không hiển thị dữ liệu cá nhân
 * không cần thiết). Nhóm có ít hơn MIN_GROUP học viên thì ẩn điểm/tỉ lệ để không suy ra được kết quả của một người.
 * Kết quả cache 10 phút theo khóa (aggregate trên Atlas Free không chạy lại mỗi lần tải trang).
 */
export const MIN_GROUP = 3;

export type CourseAnalytics = {
  generatedAt: string;
  enrolled: number;
  revoked: number;
  started: number;
  halfway: number;
  completed: number;
  active7d: number;
  active30d: number;
  requiredLessons: number;
  lessons: { id: string; chapter: string; title: string; type: "reading" | "video"; isRequired: boolean; completed: number }[];
  quizzes: { id: string; title: string; learners: number; attempts: number; avgBest: number | null; passRate: number | null }[];
  hardestQuestions: { quizTitle: string; prompt: string; answered: number; correctRate: number }[];
  ratings: { star: number; count: number }[];
  openIssues: number;
  unansweredQuestions: number;
};

async function analyticsUncached(courseIdHex: string): Promise<CourseAnalytics> {
  const c = await cols();
  const courseId = new ObjectId(courseIdHex);
  const now = Date.now();
  const [chapters, lessons, enrollAgg, recent7, recent30, lessonDone, perUserRequired, quizResults, quizzes, ratings, openIssues, unanswered] = await Promise.all([
    c.chapters.find({ courseId, published: { $ne: null } }, { projection: { "published.title": 1, "published.order": 1 } }).toArray(),
    c.lessons.find({ courseId, published: { $ne: null } }, { projection: { "published.title": 1, "published.order": 1, "published.chapterId": 1, "published.type": 1, "published.isRequired": 1, "published.quizId": 1 } }).toArray(),
    c.enrollments.aggregate<{ _id: string; n: number; done: number }>([{ $match: { courseId } }, { $group: { _id: "$status", n: { $sum: 1 }, done: { $sum: { $cond: [{ $ne: ["$completedAt", null] }, 1, 0] } } } }]).toArray(),
    c.enrollments.countDocuments({ courseId, status: "active", lastAccessedAt: { $gte: new Date(now - 7 * 86400_000) } }),
    c.enrollments.countDocuments({ courseId, status: "active", lastAccessedAt: { $gte: new Date(now - 30 * 86400_000) } }),
    c.lessonProgress.aggregate<{ _id: ObjectId; n: number }>([{ $match: { courseId, completedAt: { $ne: null } } }, { $group: { _id: "$lessonId", n: { $sum: 1 } } }]).toArray(),
    c.lessonProgress
      .aggregate<{ _id: ObjectId; required: number; any: number }>([
        { $match: { courseId, completedAt: { $ne: null } } },
        { $lookup: { from: "lessons", localField: "lessonId", foreignField: "_id", as: "l", pipeline: [{ $project: { req: "$published.isRequired" } }] } },
        { $group: { _id: "$userId", any: { $sum: 1 }, required: { $sum: { $cond: [{ $eq: [{ $first: "$l.req" }, true] }, 1, 0] } } } },
      ])
      .toArray(),
    c.quizResults.aggregate<{ _id: ObjectId; learners: number; attempts: number; avgBest: number; passed: number }>([{ $match: { courseId } }, { $group: { _id: "$quizId", learners: { $sum: 1 }, attempts: { $sum: "$attemptCount" }, avgBest: { $avg: "$bestScorePercent" }, passed: { $sum: { $cond: [{ $ne: ["$firstPassedAt", null] }, 1, 0] } } } }]).toArray(),
    c.quizzes.find({ courseId, kind: "lesson" }, { projection: { "draft.title": 1, "draft.questions.questionId": 1, "draft.questions.prompt": 1 } }).toArray(),
    c.courseReviews.aggregate<{ _id: number; n: number }>([{ $match: { courseId, status: "visible" } }, { $group: { _id: "$rating", n: { $sum: 1 } } }]).toArray(),
    c.contentIssues.countDocuments({ courseId, status: "open" }),
    c.questions.countDocuments({ courseId, status: "visible", hasInstructorAnswer: false }),
  ]);

  const required = lessons.filter((l) => l.published!.isRequired).length;
  const chapterOrder = new Map(chapters.map((ch) => [ch._id.toHexString(), ch.published!]));
  const done = new Map(lessonDone.map((x) => [x._id.toHexString(), x.n]));
  const sortedLessons = lessons
    .filter((l) => chapterOrder.has(l.published!.chapterId.toHexString()))
    .sort((a, b) => chapterOrder.get(a.published!.chapterId.toHexString())!.order - chapterOrder.get(b.published!.chapterId.toHexString())!.order || a.published!.order - b.published!.order);
  const active = enrollAgg.find((x) => x._id === "active");

  // Tỉ lệ đúng từng câu — chỉ câu có >= MIN_GROUP người trả lời; tính trên lần làm gần nhất của mỗi người
  const quizIds = quizzes.map((q) => q._id);
  const perQuestion = quizIds.length
    ? await c.quizAttempts
        .aggregate<{ _id: { quizId: ObjectId; questionId: string }; answered: number; correct: number }>([
          { $match: { courseId, quizId: { $in: quizIds } } },
          { $sort: { submittedAt: -1 } },
          { $group: { _id: { userId: "$userId", quizId: "$quizId" }, answers: { $first: "$answers" } } },
          { $unwind: "$answers" },
          { $group: { _id: { quizId: "$_id.quizId", questionId: "$answers.questionId" }, answered: { $sum: 1 }, correct: { $sum: { $cond: ["$answers.correct", 1, 0] } } } },
          { $match: { answered: { $gte: MIN_GROUP } } },
        ])
        .toArray()
    : [];
  const quizTitle = new Map(quizzes.map((q) => [q._id.toHexString(), q.draft.title]));
  const prompt = (quizId: ObjectId, questionId: string) => quizzes.find((q) => q._id.equals(quizId))?.draft.questions.find((x) => x.questionId === questionId)?.prompt ?? "(câu hỏi đã xóa)";

  return {
    generatedAt: new Date(now).toISOString(),
    enrolled: active?.n ?? 0,
    revoked: enrollAgg.find((x) => x._id === "revoked")?.n ?? 0,
    started: perUserRequired.filter((u) => u.any > 0).length,
    halfway: required ? perUserRequired.filter((u) => u.required >= Math.ceil(required / 2)).length : 0,
    completed: active?.done ?? 0,
    active7d: recent7,
    active30d: recent30,
    requiredLessons: required,
    lessons: sortedLessons.map((l) => ({
      id: l._id.toHexString(),
      chapter: chapterOrder.get(l.published!.chapterId.toHexString())!.title,
      title: l.published!.title,
      type: l.published!.type,
      isRequired: l.published!.isRequired,
      completed: done.get(l._id.toHexString()) ?? 0,
    })),
    quizzes: quizzes.map((q) => {
      const r = quizResults.find((x) => x._id.equals(q._id));
      const enough = (r?.learners ?? 0) >= MIN_GROUP;
      return { id: q._id.toHexString(), title: q.draft.title, learners: r?.learners ?? 0, attempts: r?.attempts ?? 0, avgBest: enough ? Math.round(r!.avgBest) : null, passRate: enough ? Math.round((r!.passed / r!.learners) * 100) : null };
    }),
    hardestQuestions: perQuestion
      .map((x) => ({ quizTitle: quizTitle.get(x._id.quizId.toHexString()) ?? "", prompt: prompt(x._id.quizId, x._id.questionId), answered: x.answered, correctRate: Math.round((x.correct / x.answered) * 100) }))
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 5),
    ratings: [5, 4, 3, 2, 1].map((star) => ({ star, count: ratings.find((r) => r._id === star)?.n ?? 0 })),
    openIssues,
    unansweredQuestions: unanswered,
  };
}

const cached = (id: string) => unstable_cache(() => analyticsUncached(id), ["course-analytics-v1", id], { revalidate: 600 })();

/** Kiểm tra quyền (chủ khóa hoặc admin) TRƯỚC khi đọc cache — cache chỉ chứa số liệu tổng hợp theo khóa. */
export async function getCourseAnalytics(viewer: Viewer, courseId: ObjectId) {
  const course = await loadEditableCourse(viewer, courseId);
  return { title: course.draft.title, slug: course.slug, status: course.status, data: await cached(courseId.toHexString()) };
}

export const __uncached = { analytics: analyticsUncached };
