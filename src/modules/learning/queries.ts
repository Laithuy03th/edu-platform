import "server-only";
import { versionCache } from "@/lib/version-cache";
import type { ObjectId } from "mongodb";
import { notFound } from "@/lib/errors";
import { cols } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccessMemo } from "./access";
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

// Dữ liệu chỉ đổi khi khóa được duyệt lại (publishedVersion tăng) → cache theo phiên bản, không bao giờ cũ.
const outlineCache = versionCache<Awaited<ReturnType<typeof publishedOutline>>>(300);
const quizMetaCache = versionCache<{ title: string; questionCount: number; passPercent: number } | null>(1000);
const assignmentTitleCache = versionCache<string | null>(1000);

/** Dữ liệu trang học. Ném lỗi FORBIDDEN/UNAUTHENTICATED nếu không có quyền đọc bài. */
export async function getLearnPageData(viewer: Viewer | null, slug: string, lessonId: ObjectId) {
  const { course, lesson, enrollment } = await requireLessonAccessMemo(viewer, lessonId);
  if (course.slug !== slug) throw notFound("Không tìm thấy bài học");
  const c = await cols();
  const ver = `${course._id.toHexString()}:${course.publishedVersion}`;
  const outline = (await outlineCache(ver, () => publishedOutline([course._id]))).get(course._id.toHexString())!;
  const done = viewer ? await completedSet(viewer.id, [course._id]) : new Set<string>();
  const idx = outline.lessons.findIndex((l) => l.id.equals(lessonId));
  const prev = idx > 0 ? outline.lessons[idx - 1] : null;
  const next = idx >= 0 && idx < outline.lessons.length - 1 ? outline.lessons[idx + 1] : null;
  const progress = viewer ? await c.lessonProgress.findOne({ userId: viewer.id, lessonId }) : null;
  const p = lesson.published;
  const isEnrolled = enrollment?.status === "active";

  let quiz: { id: string; title: string; questionCount: number; best: number | null; latest: number | null; passPercent: number } | null = null;
  if (p.quizId) {
    const quizId = p.quizId;
    const v = await quizMetaCache(`${ver}:${quizId.toHexString()}`, async () => {
      const q = await c.quizzes.findOne({ _id: quizId }, { projection: { publishedVersion: 1 } });
      const qv = q?.publishedVersion ? await c.quizVersions.findOne({ quizId, version: q.publishedVersion }, { projection: { title: 1, questions: 1, passPercent: 1 } }) : null;
      return qv ? { title: qv.title, questionCount: qv.questions.length, passPercent: qv.passPercent } : null;
    });
    const r = viewer && v ? await c.quizResults.findOne({ userId: viewer.id, quizId }) : null;
    if (v) quiz = { id: quizId.toHexString(), title: v.title, questionCount: v.questionCount, best: r?.bestScorePercent ?? null, latest: r?.latestScorePercent ?? null, passPercent: v.passPercent };
  }
  let assignment: { id: string; title: string } | null = null;
  if (p.projectAssignmentId) {
    const aid = p.projectAssignmentId;
    const title = await assignmentTitleCache(`${ver}:${aid.toHexString()}`, async () => (await c.projectAssignments.findOne({ _id: aid, published: { $ne: null } }, { projection: { "published.title": 1 } }))?.published?.title ?? null);
    if (title) assignment = { id: aid.toHexString(), title };
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
