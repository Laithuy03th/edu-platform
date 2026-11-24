import "server-only";
import { unstable_cache } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { slugify } from "@/lib/text";
import { ARTICLE_KINDS, cols, type ArticleContent, type ArticleDoc, type ArticleKind, type Doc, type Level } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { CATALOG_TAG } from "@/modules/courses/catalog";

export const ARTICLES_TAG = "articles";
export const KIND_LABEL: Record<ArticleKind, string> = {
  tutorial: "Hướng dẫn",
  reference: "Tham khảo",
  cheatsheet: "Cheatsheet",
  troubleshooting: "Xử lý lỗi",
  recipe: "Cài đặt môi trường",
};
export const KIND_SLUG: Record<ArticleKind, string> = { tutorial: "huong-dan", reference: "tham-khao", cheatsheet: "cheatsheet", troubleshooting: "xu-ly-loi", recipe: "cai-dat" };
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isAuthor = (v: Viewer) => v.roles.includes("instructor") || v.roles.includes("admin");
const isAdmin = (v: Viewer) => v.roles.includes("admin");

export const articleInput = z.object({
  kind: z.enum(ARTICLE_KINDS),
  title: z.string().trim().min(5, "Tiêu đề ít nhất 5 ký tự").max(140),
  summary: z.string().trim().min(20, "Tóm tắt ít nhất 20 ký tự (hiện trong kết quả tìm kiếm)").max(300),
  content: z.string().max(60_000),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  technologyIds: z.array(z.instanceof(ObjectId)).max(8),
  testedOn: z
    .array(z.object({ os: z.string().trim().min(2).max(60), tools: z.string().trim().min(2).max(160), testedAt: z.coerce.date() }))
    .max(6),
});
export type ArticleInput = z.infer<typeof articleInput>;

const emptyContent = (kind: ArticleKind, title: string): ArticleContent => ({ kind, title, summary: "", content: "", level: "beginner", technologyIds: [], testedOn: [] });

async function uniqueSlug(base: string): Promise<string> {
  const c = await cols();
  const root = slugify(base).slice(0, 80) || "bai-viet";
  for (let i = 0; i < 50; i++) {
    const s = i ? `${root}-${i + 1}` : root;
    if (!(await c.articles.findOne({ $or: [{ slug: s }, { slugHistory: s }] }, { projection: { _id: 1 } }))) return s;
  }
  return `${root}-${new ObjectId().toHexString().slice(-6)}`;
}

/* ---------------- Soạn bài (tác giả = giảng viên/admin) ---------------- */

export async function createArticle(viewer: Viewer, input: { title: string; kind: ArticleKind }) {
  if (!isAuthor(viewer)) throw new AppError("FORBIDDEN", "Chỉ giảng viên hoặc quản trị viên được viết bài.");
  const c = await cols();
  if ((await c.articles.countDocuments({ authorId: viewer.id, status: "draft" })) >= 50) throw new AppError("LIMIT_REACHED", "Tối đa 50 bài nháp.");
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await c.articles.insertOne({
        slug: await uniqueSlug(input.title),
        slugHistory: [],
        authorId: viewer.id,
        status: "draft",
        review: { state: "none", submittedRevision: null, submittedAt: null, reviewedAt: null, reviewerId: null, rejectReason: null },
        draftRevision: 1,
        publishedVersion: 0,
        draft: emptyContent(input.kind, input.title),
        published: null,
        contentReview: null,
        createdAt: now,
        updatedAt: now,
      });
      return res.insertedId;
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
  throw new AppError("ALREADY_EXISTS", "Không tạo được slug duy nhất, đổi tiêu đề rồi thử lại.");
}

export async function loadEditableArticle(viewer: Viewer, id: ObjectId): Promise<Doc<ArticleDoc>> {
  const c = await cols();
  const a = await c.articles.findOne({ _id: id });
  // Không lộ sự tồn tại bài của người khác.
  if (!a || (!isAdmin(viewer) && !a.authorId.equals(viewer.id))) throw notFound("Không tìm thấy bài viết");
  return a;
}

export async function updateArticleDraft(viewer: Viewer, id: ObjectId, expectedRevision: number, input: ArticleInput) {
  const data = articleInput.parse(input);
  const a = await loadEditableArticle(viewer, id);
  if (a.review.state === "pending") throw new AppError("INVALID_STATE", "Bài đang chờ duyệt — rút lại hoặc chờ admin xử lý trước khi sửa.");
  const c = await cols();
  if (data.technologyIds.length) {
    const n = await c.technologies.countDocuments({ _id: { $in: data.technologyIds }, status: "active" });
    if (n !== new Set(data.technologyIds.map(String)).size) throw new AppError("VALIDATION_FAILED", "Công nghệ không hợp lệ hoặc chưa kích hoạt.", { fieldErrors: { technologyIds: ["Không hợp lệ"] } });
  }
  const r = await c.articles.updateOne({ _id: id, draftRevision: expectedRevision }, { $set: { draft: data, updatedAt: new Date() }, $inc: { draftRevision: 1 } });
  if (r.matchedCount === 0) throw new AppError("STALE_REVISION", "Bài vừa được sửa ở nơi khác. Tải lại trang.");
  return expectedRevision + 1;
}

