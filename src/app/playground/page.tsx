import type { Metadata } from "next";
import { getViewer } from "@/server/auth";
import { parseId } from "@/lib/ids";
import { pageOpenGraph } from "@/lib/seo";
import { getSnippet } from "@/modules/playground/service";
import { Container } from "@/components/ui";
import { PlaygroundTabs } from "./shared";
import { WebPlayground } from "./web-playground";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Playground HTML, CSS, JavaScript trực tuyến";
  const description = "Viết và chạy HTML/CSS/JavaScript ngay trên trình duyệt: trình soạn có gợi ý code và Emmet, xem trước theo cỡ điện thoại/máy tính bảng, console, thử thách có chấm tự động — code chạy trong khung cách ly, không gửi lên server.";
  return { title, description, alternates: { canonical: "/playground" }, openGraph: pageOpenGraph({ title, description, url: "/playground", images: "file" }) };
}

/** P05: playground web. Trang chỉ là khung; code chạy trong iframe sandbox origin opaque (/api/sandbox/runner). */
export default async function PlaygroundPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const [viewer, sp] = await Promise.all([getViewer(), searchParams]);
  const sid = parseId(sp.s);
  // ?s=<id>: chỉ chủ bản lưu mở được (người khác → bỏ qua, không lộ tồn tại)
  const snippet = viewer && sid ? await getSnippet(viewer, sid).catch(() => null) : null;
  return (
    <Container className="max-w-[1500px] py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-caption text-brand-700">Thực hành</p>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold tracking-tight text-ink">Playground HTML · CSS · JavaScript</h1>
          <p className="mt-1.5 text-ink-soft">Gõ code, xem kết quả ngay. Thử thách có chấm tự động, lưu bản code vào tài khoản, chia sẻ bằng link.</p>
        </div>
        <PlaygroundTabs current="web" />
      </div>
      <WebPlayground signedIn={Boolean(viewer)} initialSnippet={snippet && snippet.kind === "web" ? { id: snippet.id, title: snippet.title, files: snippet.files } : null} />
    </Container>
  );
}
