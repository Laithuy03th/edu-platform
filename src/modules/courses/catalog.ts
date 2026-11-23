import "server-only";
import { unstable_cache } from "next/cache";
import { ObjectId, type Filter } from "mongodb";
import { normalizeForSearch } from "@/lib/text";
import { parseId } from "@/lib/ids";
import { cols, type CourseDoc, type Level } from "@/server/db/models";

/* Dữ liệu CÔNG KHAI duy nhất được cache (không chứa dữ liệu cá nhân). Tag "catalog" bị xóa khi duyệt/gỡ khóa. */

export const CATALOG_TAG = "catalog";
export const PAGE_SIZES = [12, 24] as const;
export const SORTS = ["newest", "rating"] as const;
export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
export const LEVEL_LABEL: Record<Level, string> = { beginner: "Cơ bản", intermediate: "Trung cấp", advanced: "Nâng cao" };

export type CourseCardDto = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  level: Level;
  categoryName: string | null;
  instructorName: string;
  lessonCount: number;
  totalDurationSeconds: number;
  ratingAvg: number;
  ratingCount: number;
  thumbnailUrl: string | null;
  enrollmentCount: number;
};

export type CatalogQuery = { q?: string; category?: string; level?: string; instructor?: string; sort?: string; page?: string };

/** Chuẩn hóa query từ URL: allowlist, không nhận operator/filter thô (C17). */
export function parseCatalogQuery(sp: CatalogQuery) {
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100).trim() : "";
  const level = LEVELS.includes(sp.level as Level) ? (sp.level as Level) : null;
  const sort = SORTS.includes(sp.sort as (typeof SORTS)[number]) ? (sp.sort as (typeof SORTS)[number]) : "newest";
  const pageNum = Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const page = Number.isFinite(pageNum) ? Math.min(Math.max(pageNum, 1), 50) : 1;
  const category = typeof sp.category === "string" && /^[a-z0-9-]{1,80}$/.test(sp.category) ? sp.category : null;
  const instructor = parseId(sp.instructor)?.toHexString() ?? null;
  return { q, level, sort, page, category, instructor, pageSize: PAGE_SIZES[0] };
}
export type ParsedCatalogQuery = ReturnType<typeof parseCatalogQuery>;

