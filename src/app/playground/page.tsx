import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/seo";
import Link from "next/link";
import { Container } from "@/components/ui";
import { Playground } from "./playground";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Playground HTML, CSS, JavaScript";
  const description = "Viết và chạy thử HTML/CSS/JavaScript ngay trên trình duyệt, xem kết quả và console — code chạy trong khung cách ly, không gửi lên server.";
  return { title, description, alternates: { canonical: "/playground" }, openGraph: pageOpenGraph({ title, description, url: "/playground" }) };
}

/** P05: playground cách ly. Trang này chỉ là khung; code chạy trong iframe sandbox origin opaque (/api/sandbox/runner). */
export default function PlaygroundPage() {
  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Loại playground" className="mb-4 flex gap-2 text-sm">
        <span aria-current="page" className="rounded-full border border-brand-700 bg-brand-700 px-4 py-1.5 font-semibold text-white">
          HTML/CSS/JS
        </span>
        <Link href="/playground/sql" className="rounded-full border border-line bg-surface px-4 py-1.5 font-semibold text-ink-soft hover:border-brand-300">
          SQL
        </Link>
      </nav>
      <div className="mb-6 max-w-3xl">
        <p className="text-caption text-brand-700">Thực hành</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,4vw,2.75rem)] font-extrabold tracking-tight text-ink">Playground HTML, CSS, JavaScript</h1>
        <p className="mt-2 text-ink-soft">
          Code chạy trong một khung cách ly trên chính trình duyệt của bạn: không đọc được tài khoản/cookie của trang, không gọi được mạng, không gửi lên server. Bản nháp tự lưu trên máy này.
        </p>
      </div>
      <Playground />
    </Container>
  );
}
