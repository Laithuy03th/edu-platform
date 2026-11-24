import { CourseCard } from "@/components/course-card";
import { IconSearch } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Container, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { LEVELS, LEVEL_LABEL, listCatalog, listCategories, parseCatalogQuery, type CatalogQuery } from "@/modules/courses/catalog";
import { CatalogFilters } from "./filters";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageOpenGraph } from "@/lib/seo";

/**
 * Chính sách index của catalog (SEO_AUDIT S03):
 * - /courses và /courses?page=N (không lọc): index, canonical về chính URL trang đó (không gom về page 1).
 * - Có tìm kiếm/lọc/sắp xếp: noindex,follow — tránh sinh vô hạn URL indexable từ tổ hợp filter.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogQuery> }): Promise<Metadata> {
  const query = parseCatalogQuery(await searchParams);
  const filtered = Boolean(query.q || query.category || query.level || query.instructor || query.tech || query.sort !== "newest");
  const description = "Danh sách khóa học đã xuất bản: tìm theo tên, lọc theo chủ đề và cấp độ.";
  const url = query.page > 1 ? `/courses?page=${query.page}` : "/courses";
  return {
    title: query.page > 1 && !filtered ? `Khóa học — trang ${query.page}` : "Khóa học",
    description,
    ...(filtered ? { robots: { index: false, follow: true } } : { alternates: { canonical: url } }),
    openGraph: pageOpenGraph({ title: "Khóa học", description, url }),
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = parseCatalogQuery(await searchParams);
  const [{ items, total }, categories] = await Promise.all([listCatalog(query), listCategories()]);
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  // Trang vượt quá số trang thật → 404 (không soft-404 trang rỗng status 200).
  if (query.page > pages) notFound();
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (query.q) sp.set("q", query.q);
    if (query.category) sp.set("category", query.category);
    if (query.level) sp.set("level", query.level);
    if (query.tech) sp.set("tech", query.tech);
    if (query.sort !== "newest") sp.set("sort", query.sort);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/courses?${s}` : "/courses";
  };
  return (
    <div className="bg-grain-warm">
      <Container className="py-10 sm:py-14">
        <PageHeader eyebrow="Thư viện" title="Khóa học" description="Chọn khóa phù hợp với mục tiêu. Bài có nhãn “Học thử” xem được trước khi đăng ký." />
        <CatalogFilters
          categories={categories}
          levels={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
          initial={{ q: query.q, category: query.category ?? "", level: query.level ?? "", sort: query.sort }}
          total={total}
        />
        {items.length === 0 ? (
          <EmptyState icon={<IconSearch />} title="Không tìm thấy khóa học phù hợp">
            Tìm kiếm khớp theo từ (không phân biệt dấu). Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc.
          </EmptyState>
        ) : (
          <Reveal group className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </Reveal>
        )}
        <Pagination page={query.page} pages={pages} href={pageHref} />
      </Container>
    </div>
  );
}
