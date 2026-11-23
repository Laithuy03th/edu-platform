import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { slugify } from "@/lib/text";
import { cols, type Doc, type LearningPathDoc, type PathItem } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { completedSet, publishedOutline } from "@/modules/learning/progress";
import { findCycle, pathProgress } from "./graph";

export const PATHS_TAG = "paths";
export const MAX_ITEMS = 50;

type ResolvedItem = {
  itemId: string;
  kind: PathItem["kind"];
  title: string;
  required: boolean;
  available: boolean;
  href: string | null;
  durationSeconds: number;
  lessonIds: string[];
  dependsOn: string[];
  note: string | null;
};

/** Mở rộng các mục thành tập bài published; mục bị gỡ/chưa xuất bản → available=false (không làm hỏng trang). */
async function resolveItems(path: Doc<LearningPathDoc>): Promise<ResolvedItem[]> {
  const c = await cols();
  const courseIds = new Set<string>();
  const chapterIds = path.items.filter((i) => i.kind === "chapter" && i.refId).map((i) => i.refId!);
  const lessonIds = path.items.filter((i) => i.kind === "lesson" && i.refId).map((i) => i.refId!);
  for (const i of path.items) if (i.kind === "course" && i.refId) courseIds.add(i.refId.toHexString());
  const [chapters, lessons] = await Promise.all([
    c.chapters.find({ _id: { $in: chapterIds } }).project<{ _id: ObjectId; courseId: ObjectId }>({ courseId: 1 }).toArray(),
    c.lessons.find({ _id: { $in: lessonIds } }).project<{ _id: ObjectId; courseId: ObjectId }>({ courseId: 1 }).toArray(),
  ]);
  for (const x of [...chapters, ...lessons]) courseIds.add(x.courseId.toHexString());
  const ids = [...courseIds].map((s) => new ObjectId(s));
  const [courses, outlines] = await Promise.all([c.courses.find({ _id: { $in: ids } }).toArray(), publishedOutline(ids)]);
  const courseMap = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const chapterCourse = new Map(chapters.map((x) => [x._id.toHexString(), x.courseId.toHexString()]));
  const lessonCourse = new Map(lessons.map((x) => [x._id.toHexString(), x.courseId.toHexString()]));

  return [...path.items]
    .sort((a, b) => a.order - b.order)
    .map((it) => {
      const base = { itemId: it.itemId, kind: it.kind, required: it.required, dependsOn: it.dependsOn };
      if (it.kind === "milestone") return { ...base, title: it.title ?? "Cột mốc", available: true, href: null, durationSeconds: 0, lessonIds: [], note: null };
      const refHex = it.refId?.toHexString() ?? "";
      const courseHex = it.kind === "course" ? refHex : it.kind === "chapter" ? chapterCourse.get(refHex) : lessonCourse.get(refHex);
      const course = courseHex ? courseMap.get(courseHex) : undefined;
      const outline = courseHex ? outlines.get(courseHex) : undefined;
      const coursePublic = course && course.published && course.status === "published";
      if (!course || !coursePublic || !outline) {
        return { ...base, title: it.title ?? "Nội dung không còn khả dụng", available: false, href: null, durationSeconds: 0, lessonIds: [], note: "Nội dung đã bị gỡ hoặc chưa xuất bản" };
      }
      let ls = outline.lessons;
      let title = course.published!.title;
      let href = `/courses/${course.slug}`;
      if (it.kind === "chapter") {
        const ch = outline.chapters.find((x) => x.id.toHexString() === refHex);
        if (!ch) return { ...base, title: it.title ?? "Chương không còn khả dụng", available: false, href, durationSeconds: 0, lessonIds: [], note: "Chương đã bị gỡ" };
        ls = ch.lessons;
        title = `${course.published!.title} › ${ch.title}`;
      } else if (it.kind === "lesson") {
        const l = outline.lessons.find((x) => x.id.toHexString() === refHex);
        if (!l) return { ...base, title: it.title ?? "Bài không còn khả dụng", available: false, href, durationSeconds: 0, lessonIds: [], note: "Bài đã bị gỡ" };
        ls = [l];
        title = `${course.published!.title} › ${l.title}`;
        href = `/learn/${course.slug}/${l.id.toHexString()}`;
      }
      const counted = it.kind === "lesson" ? ls : ls.filter((l) => l.isRequired);
      // Thời gian ước tính dựa trên dữ liệu khóa học, không nhập tay.
      return { ...base, title: it.title || title, available: true, href, durationSeconds: counted.reduce((s, l) => s + l.durationSeconds, 0), lessonIds: counted.map((l) => l.id.toHexString()), note: null };
    });
}

