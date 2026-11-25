import type { Metadata } from "next";
import { getViewer } from "@/server/auth";
import { parseId } from "@/lib/ids";
import { pageOpenGraph } from "@/lib/seo";
import { getSnippet } from "@/modules/playground/service";
import { Container } from "@/components/ui";
import { PlaygroundTabs } from "../shared";
import { SqlPlayground } from "./sql-playground";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Playground SQL trực tuyến — luyện SQL với SQLite ngay trên trình duyệt";
  const description =
    "Viết và chạy SQL trên dữ liệu mẫu (khóa học, cửa hàng) ngay trong trình duyệt: gợi ý tên bảng/cột, sơ đồ dữ liệu, 12 thử thách chấm tự động, xuất CSV, mở tệp .sqlite của bạn — không gửi dữ liệu lên server.";
  return { title, description, alternates: { canonical: "/playground/sql" }, openGraph: pageOpenGraph({ title, description, url: "/playground/sql" }) };
}

/** P06: SQL chạy trong trình duyệt (sql.js/SQLite WASM ~750 KB, chỉ tải khi mở trang này, trong Web Worker). */
export default async function SqlPlaygroundPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const [viewer, sp] = await Promise.all([getViewer(), searchParams]);
  const sid = parseId(sp.s);
  // ?s=<id>: chỉ chủ bản lưu mở được (người khác → bỏ qua, không lộ tồn tại)
  const snippet = viewer && sid ? await getSnippet(viewer, sid).catch(() => null) : null;
  return (
    <Container className="max-w-[1500px] py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-caption text-brand-700">Thực hành</p>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold tracking-tight text-ink">Playground SQL</h1>
          <p className="mt-1.5 text-ink-soft">SQLite chạy ngay trong trình duyệt của bạn. Hai bộ dữ liệu mẫu, thử thách chấm tự động, lịch sử truy vấn, xuất CSV — không cần cài đặt gì.</p>
        </div>
        <PlaygroundTabs current="sql" />
      </div>
      <SqlPlayground signedIn={Boolean(viewer)} initialSnippet={snippet && snippet.kind === "sql" ? { id: snippet.id, title: snippet.title, files: snippet.files } : null} />
    </Container>
  );
}
