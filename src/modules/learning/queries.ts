import "server-only";
import type { ObjectId } from "mongodb";
import { notFound } from "@/lib/errors";
import { cols } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccess } from "./access";
import { completedSet, computeProgress, publishedOutline } from "./progress";
import { mediaSummary } from "@/modules/media/delivery";

export async function courseProgressFor(userId: ObjectId, courseId: ObjectId) {
  const [outlines, done] = await Promise.all([publishedOutline([courseId]), completedSet(userId, [courseId])]);
  const o = outlines.get(courseId.toHexString());
  const lessons = o?.lessons ?? [];
  const p = computeProgress(lessons, done);
  const next = lessons.find((l) => !done.has(l.id.toHexString())) ?? lessons[0];
  return { ...p, nextLessonId: next?.id.toHexString() ?? null };
}

/** Dữ liệu trang học. Ném lỗi FORBIDDEN/UNAUTHENTICATED nếu không có quyền đọc bài. */
export async function getLearnPageData(viewer: Viewer | null, slug: string, lessonId: ObjectId) {
  const { course, lesson, enrollment } = await requireLessonAccess(viewer, lessonId);
  if (course.slug !== slug) throw notFound("Không tìm thấy bài học");
  const c = await cols();
  const outline = (await publishedOutline([course._id])).get(course._id.toHexString())!;
  const done = viewer ? await completedSet(viewer.id, [course._id]) : new Set<string>();
  const idx = outline.lessons.findIndex((l) => l.id.equals(lessonId));
  const prev = idx > 0 ? outline.lessons[idx - 1] : null;
  const next = idx >= 0 && idx < outline.lessons.length - 1 ? outline.lessons[idx + 1] : null;
  const progress = viewer ? await c.lessonProgress.findOne({ userId: viewer.id, lessonId }) : null;
  const p = lesson.published;
  const isEnrolled = enrollment?.status === "active";

  let quiz: { id: string; title: string; questionCount: number; best: number | null; latest: number | null; passPercent: number } | null = null;
  if (p.quizId) {
    const q = await c.quizzes.findOne({ _id: p.quizId });
    const v = q?.publishedVersion ? await c.quizVersions.findOne({ quizId: q._id, version: q.publishedVersion }, { projection: { title: 1, questions: 1, passPercent: 1 } }) : null;
    const r = viewer && v ? await c.quizResults.findOne({ userId: viewer.id, quizId: p.quizId }) : null;
    if (v) quiz = { id: p.quizId.toHexString(), title: v.title, questionCount: v.questions.length, best: r?.bestScorePercent ?? null, latest: r?.latestScorePercent ?? null, passPercent: v.passPercent };
  }
  let assignment: { id: string; title: string } | null = null;
  if (p.projectAssignmentId) {
    const a = await c.projectAssignments.findOne({ _id: p.projectAssignmentId, published: { $ne: null } }, { projection: { "published.title": 1 } });
    if (a?.published) assignment = { id: a._id.toHexString(), title: a.published.title };
  }

  return {
    course: { id: course._id.toHexString(), slug: course.slug, title: course.published?.title ?? course.draft.title, status: course.status },
    isEnrolled,
    isPreviewOnly: !isEnrolled && p.isPreview,
    lesson: {
      id: lessonId.toHexString(),
      title: p.title,
      type: p.type,
      content: p.content,
      objectives: p.objectives,
      transcript: p.transcript,
      durationSeconds: p.durationSeconds,
      isPreview: p.isPreview,
      isRequired: p.isRequired,
    },
    media: p.type === "video" && p.mediaId ? await mediaSummary(p.mediaId) : null,
    quiz,
    assignment,
    progress: progress
      ? {
          lastPositionSeconds: progress.lastPositionSeconds,
          furthestPositionSeconds: progress.furthestPositionSeconds,
          completedAt: progress.completedAt?.toISOString() ?? null,
          understanding: progress.understanding,
        }
      : null,
    outline: outline.chapters.map((ch) => ({
      id: ch.id.toHexString(),
      title: ch.title,
      lessons: ch.lessons.map((l) => ({
        id: l.id.toHexString(),
        title: l.title,
        type: l.type,
        isPreview: l.isPreview,
        isRequired: l.isRequired,
        completed: done.has(l.id.toHexString()),
        current: l.id.equals(lessonId),
        locked: !isEnrolled && !l.isPreview && !(viewer && (viewer.roles.includes("admin") || course.instructorId.equals(viewer.id))),
      })),
    })),
    courseProgress: computeProgress(outline.lessons, done),
    prevId: prev?.id.toHexString() ?? null,
    nextId: next?.id.toHexString() ?? null,
  };
}
export type LearnPageData = Awaited<ReturnType<typeof getLearnPageData>>;

/** Số bài hoàn thành từ thứ Hai tuần này (giờ địa phương) — cho "mục tiêu tuần". */
export async function weeklyCompleted(userId: ObjectId, tz: string) {
  const { startOfLocalDayPlus, localDateParts } = await import("@/lib/time");
  const now = new Date();
  const { y, m, d } = localDateParts(now, tz);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = CN
  const sinceMonday = (dow + 6) % 7;
  const start = startOfLocalDayPlus(now, -sinceMonday, tz);
  const c = await cols();
  return c.lessonProgress.countDocuments({ userId, completedAt: { $gte: start } });
}
