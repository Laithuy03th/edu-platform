import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { myPaths } from "@/modules/learning-paths/service";
import { IconRoute } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader, ProgressBar, buttonClass } from "@/components/ui";

export const metadata = { title: "Lộ trình của tôi" };

export default async function MyPathsPage() {
  const viewer = await requireViewer();
  const paths = await myPaths(viewer);
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title="Lộ trình của tôi" description="Tiến độ tính trên tập bài bắt buộc khả dụng, không đếm trùng bài xuất hiện nhiều lần." />
      {paths.length === 0 ? (
        <EmptyState icon={<IconRoute />} title="Bạn chưa theo lộ trình nào" action={<Link href="/paths" className={buttonClass("primary")}>Chọn lộ trình</Link>} />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {paths.map((p) => (
            <li key={p.slug}>
              <Link href={`/paths/${p.slug}`} className="block rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-h3">{p.title}</p>
                  {p.status === "paused" ? <Badge tone="warning">Tạm dừng</Badge> : null}
                </div>
                <div className="mt-4">
                  <ProgressBar value={p.progress.percent} label={`${p.progress.completed}/${p.progress.total} bài`} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
