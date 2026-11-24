import "server-only";
import { unstable_cache } from "next/cache";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { slugify } from "@/lib/text";
import { audit } from "@/server/audit";
import { cols, TECH_DOMAINS, TECH_TYPES, type CourseTechnology, type TechDomain, type TechType, type TechnologyDoc } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { CATALOG_TAG } from "@/modules/courses/catalog";
import { loadEditableCourse } from "@/modules/courses/authoring";

/**
 * Taxonomy công nghệ (V2 §32, T01–T03, T06).
 * - Phân biệt loại (ngôn ngữ/framework/runtime/database…) và mảng (frontend/backend…), không gộp vào một dropdown "language".
 * - Hub công khai CHỈ tồn tại khi có ≥ 1 khóa học đã xuất bản dùng công nghệ đó (§32.2: không public trang rỗng).
 * - Alias phục vụ tìm kiếm; URL alias chuyển hướng về slug chuẩn (không nhân bản URL).
 */

export const TYPE_LABEL: Record<TechType, string> = {
  language: "Ngôn ngữ",
  framework: "Framework",
  library: "Thư viện",
  runtime: "Runtime",
  database: "Cơ sở dữ liệu",
  tool: "Công cụ",
  platform: "Nền tảng",
  protocol: "Giao thức",
  concept: "Khái niệm",
};
export const DOMAIN_LABEL: Record<TechDomain, string> = {
  foundations: "Nhập môn IT",
  cs: "Khoa học máy tính",
  web: "Nền tảng web",
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  mobile: "Mobile",
  devops: "DevOps/Cloud",
  qa: "QA/Testing",
  security: "Bảo mật",
  data: "Data/AI",
  systems: "Hệ thống",
  game: "Game/Graphics",
};

const slugRe = /^[a-z0-9][a-z0-9.+#-]{0,59}$/;
export const technologyInput = z.object({
  name: z.string().trim().min(1, "Nhập tên").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().regex(slugRe, "Slug chỉ gồm a-z, 0-9, . + # -").optional()),
  type: z.enum(TECH_TYPES),
  domain: z.enum(TECH_DOMAINS),
  aliases: z
    .string()
    .max(400)
    .transform((s) => [...new Set(s.split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean))])
    .pipe(z.array(z.string().regex(slugRe, "Alias chỉ gồm a-z, 0-9, . + # -")).max(10, "Tối đa 10 alias")),
  description: z.string().trim().max(600),
  officialUrl: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null)
    .pipe(z.url({ protocol: /^https$/, message: "Link tài liệu phải là https://" }).nullable()),
  status: z.enum(["active", "planned"]),
  order: z.number().int().min(0).max(9999),
});
export type TechnologyInput = z.infer<typeof technologyInput>;

