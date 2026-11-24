import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLE_KINDS, type ArticleKind } from "@/server/db/models";
import { KIND_LABEL, listPublicArticles } from "@/modules/articles/service";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import { formatDate } from "@/lib/time";
import { pageOpenGraph } from "@/lib/seo";
import { safeLoad } from "@/components/safe-load";
import { Reveal } from "@/components/motion";
import { IconArrowRight, IconBook } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader } from "@/components/ui";

type SP = { loai?: string; tech?: string };
const parseKind = (v?: string) => (ARTICLE_KINDS as readonly string[]).includes(v ?? "") ? (v as ArticleKind) : null;
const parseTech = (v?: string) => (typeof v === "string" && /^[a-z0-9.+#-]{1,60}$/.test(v) ? v : null);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Boolean(parseKind(sp.loai) || parseTech(sp.tech));
  const title = "Hướng dẫn & tham khảo lập trình";
  const description = "Bài hướng dẫn, cài đặt môi trường, xử lý lỗi và cheatsheet bằng tiếng Việt — ghi rõ phiên bản và môi trường đã chạy thử.";
  return {
    title,
    description,
    alternates: { canonical: "/huong-dan" },
    openGraph: pageOpenGraph({ title, description, url: "/huong-dan" }),
    // Trang lọc: noindex,follow — tránh nhân bản nội dung theo query (giống catalog).
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ArticlesIndex({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const kind = parseKind(sp.loai);
  const tech = parseTech(sp.tech);
  const items = await safeLoad(() => listPublicArticles({ kind, tech, limit: 100 }), []);
  const tabs: { k: ArticleKind | null; label: string }[] = [{ k: null, label: "Tất cả" }, ...ARTICLE_KINDS.map((k) => ({ k, label: KIND_LABEL[k] }))];
  return (
    <div className="bg-grain-warm">
      <Container className="py-10 sm:py-14">
        <PageHeader eyebrow="Kho kiến thức" title="Hướng dẫn & tham khảo" description="Bài ngắn, đi thẳng vào việc: cài môi trường, xử lý lỗi thường gặp, tra cứu nhanh. Mỗi bài ghi phiên bản và môi trường đã chạy thử." />
        <nav aria-label="Loại bài" className="mb-8 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const href = `/huong-dan${t.k ? `?loai=${t.k}` : ""}${tech ? `${t.k ? "&" : "?"}tech=${tech}` : ""}`;
            const active = t.k === kind;
            return (
              <Link key={t.label} href={href} aria-current={active ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-brand-700 bg-brand-700 text-white shadow-cta" : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-ink"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        {tech ? (
          <p className="-mt-4 mb-6 text-sm text-ink-soft">
            Đang lọc theo công nghệ <strong>{tech}</strong> ·{" "}
            <Link href={kind ? `/huong-dan?loai=${kind}` : "/huong-dan"} className="font-semibold text-brand-700 hover:underline">
              bỏ lọc
            </Link>
          </p>
        ) : null}
        {items.length === 0 ? (
          <EmptyState icon={<IconBook />} title="Chưa có bài phù hợp">
            Bài mới được xuất bản sau khi duyệt nội dung.
          </EmptyState>
        ) : (
          <Reveal group as="ul" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <li key={a.slug}>
                <article className="group relative flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-xs transition duration-[var(--duration-ui)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{KIND_LABEL[a.kind]}</Badge>
                    <span className="text-xs text-ink-faint">{LEVEL_LABEL[a.level]}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold leading-snug text-ink">
                    <Link href={`/huong-dan/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-brand-800">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{a.summary}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-ink-faint">
                    {a.technologies.slice(0, 3).map((t) => (
                      <span key={t.slug} className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-800">
                        {t.name}
                      </span>
                    ))}
                    <span className="ml-auto">Cập nhật {formatDate(a.contentUpdatedAt)}</span>
                  </div>
                  <IconArrowRight size={18} className="absolute right-5 top-6 text-brand-600 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </article>
              </li>
            ))}
          </Reveal>
        )}
      </Container>
    </div>
  );
}
