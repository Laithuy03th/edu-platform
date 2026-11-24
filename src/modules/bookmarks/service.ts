import "server-only";
import type { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { cols } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";

export const MAX_BOOKMARKS = 500;
export type BookmarkTarget = "course" | "lesson";

/** Chỉ lưu được nội dung đang công khai: khóa published (hoặc archived), bài đã xuất bản thuộc khóa đó. */
async function resolveTarget(type: BookmarkTarget, id: ObjectId): Promise<{ courseId: ObjectId }> {
  const c = await cols();
  if (type === "course") {
    const course = await c.courses.findOne({ _id: id, status: { $in: ["published", "archived"] } }, { projection: { _id: 1 } });
    if (!course) throw notFound("Không tìm thấy khóa học");
    return { courseId: course._id };
  }
  const lesson = await c.lessons.findOne({ _id: id, published: { $ne: null } }, { projection: { courseId: 1 } });
  if (!lesson) throw notFound("Không tìm thấy bài học");
  const course = await c.courses.findOne({ _id: lesson.courseId, status: { $in: ["published", "archived"] } }, { projection: { _id: 1 } });
  if (!course) throw notFound("Không tìm thấy bài học");
  return { courseId: course._id };
}

/** Bật/tắt bookmark. Idempotent theo trạng thái mong muốn (`saved`) → bấm hai lần/hai tab không tạo trùng. */
export async function setBookmark(viewer: Viewer, type: BookmarkTarget, targetId: ObjectId, saved: boolean): Promise<{ saved: boolean }> {
  const c = await cols();
  if (!saved) {
    await c.bookmarks.deleteOne({ userId: viewer.id, targetType: type, targetId });
    return { saved: false };
  }
  const { courseId } = await resolveTarget(type, targetId);
  if ((await c.bookmarks.countDocuments({ userId: viewer.id })) >= MAX_BOOKMARKS) {
    throw new AppError("LIMIT_REACHED", `Tối đa ${MAX_BOOKMARKS} mục đã lưu. Bỏ lưu bớt rồi thử lại.`);
  }
  try {
    await c.bookmarks.insertOne({ userId: viewer.id, targetType: type, targetId, courseId, createdAt: new Date() });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
  return { saved: true };
}

export async function isBookmarked(viewer: Viewer | null, type: BookmarkTarget, targetId: ObjectId): Promise<boolean> {
  if (!viewer) return false;
  const c = await cols();
  return Boolean(await c.bookmarks.findOne({ userId: viewer.id, targetType: type, targetId }, { projection: { _id: 1 } }));
}

export type BookmarkDto = { type: BookmarkTarget; id: string; title: string; href: string; courseTitle: string; savedAt: string; available: boolean };

/** Danh sách đã lưu của CHÍNH người xem; mục bị gỡ/đình chỉ vẫn hiện (available=false) để người dùng tự bỏ. */
export async function listBookmarks(viewer: Viewer): Promise<BookmarkDto[]> {
  const c = await cols();
  const rows = await c.bookmarks.find({ userId: viewer.id }).sort({ createdAt: -1 }).limit(MAX_BOOKMARKS).toArray();
  const courseIds = [...new Set(rows.map((r) => r.courseId.toHexString()))].map((x) => rows.find((r) => r.courseId.toHexString() === x)!.courseId);
  const lessonIds = rows.filter((r) => r.targetType === "lesson").map((r) => r.targetId);
  const [courses, lessons] = await Promise.all([
    c.courses.find({ _id: { $in: courseIds } }, { projection: { slug: 1, status: 1, "published.title": 1 } }).toArray(),
    lessonIds.length ? c.lessons.find({ _id: { $in: lessonIds } }, { projection: { "published.title": 1 } }).toArray() : Promise.resolve([]),
  ]);
  const courseOf = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const lessonOf = new Map(lessons.map((x) => [x._id.toHexString(), x]));
  return rows.map((r) => {
    const course = courseOf.get(r.courseId.toHexString());
    const visible = Boolean(course && (course.status === "published" || course.status === "archived") && course.published);
    const courseTitle = course?.published?.title ?? "Khóa học không còn khả dụng";
    if (r.targetType === "course") {
      return { type: "course", id: r.targetId.toHexString(), title: courseTitle, href: course ? `/courses/${course.slug}` : "#", courseTitle, savedAt: r.createdAt.toISOString(), available: visible };
    }
    const lesson = lessonOf.get(r.targetId.toHexString());
    return {
      type: "lesson",
      id: r.targetId.toHexString(),
      title: lesson?.published?.title ?? "Bài học không còn khả dụng",
      href: course ? `/learn/${course.slug}/${r.targetId.toHexString()}` : "#",
      courseTitle,
      savedAt: r.createdAt.toISOString(),
      available: visible && Boolean(lesson?.published),
    };
  });
}
