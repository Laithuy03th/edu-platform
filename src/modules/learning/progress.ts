import "server-only";
import { ObjectId } from "mongodb";
import { AppError } from "@/lib/errors";
import { cols, type CourseDoc, type Doc, type Understanding } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLearnAccess } from "./access";

export type OutlineLesson = {
  id: ObjectId;
  chapterId: ObjectId;
  title: string;
  type: "reading" | "video";
  isRequired: boolean;
  isPreview: boolean;
  durationSeconds: number;
  quizId: ObjectId | null;
  projectAssignmentId: ObjectId | null;
};

/** Danh sách bài published theo thứ tự chương → bài, chỉ trong chương còn published. */
export async function publishedOutline(courseIds: ObjectId[]) {
  const c = await cols();
  const [chapters, lessons] = await Promise.all([
    c.chapters.find({ courseId: { $in: courseIds }, published: { $ne: null } }).sort({ "published.order": 1 }).toArray(),
    c.lessons
      .find({ courseId: { $in: courseIds }, published: { $ne: null } })
      .project<{ _id: ObjectId; courseId: ObjectId; published: { chapterId: ObjectId; order: number; title: string; type: "reading" | "video"; isRequired: boolean; isPreview: boolean; durationSeconds: number; quizId: ObjectId | null; projectAssignmentId: ObjectId | null } }>({
        courseId: 1,
        "published.chapterId": 1,
        "published.order": 1,
        "published.title": 1,
        "published.type": 1,
        "published.isRequired": 1,
        "published.isPreview": 1,
        "published.durationSeconds": 1,
        "published.quizId": 1,
        "published.projectAssignmentId": 1,
      })
      .sort({ "published.order": 1 })
      .toArray(),
  ]);
  const byCourse = new Map<string, { chapters: { id: ObjectId; title: string; lessons: OutlineLesson[] }[]; lessons: OutlineLesson[] }>();
  for (const id of courseIds) byCourse.set(id.toHexString(), { chapters: [], lessons: [] });
  for (const ch of chapters) {
    const entry = byCourse.get(ch.courseId.toHexString());
    if (!entry) continue;
    const ls = lessons
      .filter((l) => l.published.chapterId.equals(ch._id))
      .map<OutlineLesson>((l) => ({
        id: l._id,
        chapterId: ch._id,
        title: l.published.title,
        type: l.published.type,
        isRequired: l.published.isRequired,
        isPreview: l.published.isPreview,
        durationSeconds: l.published.durationSeconds,
        quizId: l.published.quizId,
        projectAssignmentId: l.published.projectAssignmentId,
      }));
    entry.chapters.push({ id: ch._id, title: ch.published!.title, lessons: ls });
    entry.lessons.push(...ls);
  }
  return byCourse;
}

/**
 * Công thức tiến độ (ADR-007): mẫu số = bài BẮT BUỘC trong bản published hiện hành;
 * bài optional và bài đã gỡ không tính. Tử số = bài bắt buộc hiện hành đã hoàn thành.
 */
export function computeProgress(lessons: Pick<OutlineLesson, "id" | "isRequired">[], completedIds: Set<string>) {
  const required = lessons.filter((l) => l.isRequired);
  const completed = required.filter((l) => completedIds.has(l.id.toHexString())).length;
  const total = required.length;
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export async function completedSet(userId: ObjectId, courseIds: ObjectId[]) {
  const c = await cols();
  const done = await c.lessonProgress
    .find({ userId, courseId: { $in: courseIds }, completedAt: { $ne: null } })
    .project<{ lessonId: ObjectId }>({ lessonId: 1 })
    .toArray();
  return new Set(done.map((d) => d.lessonId.toHexString()));
}

export async function courseProgressMany(userId: ObjectId, courses: Doc<CourseDoc>[]) {
  const ids = courses.map((x) => x._id);
  const [outlines, done] = await Promise.all([publishedOutline(ids), completedSet(userId, ids)]);
  const out = new Map<string, { completed: number; total: number; percent: number; nextLessonId: string | null }>();
  for (const course of courses) {
    const o = outlines.get(course._id.toHexString());
    if (!o) continue;
    const p = computeProgress(o.lessons, done);
    const next = o.lessons.find((l) => !done.has(l.id.toHexString()));
    out.set(course._id.toHexString(), { ...p, nextLessonId: (next ?? o.lessons[0])?.id.toHexString() ?? null });
  }
  return out;
}

/** Đánh dấu hoàn thành khóa khi đủ bài bắt buộc; không bao giờ gỡ completedAt cũ. */
async function maybeCompleteCourse(userId: ObjectId, courseId: ObjectId) {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId }, { projection: { publishedVersion: 1 } });
  if (!course) return;
  const outline = (await publishedOutline([courseId])).get(courseId.toHexString());
  if (!outline) return;
  const p = computeProgress(outline.lessons, await completedSet(userId, [courseId]));
  if (p.total > 0 && p.completed === p.total) {
    await c.enrollments.updateOne(
      { userId, courseId, status: "active", completedAt: null },
      { $set: { completedAt: new Date(), completedVersion: course.publishedVersion } },
    );
  }
}

const MAX_CLIENT_SKEW_MS = 60_000;
const MAX_CLIENT_AGE_MS = 3600_000;

/**
 * Lưu vị trí xem (§9.2): bỏ qua event cũ hơn event đã lưu (nhiều tab / beacon đến muộn),
 * furthest chỉ tăng ($max), completedAt không bị ảnh hưởng. Duration lấy từ server.
 */
