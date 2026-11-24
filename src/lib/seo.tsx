import { env } from "@/lib/env";

/**
 * SEO dùng chung (SEO_AUDIT S02/S04).
 * - URL tuyệt đối dựa trên APP_URL (metadataBase), không hardcode domain.
 * - JSON-LD chỉ phản ánh dữ liệu ĐANG HIỂN THỊ trên trang; không thêm rating/giá/ngày/tác giả giả.
 */
export const SITE_NAME = "Tự Học";

export function absoluteUrl(path: string): string {
  return new URL(path, env().appUrl + "/").toString();
}

/** Nhúng JSON-LD an toàn: escape "<" để chuỗi do người dùng nhập không thể đóng thẻ <script>. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function organizationLd() {
  return { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") };
}

export function websiteLd() {
  return { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/"), inLanguage: "vi" };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

/**
 * Course (schema.org). Không khai báo offers/aggregateRating: chưa có giá thật và
 * rich result Course list hiện chỉ hỗ trợ tiếng Anh — không hứa hiển thị rich result.
 */
export function courseLd(c: { slug: string; title: string; shortDescription: string; instructorName: string; level: string; categoryName: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.shortDescription,
    url: absoluteUrl(`/courses/${c.slug}`),
    inLanguage: "vi",
    educationalLevel: c.level,
    ...(c.categoryName ? { about: c.categoryName } : {}),
    provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    ...(c.instructorName ? { author: { "@type": "Person", name: c.instructorName } } : {}),
  };
}

/** Open Graph đầy đủ cho trang con (Next gộp metadata NÔNG: openGraph của trang thay toàn bộ của layout). */
export function pageOpenGraph(og: { title: string; description: string; url: string; images?: string[] }) {
  return { type: "website" as const, siteName: SITE_NAME, locale: "vi_VN", ...og };
}

/** Chỉ thêm key robots khi cần chặn index — để trống thì kế thừa chính sách theo môi trường từ layout. */
export function robotsUnless(indexable: boolean) {
  return indexable ? {} : { robots: { index: false, follow: true } };
}

/** TechArticle: chỉ dữ liệu thật (tác giả, ngày xuất bản, ngày cập nhật nội dung). Không rating, không ảnh giả. */
export function articleLd(a: { slug: string; title: string; summary: string; authorName: string; publishedAt: string; contentUpdatedAt: string; technologies: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: a.title,
    description: a.summary,
    url: absoluteUrl(`/huong-dan/${a.slug}`),
    inLanguage: "vi",
    datePublished: a.publishedAt,
    dateModified: a.contentUpdatedAt,
    author: { "@type": "Person", name: a.authorName },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    ...(a.technologies.length ? { about: a.technologies.map((name) => ({ "@type": "Thing", name })) } : {}),
  };
}
