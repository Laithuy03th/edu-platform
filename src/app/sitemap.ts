import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { cols } from "@/server/db/models";
import { listHubSlugs } from "@/modules/technologies/service";

export const dynamic = "force-dynamic";

/** Sitemap chỉ gồm khóa học và lộ trình đã xuất bản (URL ổn định theo slug). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().appUrl;
  const items: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/technologies`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/paths`, changeFrequency: "weekly", priority: 0.7 },
  ];
  try {
    const c = await cols();
    const [courses, paths] = await Promise.all([
      // lastmod = lần duyệt gần nhất làm đổi nội dung công khai (sửa bản nháp chưa duyệt không đổi lastmod).
      c.courses.find({ status: "published", published: { $ne: null } }).project<{ slug: string; published: { publishedAt: Date; contentUpdatedAt?: Date } }>({ slug: 1, "published.publishedAt": 1, "published.contentUpdatedAt": 1 }).limit(1000).toArray(),
      c.learningPaths.find({ status: "published" }).project<{ slug: string; updatedAt: Date }>({ slug: 1, updatedAt: 1 }).limit(500).toArray(),
    ]);
    for (const x of courses) items.push({ url: `${base}/courses/${x.slug}`, lastModified: x.published.contentUpdatedAt ?? x.published.publishedAt, changeFrequency: "weekly", priority: 0.8 });
    // Chỉ hub có khóa đã xuất bản (không đưa công nghệ "planned"/rỗng vào sitemap).
    for (const h of await listHubSlugs()) items.push({ url: `${base}/technologies/${h.slug}`, lastModified: h.lastModified, changeFrequency: "weekly", priority: 0.7 });
    for (const x of paths) items.push({ url: `${base}/paths/${x.slug}`, lastModified: x.updatedAt, changeFrequency: "monthly", priority: 0.6 });
  } catch (err) {
    logger.error("sitemap.failed", { err });
  }
  return items;
}
