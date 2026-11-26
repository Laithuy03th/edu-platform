import "server-only";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { Viewer } from "@/server/auth/viewer-core";
import { cols } from "@/server/db/models";

/**
 * Kiểm tra SEO cho admin (S02–S09): cấu hình môi trường + chất lượng metadata của nội dung ĐÃ xuất bản.
 * Chỉ đọc; ngưỡng theo khuyến nghị phổ biến (title ≤ 60 ký tự, mô tả 70–160) — là gợi ý, không phải luật.
 */
export type Level = "ok" | "warn" | "error";
export type Check = { level: Level; label: string; detail?: string };
export type ItemReport = { kind: "course" | "article"; title: string; url: string; editUrl: string; checks: Check[] };

const STALE_DAYS = 365;

function textChecks(title: string, desc: string, descLabel: string): Check[] {
  const out: Check[] = [];
  out.push(title.length > 60 ? { level: "warn", label: `Tiêu đề dài ${title.length} ký tự`, detail: "Google thường cắt tiêu đề dài hơn ~60 ký tự." } : { level: "ok", label: "Độ dài tiêu đề" });
  if (desc.length < 70) out.push({ level: "warn", label: `${descLabel} ngắn (${desc.length} ký tự)`, detail: "Nên 70–160 ký tự, nói rõ học được gì." });
  else if (desc.length > 160) out.push({ level: "warn", label: `${descLabel} dài (${desc.length} ký tự)`, detail: "Phần sau ~160 ký tự thường bị cắt trên trang kết quả." });
  else out.push({ level: "ok", label: `Độ dài ${descLabel.toLowerCase()}` });
  return out;
}

