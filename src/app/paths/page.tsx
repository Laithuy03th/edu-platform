import Link from "next/link";
import { listPublishedPaths } from "@/modules/learning-paths/service";
import { Reveal } from "@/components/motion";
import { IconArrowRight, IconRoute } from "@/components/icons";
import { Container, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Lộ trình theo mục tiêu", description: "Các lộ trình học ghép khóa, chương và cột mốc theo thứ tự đề xuất." };

export default async function PathsPage() {
  const paths = await listPublishedPaths();
  return (
    <div className="bg-grain-warm">
      <Container className="py-10 sm:py-14">
        <PageHeader eyebrow="Lộ trình" title="Học theo mục tiêu" description="Chọn mục tiêu, theo thứ tự đề xuất. Thời gian ước tính tính từ thời lượng bài học thật — không hứa kết quả việc làm." />
        {paths.length === 0 ? (
          <EmptyState icon={<IconRoute />} title="Chưa có lộ trình nào" />
        ) : (
          <Reveal group className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paths.map((p) => (
              <Link key={p.id} href={`/paths/${p.slug}`} className="group flex flex-col rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-transform group-hover:rotate-6">
                  <IconRoute />
                </span>
                <h2 className="text-h3 mt-4">{p.title}</h2>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{p.goal}</p>
                {p.audience ? <p className="mt-3 text-xs text-ink-faint">Dành cho: {p.audience}</p> : null}
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                  Xem lộ trình · {p.itemCount} mục <IconArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </Reveal>
        )}
      </Container>
    </div>
  );
}
