import "server-only";
import type { Filter, ObjectId } from "mongodb";
import { AppError, notFound } from "@/lib/errors";
import { escapeRegex, formatDuration, normalizeForSearch } from "@/lib/text";
import { cols, type NoteDoc } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLearnAccess } from "@/modules/learning/access";

export const NOTE_MAX_CHARS = 5000;
export const NOTES_PER_USER = 2000;
export const NOTES_PER_LESSON = 200;
export const NOTES_PAGE_SIZE = 20;

function validTimestamp(ts: number | null, duration: number) {
  if (ts === null) return null;
  if (!Number.isFinite(ts) || ts < 0 || (duration > 0 && ts > duration + 1)) throw new AppError("VALIDATION_FAILED", "Thời điểm không hợp lệ.", { fieldErrors: { timestampSeconds: ["Thời điểm không hợp lệ."] } });
  return Math.round(ts);
}

/** Ghi chú riêng của học viên — chỉ chủ sở hữu đọc/sửa (D1). Không có API cho giảng viên/admin. */
export async function createNote(viewer: Viewer, lessonId: ObjectId, timestampSeconds: number | null, content: string) {
  const { course, lesson } = await requireLearnAccess(viewer, lessonId);
  const c = await cols();
  const [userCount, lessonCount] = await Promise.all([c.notes.countDocuments({ userId: viewer.id }), c.notes.countDocuments({ userId: viewer.id, lessonId })]);
  if (userCount >= NOTES_PER_USER) throw new AppError("LIMIT_REACHED", `Bạn đã đạt giới hạn ${NOTES_PER_USER} ghi chú.`);
  if (lessonCount >= NOTES_PER_LESSON) throw new AppError("LIMIT_REACHED", `Tối đa ${NOTES_PER_LESSON} ghi chú mỗi bài.`);
  const now = new Date();
  const doc: NoteDoc = {
    userId: viewer.id,
    courseId: course._id,
    lessonId,
    timestampSeconds: lesson.published.type === "video" ? validTimestamp(timestampSeconds, lesson.published.durationSeconds) : null,
    content,
    contentNormalized: normalizeForSearch(content),
    createdAt: now,
    updatedAt: now,
  };
  const res = await c.notes.insertOne(doc);
  return toNoteDto({ ...doc, _id: res.insertedId });
}

export async function updateNote(viewer: Viewer, noteId: ObjectId, content: string, timestampSeconds: number | null) {
  const c = await cols();
  const note = await c.notes.findOne({ _id: noteId, userId: viewer.id }); // scope theo chủ sở hữu
  if (!note) throw notFound("Không tìm thấy ghi chú");
  const lesson = await c.lessons.findOne({ _id: note.lessonId }, { projection: { "published.durationSeconds": 1, "published.type": 1 } });
  const ts = lesson?.published?.type === "video" ? validTimestamp(timestampSeconds, lesson.published.durationSeconds) : note.timestampSeconds;
  const now = new Date();
  await c.notes.updateOne({ _id: noteId, userId: viewer.id }, { $set: { content, contentNormalized: normalizeForSearch(content), timestampSeconds: ts, updatedAt: now } });
  return toNoteDto({ ...note, content, timestampSeconds: ts, updatedAt: now });
}

export async function deleteNote(viewer: Viewer, noteId: ObjectId) {
  const c = await cols();
  const res = await c.notes.deleteOne({ _id: noteId, userId: viewer.id });
  if (res.deletedCount === 0) throw notFound("Không tìm thấy ghi chú");
}

export type NoteDto = { id: string; lessonId: string; courseId: string; timestampSeconds: number | null; content: string; updatedAt: string };
const toNoteDto = (n: NoteDoc & { _id: ObjectId }): NoteDto => ({
  id: n._id.toHexString(),
  lessonId: n.lessonId.toHexString(),
  courseId: n.courseId.toHexString(),
  timestampSeconds: n.timestampSeconds,
  content: n.content,
  updatedAt: n.updatedAt.toISOString(),
});

export async function lessonNotes(viewer: Viewer, lessonId: ObjectId) {
  const c = await cols();
  const notes = await c.notes.find({ userId: viewer.id, lessonId }).sort({ timestampSeconds: 1, createdAt: 1 }).limit(NOTES_PER_LESSON).toArray();
  return notes.map(toNoteDto);
}