export type PathCardDto = { id: string; slug: string; title: string; goal: string; audience: string; itemCount: number };

export const listFeaturedPaths = unstable_cache(
  async (): Promise<PathCardDto[]> => {
    const c = await cols();
    const docs = await c.learningPaths.find({ status: "published" }).sort({ featured: -1, updatedAt: -1 }).limit(3).toArray();
    return docs.map((p) => ({ id: p._id.toHexString(), slug: p.slug, title: p.title, goal: p.goal, audience: p.audience, itemCount: p.items.length }));
  },
  ["paths-featured-v1"],
  { tags: [PATHS_TAG], revalidate: 3600 },
);

export async function listPublishedPaths(): Promise<PathCardDto[]> {
  const c = await cols();
  const docs = await c.learningPaths.find({ status: "published" }).sort({ featured: -1, updatedAt: -1 }).limit(100).toArray();
  return docs.map((p) => ({ id: p._id.toHexString(), slug: p.slug, title: p.title, goal: p.goal, audience: p.audience, itemCount: p.items.length }));
}

export async function getPathDetail(slug: string, viewer: Viewer | null) {
  const c = await cols();
  const path = await c.learningPaths.findOne({ slug });
  if (!path) return null;
  const canEdit = viewer && (viewer.roles.includes("admin") || path.ownerId.equals(viewer.id));
  if (path.status !== "published" && !canEdit) return null;
  const items = await resolveItems(path);
  const enrollment = viewer ? await c.pathEnrollments.findOne({ userId: viewer.id, pathId: path._id }) : null;
  let progress = null;
  if (viewer) {
    const allLessonIds = items.flatMap((i) => i.lessonIds);
    const lessonDocs = allLessonIds.length ? await c.lessons.find({ _id: { $in: allLessonIds.map((x) => new ObjectId(x)) } }).project<{ courseId: ObjectId }>({ courseId: 1 }).toArray() : [];
    const done = await completedSet(viewer.id, [...new Set(lessonDocs.map((l) => l.courseId.toHexString()))].map((x) => new ObjectId(x)));
    progress = pathProgress(items, done);
    return { path, items: items.map((i) => ({ ...i, doneCount: i.lessonIds.filter((l) => done.has(l)).length })), enrollment, progress, canEdit: Boolean(canEdit) };
  }
  return { path, items: items.map((i) => ({ ...i, doneCount: 0 })), enrollment, progress, canEdit: false };
}

export async function setPathEnrollment(viewer: Viewer, pathId: ObjectId, status: "active" | "paused" | "stopped") {
  const c = await cols();
  const path = await c.learningPaths.findOne({ _id: pathId, status: "published" });
  if (!path) throw new AppError("INVALID_STATE", "Lộ trình không khả dụng.");
  const now = new Date();
  await c.pathEnrollments.updateOne({ userId: viewer.id, pathId }, { $set: { status, updatedAt: now }, $setOnInsert: { userId: viewer.id, pathId, startedAt: now } }, { upsert: true });
  return path.slug;
}

export async function myPaths(viewer: Viewer) {
  const c = await cols();
  const enrolls = await c.pathEnrollments.find({ userId: viewer.id, status: { $ne: "stopped" } }).sort({ updatedAt: -1 }).limit(20).toArray();
  const out = [];
  for (const e of enrolls) {
    const path = await c.learningPaths.findOne({ _id: e.pathId });
    if (!path) continue;
    const d = await getPathDetail(path.slug, viewer);
    if (d) out.push({ slug: path.slug, title: path.title, status: e.status, progress: d.progress ?? { completed: 0, total: 0, percent: 0 } });
  }
  return out;
}

/* ---- Soạn lộ trình (admin hoặc giảng viên) ---- */

export type PathInput = {
  title: string;
  goal: string;
  audience: string;
  prerequisites: string;
  status: LearningPathDoc["status"];
  featured: boolean;
  items: { itemId?: string; kind: PathItem["kind"]; refId: ObjectId | null; title: string | null; required: boolean; dependsOn: string[] }[];
};

