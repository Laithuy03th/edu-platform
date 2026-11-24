import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo";
import { Container } from "@/components/ui";
import { SqlPlayground } from "./sql-playground";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Playground SQL (SQLite trong trình duyệt)";
  const description = "Viết và chạy câu lệnh SQL trên một cơ sở dữ liệu mẫu ngay trong trình duyệt — SQLite biên dịch sang WebAssembly, không gửi dữ liệu lên server.";
  return { title, description, alternates: { canonical: "/playground/sql" }, openGraph: pageOpenGraph({ title, description, url: "/playground/sql" }) };
}

/** P06: SQL chạy trong trình duyệt (sql.js/SQLite WASM ~750 KB, chỉ tải khi mở trang này). Python: roadmap. */
export default function SqlPlaygroundPage() {
  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Loại playground" className="mb-4 flex gap-2 text-sm">
        <Link href="/playground" className="rounded-full border border-line bg-surface px-4 py-1.5 font-semibold text-ink-soft hover:border-brand-300">
          HTML/CSS/JS
        </Link>
        <span aria-current="page" className="rounded-full border border-brand-700 bg-brand-700 px-4 py-1.5 font-semibold text-white">
          SQL
        </span>
      </nav>
      <div className="mb-6 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-extrabold tracking-tight text-ink">Playground SQL</h1>
        <p className="mt-2 text-ink-soft">
          SQLite chạy ngay trong trình duyệt của bạn (WebAssembly, ~750 KB, chỉ tải khi mở trang này). Dữ liệu mẫu nằm trong bộ nhớ — tải lại trang là về ban đầu, không có gì gửi lên server.
        </p>
      </div>
      <SqlPlayground />
    </Container>
  );
}