export async function saveProgress(viewer: Viewer, lessonId: ObjectId, positionSeconds: number, clientAtMs: number) {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) throw new AppError("VALIDATION_FAILED", "Vị trí không hợp lệ.");
  const { course, lesson, enrollment } = await requireLearnAccess(viewer, lessonId);
  const duration = lesson.published.durationSeconds;
  if (duration > 0 && positionSeconds > duration + 2) throw new AppError("VALIDATION_FAILED", "Vị trí vượt quá thời lượng bài.");
  const now = Date.now();
  const clientAt = new Date(Math.min(Math.max(clientAtMs, now - MAX_CLIENT_AGE_MS), now + MAX_CLIENT_SKEW_MS));
  const pos = Math.round(positionSeconds * 10) / 10;
  const c = await cols();
  await ensureProgressDoc(viewer.id, course._id, lessonId);
  const res = await c.lessonProgress.updateOne(
    { userId: viewer.id, lessonId, lastPositionClientAt: { $lt: clientAt } },
    { $set: { lastPositionSeconds: pos, lastPositionClientAt: clientAt, lastSavedAt: new Date() }, $max: { furthestPositionSeconds: pos } },
  );
  if (res.matchedCount === 0) {
    // Event cũ: vẫn cập nhật furthest (không làm giảm), không ghi đè vị trí mới hơn.
    await c.lessonProgress.updateOne({ userId: viewer.id, lessonId }, { $max: { furthestPositionSeconds: pos } });
  }
  if (enrollment) await c.enrollments.updateOne({ _id: enrollment._id }, { $set: { lastLessonId: lessonId, lastAccessedAt: new Date() } });
  return { saved: res.matchedCount === 1 };
}

async function ensureProgressDoc(userId: ObjectId, courseId: ObjectId, lessonId: ObjectId) {
  const c = await cols();
  await c.lessonProgress
    .updateOne(
      { userId, lessonId },
      {
        $setOnInsert: {
          userId,
          courseId,
          lessonId,
          lastPositionSeconds: 0,
          lastPositionClientAt: new Date(0),
          furthestPositionSeconds: 0,
          completedAt: null,
          completionSource: null,
          understanding: null,
          understandingUpdatedAt: null,
          lastSavedAt: new Date(),
        },
      },
      { upsert: true },
    )
    .catch((err) => {
      if (err?.code !== 11000) throw err;
    });
}

export const VIDEO_COMPLETE_RATIO = 0.9;

/**
 * Đánh dấu hoàn thành (theo dõi học tập, KHÔNG phải bằng chứng chống gian lận).
 * - reading: thủ công. - video: cần furthest ≥ 90% thời lượng. - quiz_passed: gọi nội bộ từ quiz service.
 */
export async function markComplete(viewer: Viewer, lessonId: ObjectId, source: "manual" | "video_threshold" | "quiz_passed" = "manual") {
  const { course, lesson } = await requireLearnAccess(viewer, lessonId);
  const c = await cols();
  await ensureProgressDoc(viewer.id, course._id, lessonId);
  if (lesson.published.type === "video" && source !== "quiz_passed") {
    const p = await c.lessonProgress.findOne({ userId: viewer.id, lessonId });
    const duration = lesson.published.durationSeconds;
    if (duration > 0 && (p?.furthestPositionSeconds ?? 0) < duration * VIDEO_COMPLETE_RATIO) {
      throw new AppError("VALIDATION_FAILED", "Hãy xem tới khoảng 90% video trước khi đánh dấu hoàn thành.");
    }
    source = "video_threshold";
  }
  await c.lessonProgress.updateOne({ userId: viewer.id, lessonId, completedAt: null }, { $set: { completedAt: new Date(), completionSource: source } });
  await maybeCompleteCourse(viewer.id, course._id);
  return { courseSlug: course.slug };
}

/** Tự đánh giá mức độ hiểu — tách khỏi completedAt (§12.2). */
export async function setUnderstanding(viewer: Viewer, lessonId: ObjectId, level: Understanding | null) {
  const { course } = await requireLearnAccess(viewer, lessonId);
  const c = await cols();
  await ensureProgressDoc(viewer.id, course._id, lessonId);
  await c.lessonProgress.updateOne({ userId: viewer.id, lessonId }, { $set: { understanding: level, understandingUpdatedAt: new Date() } });
}

export async function needsReviewLessons(userId: ObjectId, limit = 20) {
  const c = await cols();
  const items = await c.lessonProgress
    .find({ userId, understanding: { $in: ["needs_review", "not_understood"] } })
    .sort({ understandingUpdatedAt: -1 })
    .limit(limit)
    .toArray();
  if (!items.length) return [];
  const lessons = await c.lessons.find({ _id: { $in: items.map((i) => i.lessonId) } }).project<{ _id: ObjectId; courseId: ObjectId; published: { title: string } | null }>({ courseId: 1, "published.title": 1 }).toArray();
  const courses = await c.courses.find({ _id: { $in: lessons.map((l) => l.courseId) } }).project<{ _id: ObjectId; slug: string }>({ slug: 1 }).toArray();
  const lMap = new Map(lessons.map((l) => [l._id.toHexString(), l]));
  const cMap = new Map(courses.map((x) => [x._id.toHexString(), x.slug]));
  return items
    .map((i) => {
      const l = lMap.get(i.lessonId.toHexString());
      if (!l?.published) return null;
      return { lessonId: i.lessonId.toHexString(), title: l.published.title, courseSlug: cMap.get(l.courseId.toHexString()) ?? "", understanding: i.understanding! };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