function requireAdmin(v: Viewer) {
  if (!v.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
}

export async function listTechnologiesAdmin() {
  const c = await cols();
  return c.technologies.find({}).sort({ domain: 1, order: 1, name: 1 }).toArray();
}

export async function upsertTechnology(admin: Viewer, id: ObjectId | null, input: TechnologyInput) {
  requireAdmin(admin);
  const c = await cols();
  const slug = input.slug ?? slugify(input.name).replace(/[^a-z0-9.+#-]/g, "");
  if (!slugRe.test(slug)) throw new AppError("VALIDATION_FAILED", "Không tạo được slug hợp lệ.", { fieldErrors: { slug: ["Nhập slug."] } });
  // Alias không được trùng slug/alias của công nghệ khác (tránh một từ trỏ tới hai trang).
  const clash = await c.technologies.findOne({
    ...(id ? { _id: { $ne: id } } : {}),
    $or: [{ slug: { $in: input.aliases } }, { aliases: { $in: [slug, ...input.aliases] } }],
  });
  if (clash) throw new AppError("ALREADY_EXISTS", `Alias/slug trùng với "${clash.name}".`);
  const now = new Date();
  const doc = { ...input, slug, aliases: input.aliases.filter((a) => a !== slug), updatedAt: now };
  try {
    if (id) {
      const r = await c.technologies.updateOne({ _id: id }, { $set: doc });
      if (r.matchedCount === 0) throw new AppError("NOT_FOUND", "Không tìm thấy công nghệ.");
    } else {
      await c.technologies.insertOne({ ...doc, createdAt: now });
    }
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError("ALREADY_EXISTS", "Slug đã tồn tại.");
    throw err;
  }
  await audit({ actorId: admin.id, action: "technology.upsert", targetType: "technology", targetId: id, meta: { slug, status: input.status } });
}

/** Danh sách cho editor của giảng viên (chỉ công nghệ active). */
export async function listActiveTechnologies() {
  const c = await cols();
  const docs = await c.technologies.find({ status: "active" }).sort({ name: 1 }).project<{ _id: ObjectId; name: string; type: TechType }>({ name: 1, type: 1 }).toArray();
  return docs.map((t) => ({ id: t._id.toHexString(), name: t.name, type: t.type }));
}

export const courseTechnologiesInput = z
  .array(
    z.object({
      technologyId: z.string().regex(/^[a-f0-9]{24}$/),
      testedVersion: z
        .string()
        .trim()
        .max(40)
        .regex(/^[0-9A-Za-z.\-+ x*]*$/, "Phiên bản chỉ gồm chữ, số và . - + x *"),
    }),
  )
  .max(8, "Tối đa 8 công nghệ cho một khóa");

/**
 * Giảng viên khai báo công nghệ + phiên bản đã kiểm thử cho BẢN NHÁP (lên trang công khai khi admin duyệt).
 * Dùng cùng cơ chế revision với editor để không ghi đè lẫn nhau.
 */
export async function setCourseTechnologies(viewer: Viewer, courseId: ObjectId, expectedRevision: number, items: CourseTechnology[]) {
  await loadEditableCourse(viewer, courseId);
  const ids = items.map((i) => i.technologyId.toHexString());
  if (new Set(ids).size !== ids.length) throw new AppError("VALIDATION_FAILED", "Mỗi công nghệ chỉ khai báo một lần.");
  const c = await cols();
  const found = await c.technologies.countDocuments({ _id: { $in: items.map((i) => i.technologyId) }, status: "active" });
  if (found !== items.length) throw new AppError("VALIDATION_FAILED", "Có công nghệ không hợp lệ hoặc chưa kích hoạt.");
  const res = await c.courses.findOneAndUpdate(
    { _id: courseId, draftRevision: expectedRevision, "review.state": { $ne: "pending" }, status: { $ne: "suspended" } },
    { $set: { "draft.technologies": items, updatedAt: new Date() }, $inc: { draftRevision: 1 } },
    { returnDocument: "after", projection: { draftRevision: 1 } },
  );
  if (!res) throw new AppError("STALE_REVISION", "Khóa học vừa được thay đổi ở nơi khác hoặc đang chờ duyệt. Tải lại trang.");
  return res.draftRevision;
}

/** Admin ghi nhận review chuyên môn (tên người review thật) cho bản đang xuất bản. Khác với duyệt xuất bản. */
export async function recordContentReview(admin: Viewer, courseId: ObjectId, input: { reviewerName: string; note: string } | null) {
  requireAdmin(admin);
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId }, { projection: { publishedVersion: 1, published: 1 } });
  if (!course?.published) throw new AppError("INVALID_STATE", "Khóa học chưa có bản xuất bản để review.");
  const value = input ? { reviewerName: input.reviewerName, note: input.note, reviewedAt: new Date(), publishedVersion: course.publishedVersion } : null;
  await c.courses.updateOne({ _id: courseId }, { $set: { contentReview: value } });
  await audit({ actorId: admin.id, action: input ? "course.content_review" : "course.content_review_cleared", targetType: "course", targetId: courseId, meta: input ? { publishedVersion: course.publishedVersion } : {} });
}

/* ---------- Trang công khai ---------- */

export type TechnologyHubDto = {
  slug: string;
  name: string;
  type: TechType;
  domain: TechDomain;
  description: string;
  officialUrl: string | null;
  aliases: string[];
  courses: { slug: string; title: string; shortDescription: string; level: string; testedVersion: string; lessonCount: number }[];
  paths: { slug: string; title: string; goal: string }[];
  lastUpdated: string;
};

/** Hub: null nếu không tồn tại HOẶC chưa có nội dung đã xuất bản (→ 404, không có trang rỗng). */
async function hubUncached(slugOrAlias: string): Promise<{ redirectTo: string } | TechnologyHubDto | null> {
  const c = await cols();
  const tech = await c.technologies.findOne({ $or: [{ slug: slugOrAlias }, { aliases: slugOrAlias }], status: "active" });
  if (!tech) return null;
  if (tech.slug !== slugOrAlias) return { redirectTo: tech.slug };
  const courses = await c.courses
    .find({ status: "published", "published.technologies.technologyId": tech._id })
    .project<{ _id: ObjectId; slug: string; published: NonNullable<import("@/server/db/models").CourseDoc["published"]> }>({ slug: 1, published: 1 })
    .sort({ "published.publishedAt": -1 })
    .limit(50)
    .toArray();
  if (courses.length === 0) return null;
  const paths = await c.learningPaths
    .find({ status: "published", "items.refId": { $in: courses.map((x) => x._id) } })
    .project<{ slug: string; title: string; goal: string }>({ slug: 1, title: 1, goal: 1 })
    .limit(20)
    .toArray();
  const last = courses.reduce((m, x) => Math.max(m, (x.published.contentUpdatedAt ?? x.published.publishedAt).getTime()), 0);
  return {
    slug: tech.slug,
    name: tech.name,
    type: tech.type,
    domain: tech.domain,
    description: tech.description,
    officialUrl: tech.officialUrl,
    aliases: tech.aliases,
    courses: courses.map((x) => ({
      slug: x.slug,
      title: x.published.title,
      shortDescription: x.published.shortDescription,
      level: x.published.level,
      testedVersion: x.published.technologies?.find((t) => t.technologyId.equals(tech._id))?.testedVersion ?? "",
      lessonCount: x.published.lessonCount,
    })),
    paths: paths.map((p) => ({ slug: p.slug, title: p.title, goal: p.goal })),
    lastUpdated: new Date(last).toISOString(),
  };
}
export const getTechnologyHub = unstable_cache(hubUncached, ["technology-hub-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Danh mục: công nghệ CÓ hub (kèm số khóa) và roadmap các mục đã lên kế hoạch (không có link). */
async function directoryUncached() {
  const c = await cols();
  const [techs, counts] = await Promise.all([
    c.technologies.find({}).sort({ domain: 1, order: 1, name: 1 }).toArray(),
    c.courses
      .aggregate<{ _id: ObjectId; n: number }>([
        { $match: { status: "published" } },
        { $unwind: "$published.technologies" },
        { $group: { _id: "$published.technologies.technologyId", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const countOf = new Map(counts.map((x) => [x._id.toHexString(), x.n]));
  const row = (t: TechnologyDoc & { _id: ObjectId }) => ({ slug: t.slug, name: t.name, type: t.type, domain: t.domain, description: t.description, courseCount: countOf.get(t._id.toHexString()) ?? 0 });
  const all = techs.map(row);
  return {
    hubs: all.filter((t, i) => techs[i]!.status === "active" && t.courseCount > 0),
    planned: all.filter((t, i) => techs[i]!.status === "planned" || t.courseCount === 0),
  };
}
export const getTechnologyDirectory = unstable_cache(directoryUncached, ["technology-directory-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Slug các hub có nội dung — cho sitemap. */
export async function listHubSlugs(): Promise<{ slug: string; lastModified: Date }[]> {
  const d = await directoryUncached();
  const out: { slug: string; lastModified: Date }[] = [];
  for (const h of d.hubs) {
    const hub = await hubUncached(h.slug);
    if (hub && "courses" in hub) out.push({ slug: h.slug, lastModified: new Date(hub.lastUpdated) });
  }
  return out;
}

export const __uncached = { hub: hubUncached, directory: directoryUncached };
