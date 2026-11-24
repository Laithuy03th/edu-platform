import "server-only";
import { AppError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";

/**
 * T08/S09: bản đồ độ phủ nội dung cho admin — số liệu THẬT từ DB (không phải tài liệu viết tay).
 * Mỗi công nghệ: khóa đã xuất bản, bài hướng dẫn, đã review (khớp bản hiện tại), review lỗi thời, báo lỗi đang mở.
 * Kèm hàng đợi "cần review/cập nhật": nội dung chưa review, review đã cũ, nội dung lâu không cập nhật.
 */
export const STALE_DAYS = 180;

export async function contentCoverage(viewer: Viewer) {
  if (!viewer.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const [techs, courses, articles, issues] = await Promise.all([
    c.technologies.find({}, { projection: { slug: 1, name: 1, status: 1, domain: 1 } }).sort({ domain: 1, order: 1, name: 1 }).toArray(),
    c.courses
      .find({ status: "published" }, { projection: { slug: 1, publishedVersion: 1, contentReview: 1, "published.title": 1, "published.technologies": 1, "published.contentUpdatedAt": 1, "published.publishedAt": 1 } })
      .toArray(),
    c.articles.find({ status: "published" }, { projection: { slug: 1, publishedVersion: 1, contentReview: 1, "published.title": 1, "published.kind": 1, "published.technologyIds": 1, "published.contentUpdatedAt": 1 } }).toArray(),
    c.contentIssues.aggregate<{ _id: unknown; n: number }>([{ $match: { status: "open" } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]).toArray(),
  ]);
  const openByCourse = new Map(issues.map((x) => [String(x._id), x.n]));
  const reviewState = (doc: { contentReview?: { publishedVersion: number } | null; publishedVersion: number }) =>
    !doc.contentReview ? "none" : doc.contentReview.publishedVersion === doc.publishedVersion ? "current" : "outdated";

  const rows = techs.map((t) => {
    const id = t._id.toHexString();
    const cs = courses.filter((x) => x.published?.technologies?.some((tt) => tt.technologyId.toHexString() === id));
    const as = articles.filter((x) => x.published?.technologyIds.some((tt) => tt.toHexString() === id));
    const all = [...cs, ...as];
    return {
      slug: t.slug,
      name: t.name,
      domain: t.domain,
      status: t.status,
      courses: cs.length,
      articles: as.length,
      reviewed: all.filter((x) => reviewState(x) === "current").length,
      outdated: all.filter((x) => reviewState(x) === "outdated").length,
      openIssues: cs.reduce((a, x) => a + (openByCourse.get(x._id.toHexString()) ?? 0), 0),
    };
  });

  const staleBefore = Date.now() - STALE_DAYS * 86_400_000;
  const queue = [
    ...courses.map((x) => ({
      kind: "Khóa học" as const,
      title: x.published!.title,
      href: `/admin/courses/${x._id.toHexString()}`,
      review: reviewState(x),
      updatedAt: (x.published!.contentUpdatedAt ?? x.published!.publishedAt).toISOString(),
      openIssues: openByCourse.get(x._id.toHexString()) ?? 0,
    })),
    ...articles.map((x) => ({
      kind: "Bài hướng dẫn" as const,
      title: x.published!.title,
      href: `/instructor/articles/${x._id.toHexString()}`,
      review: reviewState(x),
      updatedAt: x.published!.contentUpdatedAt.toISOString(),
      openIssues: 0,
    })),
  ]
    .map((x) => ({ ...x, stale: new Date(x.updatedAt).getTime() < staleBefore }))
    .filter((x) => x.review !== "current" || x.stale || x.openIssues > 0)
    .sort((a, b) => b.openIssues - a.openIssues || (a.review === "outdated" ? -1 : 0) - (b.review === "outdated" ? -1 : 0) || a.updatedAt.localeCompare(b.updatedAt));

  const totals = {
    published: courses.length + articles.length,
    reviewed: [...courses, ...articles].filter((x) => reviewState(x) === "current").length,
    outdated: [...courses, ...articles].filter((x) => reviewState(x) === "outdated").length,
    hubs: rows.filter((r) => r.status === "active" && r.courses > 0).length,
    planned: rows.filter((r) => r.status === "planned").length,
    openIssues: [...openByCourse.values()].reduce((a, b) => a + b, 0),
  };
  return { rows, queue, totals };
}
