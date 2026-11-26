import type { Metadata } from "next";
import { getViewer } from "@/server/auth";
import { parseId } from "@/lib/ids";
import { pageOpenGraph } from "@/lib/seo";
import { getSnippet } from "@/modules/playground/service";
import { Container } from "@/components/ui";
import { PlaygroundTabs } from "../shared";
import { PythonPlayground } from "./python-playground";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Playground Python trực tuyến — chạy Python 3 ngay trên trình duyệt";
  const description =
    "Viết và chạy Python 3 miễn phí ngay trên trình duyệt, không cần cài đặt: input(), numpy, pandas, vẽ biểu đồ matplotlib, thử thách chấm tự động, lưu và chia sẻ code — chạy trong khung cách ly an toàn.";
  return { title, description, alternates: { canonical: "/playground/python" }, openGraph: pageOpenGraph({ title, description, url: "/playground/python", images: "file" }) };
}

/** P06 phần Python: Pyodide (CPython → WebAssembly) chạy trong Web Worker của khung cách ly /api/sandbox/python. */
export default async function PythonPlaygroundPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const [viewer, sp] = await Promise.all([getViewer(), searchParams]);
  const sid = parseId(sp.s);
  // ?s=<id>: chỉ chủ bản lưu mở được (người khác → bỏ qua, không lộ tồn tại)
  const snippet = viewer && sid ? await getSnippet(viewer, sid).catch(() => null) : null;
  return (
    <Container className="max-w-[1500px] py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-caption text-brand-700">Thực hành</p>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold tracking-tight text-ink">Playground Python</h1>
          <p className="mt-1.5 text-ink-soft">Python 3 chạy ngay trong trình duyệt — có input(), numpy, pandas, matplotlib. Thử thách chấm tự động, lưu bản code, chia sẻ bằng link.</p>
        </div>
        <PlaygroundTabs current="python" />
      </div>
      <PythonPlayground signedIn={Boolean(viewer)} initialSnippet={snippet && snippet.kind === "python" ? { id: snippet.id, title: snippet.title, files: snippet.files } : null} />
    </Container>
  );
}