/** Đổi slug: slug cũ vào slugHistory → URL cũ 308 về URL mới; chặn trùng slug/slug cũ của bài khác. */
export async function changeArticleSlug(viewer: Viewer, id: ObjectId, newSlug: string) {
  const a = await loadEditableArticle(viewer, id);
  const slug = newSlug.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length > 90) throw new AppError("VALIDATION_FAILED", "Slug chỉ gồm chữ thường không dấu, số và gạch ngang.", { fieldErrors: { slug: ["Không hợp lệ"] } });
  if (slug === a.slug) return;
  const c = await cols();
  const clash = await c.articles.findOne({ _id: { $ne: id }, $or: [{ slug }, { slugHistory: slug }] }, { projection: { _id: 1 } });
  if (clash) throw new AppError("ALREADY_EXISTS", "Slug đã được dùng.", { fieldErrors: { slug: ["Đã được dùng"] } });
  // Chỉ lưu lịch sử khi bài đã từng công khai (bài nháp chưa có URL nào cần giữ).
  const history = a.published ? [...new Set([...a.slugHistory.filter((s) => s !== slug), a.slug])] : a.slugHistory.filter((s) => s !== slug);
  try {
    await c.articles.updateOne({ _id: id }, { $set: { slug, slugHistory: history, updatedAt: new Date() } });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError("ALREADY_EXISTS", "Slug đã được dùng.", { fieldErrors: { slug: ["Đã được dùng"] } });
    throw err;
  }
  await audit({ actorId: viewer.id, action: "article.slug_change", targetType: "article", targetId: id, meta: { from: a.slug, to: slug } });
}

