import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbLd } from "@/lib/seo";

export const INFO_PAGES = [
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/dieu-khoan-su-dung", label: "Điều khoản sử dụng" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

/** Khung trang thông tin (giới thiệu, chính sách, điều khoản, liên hệ): tiêu đề, ngày cập nhật, nội dung prose, liên kết chéo. */
export function InfoPage({ path, eyebrow, title, lead, updated, children }: { path: string; eyebrow: string; title: string; lead?: ReactNode; updated?: string; children: ReactNode }) {
  return (
    <div className="bg-grain-warm">
      <JsonLd data={breadcrumbLd([{ name: title, path }])} />
      <Container className="max-w-3xl py-12 sm:py-16">
        <p className="text-caption text-brand-700">{eyebrow}</p>
        <h1 className="text-display mt-2 text-[clamp(2rem,1.5rem+2vw,2.75rem)]">{title}</h1>
        {lead ? <p className="mt-4 text-lg text-ink-soft">{lead}</p> : null}
        {updated ? <p className="mt-3 text-sm text-ink-faint">Cập nhật lần cuối: {updated}</p> : null}
        <article className="prose mt-8 max-w-none prose-headings:font-display prose-h2:mt-10 prose-h2:text-xl prose-a:text-brand-700">{children}</article>
        <nav aria-label="Thông tin về Tự Học" className="mt-12 flex flex-wrap gap-2 border-t border-line pt-6 text-sm">
          {INFO_PAGES.map((p) =>
            p.href === path ? (
              <span key={p.href} aria-current="page" className="rounded-full bg-brand-700 px-4 py-1.5 font-semibold text-white">
                {p.label}
              </span>
            ) : (
              <Link key={p.href} href={p.href} className="rounded-full border border-line bg-surface px-4 py-1.5 font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-700">
                {p.label}
              </Link>
            ),
          )}
        </nav>
      </Container>
    </div>
  );
}