function canManage(viewer: Viewer) {
  return viewer.roles.includes("admin") || viewer.roles.includes("instructor");
}

export async function savePath(viewer: Viewer, pathId: ObjectId | null, input: PathInput) {
  if (!canManage(viewer)) throw new AppError("FORBIDDEN", "Chỉ giảng viên hoặc quản trị viên.");
  if (input.items.length > MAX_ITEMS) throw new AppError("LIMIT_REACHED", `Tối đa ${MAX_ITEMS} mục.`);
  const c = await cols();
  const items: PathItem[] = input.items.map((it, order) => ({ itemId: it.itemId || randomUUID().slice(0, 8), kind: it.kind, refId: it.refId, title: it.title, required: it.required, order, dependsOn: it.dependsOn }));
  // Mục phải trỏ tới nội dung tồn tại (trạng thái xuất bản kiểm tra lúc hiển thị).
  for (const it of items) {
    if (it.kind === "milestone") continue;
    if (!it.refId) throw new AppError("VALIDATION_FAILED", "Mục thiếu tham chiếu nội dung.");
    const coll = it.kind === "course" ? c.courses : it.kind === "chapter" ? c.chapters : c.lessons;
    if (!(await (coll as typeof c.courses).findOne({ _id: it.refId }, { projection: { _id: 1 } }))) throw new AppError("VALIDATION_FAILED", "Có mục trỏ tới nội dung không tồn tại.");
  }
  const cycle = findCycle(items);
  if (cycle) throw new AppError("VALIDATION_FAILED", `Phụ thuộc bị vòng lặp hoặc trỏ tới mục không tồn tại: ${cycle.join(" → ")}`);
  if (input.featured && !viewer.roles.includes("admin")) input.featured = false;
  const now = new Date();
  if (pathId) {
    const existing = await c.learningPaths.findOne({ _id: pathId });
    if (!existing || (!viewer.roles.includes("admin") && !existing.ownerId.equals(viewer.id))) throw notFound("Không tìm thấy lộ trình");
    await c.learningPaths.updateOne({ _id: pathId }, { $set: { ...input, featured: viewer.roles.includes("admin") ? input.featured : existing.featured, items, updatedAt: now } });
    await audit({ actorId: viewer.id, action: "path.update", targetType: "learningPath", targetId: pathId });
    return { id: pathId.toHexString(), slug: existing.slug };
  }
  for (let i = 0; i < 20; i++) {
    const slug = i ? `${slugify(input.title)}-${i + 1}` : slugify(input.title) || "lo-trinh";
    try {
      const res = await c.learningPaths.insertOne({ slug, ownerId: viewer.id, ...input, items, createdAt: now, updatedAt: now });
      await audit({ actorId: viewer.id, action: "path.create", targetType: "learningPath", targetId: res.insertedId });
      return { id: res.insertedId.toHexString(), slug };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
  throw new AppError("CONFLICT", "Không tạo được đường dẫn, hãy đổi tên.");
}

export async function managedPaths(viewer: Viewer) {
  const c = await cols();
  const filter = viewer.roles.includes("admin") ? {} : { ownerId: viewer.id };
  return c.learningPaths.find(filter).sort({ updatedAt: -1 }).limit(100).toArray();
}

export async function getPathForEditor(viewer: Viewer, pathId: ObjectId) {
  const c = await cols();
  const p = await c.learningPaths.findOne({ _id: pathId });
  if (!p || (!viewer.roles.includes("admin") && !p.ownerId.equals(viewer.id))) throw notFound("Không tìm thấy lộ trình");
  return p;
}

/** Danh mục nội dung published để chọn khi soạn lộ trình. */
export async function pickableContent() {
  const c = await cols();
  const courses = await c.courses.find({ status: "published", published: { $ne: null } }).project<{ _id: ObjectId; slug: string; published: { title: string } }>({ slug: 1, "published.title": 1 }).toArray();
  const outlines = await publishedOutline(courses.map((x) => x._id));
  return courses.map((x) => {
    const o = outlines.get(x._id.toHexString());
    return {
      id: x._id.toHexString(),
      title: x.published.title,
      chapters: (o?.chapters ?? []).map((ch) => ({ id: ch.id.toHexString(), title: ch.title, lessons: ch.lessons.map((l) => ({ id: l.id.toHexString(), title: l.title })) })),
    };
  });
}