export function articleProblems(d: ArticleContent): string[] {
  const p: string[] = [];
  if (d.title.trim().length < 5) p.push("Tiêu đề quá ngắn.");
  if (d.summary.trim().length < 20) p.push("Thiếu tóm tắt.");
  if (d.content.trim().length < 300) p.push("Nội dung quá ngắn (tối thiểu ~300 ký tự).");
  if (!/^##\s/m.test(d.content)) p.push("Cần ít nhất một mục (## Tiêu đề) để có mục lục.");
  if (d.technologyIds.length === 0) p.push("Chọn ít nhất một công nghệ.");
  if (d.kind === "recipe" && d.testedOn.length === 0) p.push("Bài cài đặt môi trường phải ghi ít nhất một môi trường đã chạy thử thật.");
  return p;
}

export async function submitArticle(viewer: Viewer, id: ObjectId, expectedRevision: number) {
  const a = await loadEditableArticle(viewer, id);
  const problems = articleProblems(a.draft);
  if (problems.length) throw new AppError("PUBLISH_REQUIREMENTS_FAILED", "Bài chưa đủ điều kiện gửi duyệt.", { details: problems });
  const c = await cols();
  const r = await c.articles.updateOne(
    { _id: id, draftRevision: expectedRevision, "review.state": { $ne: "pending" } },
    { $set: { review: { state: "pending", submittedRevision: expectedRevision, submittedAt: new Date(), reviewedAt: null, reviewerId: null, rejectReason: null }, updatedAt: new Date() } },
  );
  if (r.matchedCount === 0) throw new AppError("STALE_REVISION", "Bài vừa thay đổi hoặc đã được gửi duyệt. Tải lại trang.");
  await audit({ actorId: viewer.id, action: "article.submit", targetType: "article", targetId: id, meta: { revision: expectedRevision } });
}

export async function withdrawArticle(viewer: Viewer, id: ObjectId) {
  await loadEditableArticle(viewer, id);
  const c = await cols();
  await c.articles.updateOne({ _id: id, "review.state": "pending" }, { $set: { "review.state": "none", "review.submittedRevision": null, updatedAt: new Date() } });
}

/* ---------------- Duyệt (admin) ---------------- */

export async function approveArticle(viewer: Viewer, id: ObjectId, submittedRevision: number) {
  if (!isAdmin(viewer)) throw new AppError("FORBIDDEN", "Chỉ quản trị viên được duyệt.");
  const c = await cols();
  const a = await c.articles.findOne({ _id: id });
  if (!a) throw notFound("Không tìm thấy bài viết");
  if (a.review.state !== "pending" || a.draftRevision !== submittedRevision || a.review.submittedRevision !== submittedRevision) {
    throw new AppError("STALE_REVISION", "Bản nộp đã thay đổi hoặc không còn chờ duyệt. Tải lại trang.");
  }
  const problems = articleProblems(a.draft);
  if (problems.length) throw new AppError("PUBLISH_REQUIREMENTS_FAILED", "Bài không còn đủ điều kiện xuất bản.", { details: problems });
  const now = new Date();
  const r = await c.articles.updateOne(
    { _id: id, draftRevision: submittedRevision, "review.state": "pending" },
    {
      $set: {
        status: "published",
        published: { ...a.draft, publishedAt: a.published?.publishedAt ?? now, contentUpdatedAt: now },
        review: { ...a.review, state: "approved", reviewedAt: now, reviewerId: viewer.id, rejectReason: null },
        updatedAt: now,
      },
      $inc: { publishedVersion: 1 },
    },
  );
  if (r.matchedCount === 0) throw new AppError("STALE_REVISION", "Bản nộp vừa thay đổi. Tải lại trang.");
  await audit({ actorId: viewer.id, action: "article.approve", targetType: "article", targetId: id, meta: { revision: submittedRevision } });
}

export async function rejectArticle(viewer: Viewer, id: ObjectId, reason: string) {
  if (!isAdmin(viewer)) throw new AppError("FORBIDDEN", "Chỉ quản trị viên được từ chối.");
  const c = await cols();
  const r = await c.articles.updateOne({ _id: id, "review.state": "pending" }, { $set: { "review.state": "rejected", "review.reviewedAt": new Date(), "review.reviewerId": viewer.id, "review.rejectReason": reason.slice(0, 1000), updatedAt: new Date() } });
  if (r.matchedCount === 0) throw new AppError("INVALID_STATE", "Bài không ở trạng thái chờ duyệt.");
  await audit({ actorId: viewer.id, action: "article.reject", targetType: "article", targetId: id, meta: {} });
}

export async function setArticleArchived(viewer: Viewer, id: ObjectId, archived: boolean) {
  if (!isAdmin(viewer)) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const a = await c.articles.findOne({ _id: id });
  if (!a?.published) throw new AppError("INVALID_STATE", "Bài chưa từng xuất bản.");
  await c.articles.updateOne({ _id: id }, { $set: { status: archived ? "archived" : "published", updatedAt: new Date() } });
  await audit({ actorId: viewer.id, action: archived ? "article.archive" : "article.unarchive", targetType: "article", targetId: id, meta: {} });
}

export async function recordArticleReview(viewer: Viewer, id: ObjectId, reviewerName: string, note: string, clear = false) {
  if (!isAdmin(viewer)) throw new AppError("FORBIDDEN", "Chỉ quản trị viên ghi nhận review chuyên môn.");
  const c = await cols();
  const a = await c.articles.findOne({ _id: id });
  if (!a?.published) throw new AppError("INVALID_STATE", "Bài chưa có bản xuất bản.");
  const name = reviewerName.trim();
  if (!clear && name.length < 2) throw new AppError("VALIDATION_FAILED", "Nhập tên người review.", { fieldErrors: { reviewerName: ["Bắt buộc"] } });
  await c.articles.updateOne({ _id: id }, { $set: { contentReview: clear ? null : { reviewerName: name.slice(0, 80), reviewedAt: new Date(), publishedVersion: a.publishedVersion, note: note.slice(0, 500) } } });
  await audit({ actorId: viewer.id, action: clear ? "article.review_clear" : "article.review_record", targetType: "article", targetId: id, meta: {} });
}

/* ---------------- Danh sách cho tác giả/admin ---------------- */

export async function listMyArticles(viewer: Viewer) {
  if (!isAuthor(viewer)) throw new AppError("FORBIDDEN", "Không có quyền.");
  const c = await cols();
  return c.articles.find(isAdmin(viewer) ? {} : { authorId: viewer.id }).sort({ updatedAt: -1 }).limit(200).toArray();
}

export async function articleReviewQueue(viewer: Viewer) {
  if (!isAdmin(viewer)) throw new AppError("FORBIDDEN", "Không có quyền.");
  const c = await cols();
  return c.articles.find({ "review.state": "pending" }).sort({ "review.submittedAt": 1 }).limit(100).toArray();
}

/* ---------------- Công khai (cache chung, không phụ thuộc người xem) ---------------- */

export type ArticleCardDto = { slug: string; kind: ArticleKind; title: string; summary: string; level: Level; technologies: { slug: string; name: string }[]; contentUpdatedAt: string; reviewed: boolean };
export type ArticleDetailDto = ArticleCardDto & {
  id: string;
  content: string;
  publishedAt: string;
  authorName: string;
  testedOn: { os: string; tools: string; testedAt: string }[];
  contentReview: { reviewerName: string; reviewedAt: string; outdated: boolean } | null;
  archived: boolean;
  relatedCourses: { slug: string; title: string; level: Level }[];
  related: { slug: string; title: string; kind: ArticleKind }[];
};

async function techMap(ids: ObjectId[]) {
  const c = await cols();
  const techs = ids.length ? await c.technologies.find({ _id: { $in: ids } }, { projection: { slug: 1, name: 1 } }).toArray() : [];
  return new Map(techs.map((t) => [t._id.toHexString(), { slug: t.slug, name: t.name }]));
}

function toCard(a: Doc<ArticleDoc>, tm: Map<string, { slug: string; name: string }>): ArticleCardDto {
  const p = a.published!;
  return {
    slug: a.slug,
    kind: p.kind,
    title: p.title,
    summary: p.summary,
    level: p.level,
    technologies: p.technologyIds.map((id) => tm.get(id.toHexString())).filter((x): x is { slug: string; name: string } => Boolean(x)),
    contentUpdatedAt: p.contentUpdatedAt.toISOString(),
    reviewed: Boolean(a.contentReview && a.contentReview.publishedVersion === a.publishedVersion),
  };
}

async function listPublicUncached(filter: { kind?: ArticleKind | null; tech?: string | null; limit?: number }): Promise<ArticleCardDto[]> {
  const c = await cols();
  const q: Record<string, unknown> = { status: "published" };
  if (filter.kind) q["published.kind"] = filter.kind;
  if (filter.tech) {
    const t = await c.technologies.findOne({ $or: [{ slug: filter.tech }, { aliases: filter.tech }] }, { projection: { _id: 1 } });
    if (!t) return [];
    q["published.technologyIds"] = t._id;
  }
  const rows = await c.articles.find(q).sort({ "published.contentUpdatedAt": -1 }).limit(Math.min(filter.limit ?? 60, 200)).toArray();
  const tm = await techMap([...new Set(rows.flatMap((r) => r.published!.technologyIds.map(String)))].map((x) => new ObjectId(x)));
  return rows.map((r) => toCard(r, tm));
}
export const listPublicArticles = unstable_cache(listPublicUncached, ["articles-public-v1"], { tags: [ARTICLES_TAG, CATALOG_TAG], revalidate: 3600 });

async function detailUncached(slug: string): Promise<ArticleDetailDto | { redirectTo: string } | null> {
  if (!SLUG_RE.test(slug)) return null;
  const c = await cols();
  const a = await c.articles.findOne({ $or: [{ slug }, { slugHistory: slug }], status: { $in: ["published", "archived"] } });
  if (!a?.published) return null;
  if (a.slug !== slug) return { redirectTo: a.slug };
  const p = a.published;
  const [tm, author, courses, related] = await Promise.all([
    techMap(p.technologyIds),
    c.users.findOne({ _id: a.authorId }, { projection: { displayName: 1 } }),
    p.technologyIds.length
      ? c.courses.find({ status: "published", "published.technologies.technologyId": { $in: p.technologyIds } }, { projection: { slug: 1, "published.title": 1, "published.level": 1 } }).limit(4).toArray()
      : Promise.resolve([]),
    p.technologyIds.length
      ? c.articles.find({ _id: { $ne: a._id }, status: "published", "published.technologyIds": { $in: p.technologyIds } }, { projection: { slug: 1, "published.title": 1, "published.kind": 1 } }).sort({ "published.contentUpdatedAt": -1 }).limit(4).toArray()
      : Promise.resolve([]),
  ]);
  return {
    ...toCard(a, tm),
    id: a._id.toHexString(),
    content: p.content,
    publishedAt: p.publishedAt.toISOString(),
    authorName: author?.displayName ?? "Tự Học",
    testedOn: p.testedOn.map((t) => ({ os: t.os, tools: t.tools, testedAt: new Date(t.testedAt).toISOString() })),
    contentReview: a.contentReview ? { reviewerName: a.contentReview.reviewerName, reviewedAt: a.contentReview.reviewedAt.toISOString(), outdated: a.contentReview.publishedVersion !== a.publishedVersion } : null,
    archived: a.status === "archived",
    relatedCourses: courses.map((x) => ({ slug: x.slug, title: x.published!.title, level: x.published!.level })),
    related: related.map((x) => ({ slug: x.slug, title: x.published!.title, kind: x.published!.kind })),
  };
}
export const getPublicArticle = unstable_cache(detailUncached, ["article-detail-v1"], { tags: [ARTICLES_TAG, CATALOG_TAG], revalidate: 3600 });

export async function listArticleSitemap() {
  const c = await cols();
  return c.articles.find({ status: "published" }).project<{ slug: string; published: { contentUpdatedAt: Date } }>({ slug: 1, "published.contentUpdatedAt": 1 }).limit(2000).toArray();
}

export const __uncached = { list: listPublicUncached, detail: detailUncached };
