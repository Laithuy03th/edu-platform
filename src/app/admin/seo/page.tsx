import Link from "next/link";
import { requireRole } from "@/server/auth";
import { seoAudit, type Check } from "@/modules/admin/seo";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Kiểm tra SEO" };

const ICON: Record<Check["level"], string> = { ok: "✓", warn: "!", error: "✗" };
const TONE: Record<Check["level"], string> = { ok: "text-success-700", warn: "text-warning-700", error: "text-danger-700" };

function CheckLine({ c }: { c: Check }) {
  return (
    <li className="flex gap-2 text-sm">
      <span aria-hidden className={`w-4 shrink-0 text-center font-bold ${TONE[c.level]}`}>
        {ICON[c.level]}
      </span>
      <span>
        <span className="sr-only">{c.level === "ok" ? "Đạt: " : c.level === "warn" ? "Cần xem: " : "Lỗi: "}</span>
        <span className={c.level === "ok" ? "text-ink-soft" : "font-medium text-ink"}>{c.label}</span>
        {c.detail ? <span className="block text-xs text-ink-faint">{c.detail}</span> : null}
      </span>
    </li>
  );
}

/** S02–S09: kiểm tra cấu hình SEO và chất lượng metadata của nội dung đã xuất bản (chỉ đọc). */
export default async function AdminSeoPage() {
  const admin = await requireRole("admin");
  const r = await seoAudit(admin);
  const needs = r.items.filter((i) => i.checks.some((k) => k.level !== "ok"));
  return (
    <>
      <PageHeader
        title="Kiểm tra SEO"
        description="Cấu hình môi trường và chất lượng metadata của khóa học, bài hướng dẫn đã xuất bản. Không hứa thứ hạng — đây là danh sách việc nên làm."
        actions={
          <a href="/sitemap.xml" target="_blank" rel="noopener" className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-soft hover:border-brand-300">
            Mở sitemap.xml
          </a>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Khóa học trong sitemap" value={r.sitemap.courses} />
        <Stat label="Bài hướng dẫn trong sitemap" value={r.sitemap.articles} />
        <Stat label="Mục cần xem" value={r.issues} hint={`${needs.length}/${r.items.length} trang có gợi ý cải thiện`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="text-lg font-semibold">Cấu hình site</h2>
          <p className="mt-1 text-sm text-ink-faint">Domain gốc: {r.appUrl}</p>
          <ul className="mt-4 space-y-2.5">
            {r.env.map((c, i) => (
              <CheckLine key={i} c={c} />
            ))}
          </ul>
          <p className="mt-5 text-xs text-ink-faint">Khi deploy: xác minh Search Console, gửi sitemap, theo dõi Core Web Vitals và trang bị loại khỏi chỉ mục — các bước ghi trong docs/SEARCH_CONSOLE.md.</p>
        </Card>
        <div className="space-y-4">
          {r.items.length === 0 ? <Card className="text-sm text-ink-soft">Chưa có nội dung nào được xuất bản.</Card> : null}
          {[...needs, ...r.items.filter((i) => !needs.includes(i))].map((it) => {
            const bad = it.checks.filter((k) => k.level !== "ok").length;
            return (
              <Card key={it.url}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={it.kind === "course" ? "brand" : "info"}>{it.kind === "course" ? "Khóa học" : "Hướng dẫn"}</Badge>
                  <h3 className="min-w-0 flex-1 font-semibold">
                    <Link href={it.url} className="hover:text-brand-700">
                      {it.title}
                    </Link>
                  </h3>
                  {bad ? <Badge tone="warning">{bad} gợi ý</Badge> : <Badge tone="success">Đạt</Badge>}
                  <Link href={it.editUrl} className="text-sm font-semibold text-brand-700 hover:underline">
                    Sửa →
                  </Link>
                </div>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {it.checks.map((c, i) => (
                    <CheckLine key={i} c={c} />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
