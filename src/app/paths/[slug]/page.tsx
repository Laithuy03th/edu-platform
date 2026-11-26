import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/server/auth";
import { getPathDetail } from "@/modules/learning-paths/service";
import { formatMinutes } from "@/lib/text";
import { IconBook, IconCheck, IconRoute, IconTarget } from "@/components/icons";
import { Badge, Container, ProgressBar, buttonClass, cn } from "@/components/ui";
import { PathEnrollButtons } from "./enroll";
import { JsonLd, breadcrumbLd, pageOpenGraph, robotsUnless } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getPathDetail(slug, null).catch(() => null);
  if (!d) return { title: "Không tìm thấy lộ trình" };
  const url = `/paths/${d.path.slug}`;
  return {
    title: d.path.title,
    description: d.path.goal,
    alternates: { canonical: url },
    ...robotsUnless(d.path.status === "published"),
    openGraph: pageOpenGraph({ title: d.path.title, description: d.path.goal, url, images: "file" }),
  };
}

export default async function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();
  const d = await getPathDetail(slug, viewer);
  if (!d) notFound();
  const totalSeconds = d.items.filter((i) => i.required && i.available).reduce((s, i) => s + i.durationSeconds, 0);
  return (
    <div className="bg-grain-warm">
      <JsonLd data={breadcrumbLd([{ name: "Lộ trình", path: "/paths" }, { name: d.path.title, path: `/paths/${d.path.slug}` }])} />
      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Link href="/paths" className="text-sm font-semibold text-brand-700 hover:underline">
            ← Lộ trình
          </Link>
          <div className="mt-4 animate-fade-up">
            {d.path.status !== "published" ? <Badge tone="warning">Bản nháp — chỉ người soạn thấy</Badge> : null}
            <h1 className="text-display mt-2 text-[clamp(2rem,1.4rem+2.2vw,3rem)]">{d.path.title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-ink-soft">{d.path.goal}</p>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
              <dt className="text-xs text-ink-faint">Dành cho</dt>
              <dd className="mt-1 text-sm font-medium">{d.path.audience || "Mọi người"}</dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
              <dt className="text-xs text-ink-faint">Kiến thức đầu vào</dt>
              <dd className="mt-1 text-sm font-medium">{d.path.prerequisites || "Không yêu cầu"}</dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
              <dt className="text-xs text-ink-faint">Thời gian ước tính (phần bắt buộc)</dt>
              <dd className="mt-1 text-sm font-medium">~{formatMinutes(totalSeconds)}</dd>
            </div>
          </dl>

          <h2 className="text-h2 mb-6 mt-12">Các bước</h2>
          <ol className="relative space-y-4 border-l-2 border-brand-100 pl-8">
            {d.items.map((it, i) => {
              const done = it.lessonIds.length > 0 && it.doneCount === it.lessonIds.length;
              return (
                <li key={it.itemId} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[2.85rem] top-4 grid size-9 place-items-center rounded-full border-4 border-canvas text-sm font-bold",
                      !it.available ? "bg-line text-ink-faint" : done ? "bg-success-600 text-white" : it.kind === "milestone" ? "bg-brand-700 text-white" : "bg-brand-100 text-brand-800",
                    )}
                  >
                    {done ? <IconCheck size={16} /> : it.kind === "milestone" ? <IconTarget size={16} /> : i + 1}
                  </span>
                  <div className={cn("rounded-[var(--radius-lg)] border p-5 transition", it.kind === "milestone" ? "border-brand-200 bg-brand-50/70" : "border-line bg-surface", !it.available && "opacity-70")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={it.kind === "milestone" ? "brand" : "neutral"}>{it.kind === "course" ? "Khóa học" : it.kind === "chapter" ? "Chương" : it.kind === "lesson" ? "Bài học" : "Cột mốc"}</Badge>
                      {it.kind !== "milestone" ? <Badge tone={it.required ? "info" : "neutral"}>{it.required ? "Bắt buộc" : "Tùy chọn"}</Badge> : null}
                      {!it.available ? <Badge tone="warning">{it.note ?? "Không khả dụng"}</Badge> : null}
                    </div>
                    <p className="mt-2 font-semibold">{it.href && it.available ? <Link href={it.href} className="hover:text-brand-700 hover:underline">{it.title}</Link> : it.title}</p>
                    {it.kind !== "milestone" && it.available ? (
                      <p className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
                        <span className="inline-flex items-center gap-1"><IconBook size={13} /> {it.lessonIds.length} bài</span>
                        <span>~{formatMinutes(it.durationSeconds)}</span>
                        {viewer ? <span>Đã học {it.doneCount}/{it.lessonIds.length}</span> : null}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <aside>
          <div className="space-y-4 rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-24">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
              <IconRoute />
            </span>
            {d.progress ? <ProgressBar value={d.progress.percent} label={`${d.progress.completed}/${d.progress.total} bài bắt buộc (không đếm trùng)`} /> : null}
            {viewer ? (
              <PathEnrollButtons pathId={d.path._id.toHexString()} status={d.enrollment?.status ?? null} verified={viewer.emailVerified} />
            ) : (
              <Link href={`/login?callbackUrl=/paths/${slug}`} className={buttonClass("primary", "w-full")}>
                Đăng nhập để theo lộ trình
              </Link>
            )}
            <p className="text-xs text-ink-faint">Tham gia lộ trình không tự đăng ký các khóa học — bạn đăng ký từng khóa khi bắt đầu.</p>
          </div>
        </aside>
      </Container>
    </div>
  );
}
