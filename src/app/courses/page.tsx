import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { Container, EmptyState, PageHeader } from "@/components/ui";
import { LEVELS, LEVEL_LABEL, listCatalog, listCategories, parseCatalogQuery, type CatalogQuery } from "@/modules/courses/catalog";
import { CatalogFilters } from "./filters";

export const metadata = { title: "Khóa học", description: "Danh sách khóa học đã xuất bản: tìm theo tên, lọc theo chủ đề và cấp độ." };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = parseCatalogQuery(await searchParams);
  const [{ items, total }, categories] = await Promise.all([listCatalog(query), listCategories()]);
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (query.q) sp.set("q", query.q);
    if (query.category) sp.set("category", query.category);
    if (query.level) sp.set("level", query.level);
    if (query.sort !== "newest") sp.set("sort", query.sort);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/courses?${s}` : "/courses";
  };
  return (
    <Container className="py-8">
      <PageHeader title="Khóa học" description={`${total} khóa học`} />
      <CatalogFilters
        categories={categories}
        levels={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
        initial={{ q: query.q, category: query.category ?? "", level: query.level ?? "", sort: query.sort }}
      />
      {items.length === 0 ? (
        <EmptyState title="Không tìm thấy khóa học phù hợp">
          Thử từ khóa khác (tìm theo từ, không phân biệt dấu) hoặc bỏ bớt bộ lọc.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-2 text-sm">
          {query.page > 1 ? <Link href={pageHref(query.page - 1)} className="rounded border px-3 py-1.5">← Trước</Link> : null}
          <span>
            Trang {query.page}/{pages}
          </span>
          {query.page < pages ? <Link href={pageHref(query.page + 1)} className="rounded border px-3 py-1.5">Sau →</Link> : null}
        </nav>
      ) : null}
    </Container>
  );
}