async function toCards(courses: (CourseDoc & { _id: ObjectId })[]): Promise<CourseCardDto[]> {
  const c = await cols();
  const instructorIds = [...new Set(courses.map((x) => x.instructorId.toHexString()))].map((id) => new ObjectId(id));
  const [users, categories] = await Promise.all([
    c.users.find({ _id: { $in: instructorIds } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray(),
    c.categories.find({}).toArray(),
  ]);
  const nameOf = new Map(users.map((u) => [u._id.toHexString(), u.displayName]));
  const catOf = new Map(categories.map((x) => [x._id.toHexString(), x.name]));
  return courses.map((x) => ({
    id: x._id.toHexString(),
    slug: x.slug,
    title: x.published!.title,
    shortDescription: x.published!.shortDescription,
    level: x.published!.level,
    categoryName: x.published!.categoryId ? (catOf.get(x.published!.categoryId.toHexString()) ?? null) : null,
    instructorName: nameOf.get(x.instructorId.toHexString()) ?? "Giảng viên",
    lessonCount: x.published!.lessonCount,
    totalDurationSeconds: x.published!.totalDurationSeconds,
    ratingAvg: x.ratingAvg,
    ratingCount: x.ratingCount,
    thumbnailUrl: x.published!.thumbnailUrl,
    enrollmentCount: x.enrollmentCount,
  }));
}

async function listCatalogUncached(query: ParsedCatalogQuery) {
  const c = await cols();
  const filter: Filter<CourseDoc> = { status: "published", published: { $ne: null } };
  if (query.level) filter["published.level"] = query.level;
  if (query.instructor) filter.instructorId = new ObjectId(query.instructor);
  if (query.category) {
    const cat = await c.categories.findOne({ slug: query.category });
    if (!cat) return { items: [] as CourseCardDto[], total: 0 };
    filter["published.categoryId"] = cat._id;
  }
  if (query.q) filter.$text = { $search: normalizeForSearch(query.q) };
  const sort: Record<string, 1 | -1> = query.sort === "rating" ? { ratingAvg: -1, ratingCount: -1, _id: -1 } : { "published.publishedAt": -1, _id: -1 };
  const [docs, total] = await Promise.all([
    c.courses.find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).toArray(),
    c.courses.countDocuments(filter),
  ]);
  return { items: await toCards(docs), total };
}

export const listCatalog = unstable_cache(listCatalogUncached, ["catalog-list-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

export const listFeatured = unstable_cache(
  async () => {
    const c = await cols();
    let docs = await c.courses.find({ status: "published", featuredRank: { $ne: null } }).sort({ featuredRank: 1 }).limit(6).toArray();
    if (docs.length === 0) docs = await c.courses.find({ status: "published", published: { $ne: null } }).sort({ "published.publishedAt": -1 }).limit(6).toArray();
    return toCards(docs);
  },
  ["catalog-featured-v1"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export const listCategories = unstable_cache(
  async () => {
    const c = await cols();
    const cats = await c.categories.find({ isActive: true }).sort({ order: 1 }).toArray();
    return cats.map((x) => ({ id: x._id.toHexString(), slug: x.slug, name: x.name }));
  },
  ["categories-v1"],
  { tags: [CATALOG_TAG, "categories"], revalidate: 3600 },
);

export type CourseDetailDto = CourseCardDto & {
  description: string;
  learningObjectives: string[];
  prerequisites: string[];
  status: "published" | "archived" | "suspended";
  instructorId: string;
  instructorBio: string;
  publishedVersion: number;
  requiredLessonCount: number;
  hasPlacementQuiz: boolean;
  chapters: {
    id: string;
    title: string;
    description: string;
    lessons: { id: string; title: string; type: "reading" | "video"; durationSeconds: number; isPreview: boolean; isRequired: boolean }[];
  }[];
};

async function courseDetailUncached(slug: string): Promise<CourseDetailDto | null> {
  const c = await cols();
  const course = await c.courses.findOne({ slug, status: { $in: ["published", "archived", "suspended"] }, published: { $ne: null } });
  if (!course?.published) return null;
  const [card] = await toCards([course]);
  const [chapters, lessons, instructor] = await Promise.all([
    c.chapters.find({ courseId: course._id, published: { $ne: null } }).sort({ "published.order": 1 }).toArray(),
    // Chỉ metadata — KHÔNG lấy content/transcript/mediaId ra trang công khai.
    c.lessons
      .find({ courseId: course._id, published: { $ne: null } })
      .project<{ _id: ObjectId; published: { chapterId: ObjectId; order: number; title: string; type: "reading" | "video"; durationSeconds: number; isPreview: boolean; isRequired: boolean } }>({
        "published.chapterId": 1,
        "published.order": 1,
        "published.title": 1,
        "published.type": 1,
        "published.durationSeconds": 1,
        "published.isPreview": 1,
        "published.isRequired": 1,
      })
      .sort({ "published.order": 1 })
      .toArray(),
    c.users.findOne({ _id: course.instructorId }, { projection: { bio: 1 } }),
  ]);
  return {
    ...card!,
    description: course.published.description,
    learningObjectives: course.published.learningObjectives,
    prerequisites: course.published.prerequisites,
    status: course.status as CourseDetailDto["status"],
    instructorId: course.instructorId.toHexString(),
    instructorBio: instructor?.bio ?? "",
    publishedVersion: course.publishedVersion,
    requiredLessonCount: course.published.requiredLessonCount,
    hasPlacementQuiz: Boolean(course.published.placementQuizId),
    chapters: chapters.map((ch) => ({
      id: ch._id.toHexString(),
      title: ch.published!.title,
      description: ch.published!.description,
      lessons: lessons
        .filter((l) => l.published.chapterId.equals(ch._id))
        .map((l) => ({
          id: l._id.toHexString(),
          title: l.published.title,
          type: l.published.type,
          durationSeconds: l.published.durationSeconds,
          isPreview: l.published.isPreview,
          isRequired: l.published.isRequired,
        })),
    })),
  };
}

export const getCourseDetail = unstable_cache(courseDetailUncached, ["course-detail-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Bản không cache — dùng trong test tích hợp. */
export const __uncached = { listCatalog: listCatalogUncached, courseDetail: courseDetailUncached };