/** Tìm/lọc ghi chú — LUÔN lọc userId trước khi áp điều kiện khác (§11). */
export async function searchNotes(viewer: Viewer, opts: { courseId?: ObjectId | null; lessonId?: ObjectId | null; q?: string; page: number }) {
  const c = await cols();
  const filter: Filter<NoteDoc> = { userId: viewer.id };
  if (opts.courseId) filter.courseId = opts.courseId;
  if (opts.lessonId) filter.lessonId = opts.lessonId;
  const q = opts.q?.trim().slice(0, 100);
  if (q) filter.contentNormalized = { $regex: escapeRegex(normalizeForSearch(q)) };
  const [docs, total] = await Promise.all([
    c.notes.find(filter).sort({ updatedAt: -1 }).skip((opts.page - 1) * NOTES_PAGE_SIZE).limit(NOTES_PAGE_SIZE).toArray(),
    c.notes.countDocuments(filter),
  ]);
  const lessonIds = [...new Set(docs.map((d) => d.lessonId.toHexString()))];
  const lessons = await c.lessons.find({ _id: { $in: docs.map((d) => d.lessonId) } }).project<{ _id: ObjectId; courseId: ObjectId; published: { title: string } | null; draft: { title: string } | null }>({ courseId: 1, "published.title": 1, "draft.title": 1 }).toArray();
  const courses = await c.courses.find({ _id: { $in: lessons.map((l) => l.courseId) } }).project<{ _id: ObjectId; slug: string; published: { title: string } | null; status: string }>({ slug: 1, "published.title": 1, status: 1 }).toArray();
  const enrollments = await c.enrollments.find({ userId: viewer.id, courseId: { $in: courses.map((x) => x._id) } }).project<{ courseId: ObjectId; status: string }>({ courseId: 1, status: 1 }).toArray();
  const lMap = new Map(lessons.map((l) => [l._id.toHexString(), l]));
  const cMap = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const eMap = new Map(enrollments.map((e) => [e.courseId.toHexString(), e.status]));
  void lessonIds;
  return {
    total,
    items: docs.map((d) => {
      const l = lMap.get(d.lessonId.toHexString());
      const course = cMap.get(d.courseId.toHexString());
      // Bài bị gỡ / khóa bị thu hồi: vẫn xem được nội dung ghi chú, nhưng đánh dấu không học được.
      const available = Boolean(l?.published) && course?.status !== "suspended" && eMap.get(d.courseId.toHexString()) === "active";
      return { ...toNoteDto(d), lessonTitle: l?.published?.title ?? l?.draft?.title ?? "Bài học đã bị gỡ", courseTitle: course?.published?.title ?? "Khóa học", courseSlug: course?.slug ?? "", available };
    }),
  };
}

export async function myNoteCourses(viewer: Viewer) {
  const c = await cols();
  const ids = await c.notes.distinct("courseId", { userId: viewer.id });
  const courses = await c.courses.find({ _id: { $in: ids } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  return courses.map((x) => ({ id: x._id.toHexString(), title: x.published?.title ?? "Khóa học" }));
}

/** Xuất Markdown ghi chú của CHÍNH user (không dùng Cloudinary). */
export async function exportNotesMarkdown(viewer: Viewer, courseId: ObjectId | null): Promise<string> {
  const c = await cols();
  const filter: Filter<NoteDoc> = { userId: viewer.id, ...(courseId ? { courseId } : {}) };
  const notes = await c.notes.find(filter).sort({ courseId: 1, lessonId: 1, timestampSeconds: 1 }).limit(NOTES_PER_USER).toArray();
  const lessons = await c.lessons.find({ _id: { $in: notes.map((n) => n.lessonId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const courses = await c.courses.find({ _id: { $in: notes.map((n) => n.courseId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const lt = new Map(lessons.map((l) => [l._id.toHexString(), l.published?.title ?? "Bài học"]));
  const ct = new Map(courses.map((x) => [x._id.toHexString(), x.published?.title ?? "Khóa học"]));
  const lines = [`# Ghi chú của ${viewer.displayName}`, "", `_Xuất lúc ${new Date().toISOString()}_`, ""];
  let lastCourse = "";
  let lastLesson = "";
  for (const n of notes) {
    const cid = n.courseId.toHexString();
    const lid = n.lessonId.toHexString();
    if (cid !== lastCourse) {
      lines.push(`## ${ct.get(cid)}`, "");
      lastCourse = cid;
      lastLesson = "";
    }
    if (lid !== lastLesson) {
      lines.push(`### ${lt.get(lid)}`, "");
      lastLesson = lid;
    }
    lines.push(`- ${n.timestampSeconds !== null ? `**[${formatDuration(n.timestampSeconds)}]** ` : ""}${n.content.replace(/\n/g, "\n  ")}`);
  }
  return lines.join("\n") + "\n";
}