export async function seoAudit(viewer: Viewer) {
  if (!viewer.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const e = env();
  const c = await cols();
  const now = Date.now();
  const [courses, articles, previewLessons, sitemapCourses, sitemapArticles] = await Promise.all([
    c.courses.find({ status: "published", published: { $ne: null } }, { projection: { slug: 1, published: 1, contentReview: 1, publishedVersion: 1 } }).limit(500).toArray(),
    c.articles.find({ status: "published", published: { $ne: null } }, { projection: { slug: 1, published: 1, contentReview: 1, publishedVersion: 1 } }).limit(500).toArray(),
    c.lessons.aggregate<{ _id: unknown; n: number; video: number }>([{ $match: { "published.isPreview": true } }, { $group: { _id: "$courseId", n: { $sum: 1 }, video: { $sum: { $cond: [{ $and: [{ $eq: ["$published.type", "video"] }, { $ne: ["$published.mediaId", null] }] }, 1, 0] } } } }]).toArray(),
    c.courses.countDocuments({ status: "published" }),
    c.articles.countDocuments({ status: "published" }),
  ]);
  const preview = new Map(previewLessons.map((p) => [String(p._id), p]));

  const appUrl = new URL(e.appUrl);
  const env_: Check[] = [
    e.isProduction ? { level: "ok", label: "Cho phép index (APP_ENV=production)" } : { level: "warn", label: "Đang chặn index toàn site", detail: "Môi trường không phải production nên mọi trang có noindex — đúng cho bản dev/preview; khi deploy thật đặt APP_ENV=production." },
    appUrl.protocol === "https:" ? { level: "ok", label: `APP_URL dùng HTTPS (${appUrl.host})` } : { level: e.isProduction ? "error" : "warn", label: `APP_URL chưa dùng HTTPS (${appUrl.origin})`, detail: "Canonical, sitemap, Open Graph lấy domain từ APP_URL." },
    e.GOOGLE_SITE_VERIFICATION ? { level: "ok", label: "Đã có mã xác minh Google Search Console" } : { level: "warn", label: "Chưa có GOOGLE_SITE_VERIFICATION", detail: "Hoặc xác minh bằng bản ghi DNS (khuyên dùng: Domain property) — xem docs/SEARCH_CONSOLE.md." },
    e.BING_SITE_VERIFICATION ? { level: "ok", label: "Đã có mã xác minh Bing Webmaster" } : { level: "warn", label: "Chưa có BING_SITE_VERIFICATION", detail: "Có thể nhập site từ Google Search Console vào Bing thay cho mã." },
    e.CONTACT_EMAIL ? { level: "ok", label: "Có email liên hệ công khai" } : { level: "warn", label: "Chưa có CONTACT_EMAIL", detail: "Trang Liên hệ/Chính sách đang chỉ hướng dẫn kênh trong ứng dụng." },
    e.cloudinaryEnabled ? { level: "ok", label: "Cloudinary đã cấu hình (ảnh bìa, video học thử)" } : { level: "warn", label: "Chưa cấu hình Cloudinary", detail: "Không có ảnh bìa/video → trang khóa học dùng ảnh mặc định." },
  ];

  const items: ItemReport[] = [];
  for (const x of courses) {
    const p = x.published!;
    const pv = preview.get(x._id.toHexString());
    const updated = (p.contentUpdatedAt ?? p.publishedAt).getTime();
    const checks: Check[] = [
      ...textChecks(p.title, p.shortDescription, "Mô tả ngắn"),
      p.thumbnailUrl ? { level: "ok", label: "Có ảnh bìa (Open Graph + image sitemap)" } : { level: "warn", label: "Chưa có ảnh bìa", detail: "Chia sẻ mạng xã hội sẽ dùng ảnh mặc định." },
      pv?.video ? { level: "ok", label: "Có video học thử công khai (VideoObject)" } : pv?.n ? { level: "warn", label: "Bài học thử chưa có video", detail: "Video học thử giúp trang khóa xuất hiện ở kết quả video." } : { level: "warn", label: "Chưa có bài học thử", detail: "Người xem không thử được trước khi đăng ký." },
      p.technologies?.length ? { level: "ok", label: "Gắn công nghệ + phiên bản đã kiểm thử" } : { level: "warn", label: "Chưa gắn công nghệ", detail: "Không xuất hiện ở hub công nghệ (internal link)." },
      x.contentReview ? (x.contentReview.publishedVersion < x.publishedVersion ? { level: "warn", label: "Nội dung đã đổi sau lần review chuyên môn" } : { level: "ok", label: `Review chuyên môn: ${x.contentReview.reviewerName}` }) : { level: "warn", label: "Chưa review chuyên môn", detail: "Tín hiệu chuyên môn (E-E-A-T) yếu hơn." },
      now - updated > STALE_DAYS * 86400_000 ? { level: "warn", label: "Hơn 1 năm chưa cập nhật nội dung" } : { level: "ok", label: "Nội dung cập nhật trong 12 tháng" },
    ];
    items.push({ kind: "course", title: p.title, url: `/courses/${x.slug}`, editUrl: `/instructor/courses/${x._id.toHexString()}`, checks });
  }
  for (const a of articles) {
    const p = a.published!;
    const checks: Check[] = [
      ...textChecks(p.title, p.summary, "Tóm tắt"),
      p.technologyIds.length ? { level: "ok", label: "Gắn công nghệ" } : { level: "warn", label: "Chưa gắn công nghệ", detail: "Không liên kết tới hub/khóa liên quan." },
      a.contentReview ? (a.contentReview.publishedVersion < (a.publishedVersion ?? 0) ? { level: "warn", label: "Nội dung đã đổi sau lần review" } : { level: "ok", label: `Review: ${a.contentReview.reviewerName}` }) : { level: "warn", label: "Chưa review chuyên môn" },
      now - p.contentUpdatedAt.getTime() > STALE_DAYS * 86400_000 ? { level: "warn", label: "Hơn 1 năm chưa cập nhật" } : { level: "ok", label: "Nội dung cập nhật trong 12 tháng" },
    ];
    items.push({ kind: "article", title: p.title, url: `/huong-dan/${a.slug}`, editUrl: `/instructor/articles/${a._id.toHexString()}`, checks });
  }
  const issues = items.reduce((n, i) => n + i.checks.filter((k) => k.level !== "ok").length, 0);
  return { env: env_, items, issues, sitemap: { courses: sitemapCourses, articles: sitemapArticles }, appUrl: e.appUrl };
}
