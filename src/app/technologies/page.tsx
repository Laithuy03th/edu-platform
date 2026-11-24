import Link from "next/link";
import type { Metadata } from "next";
import { getTechnologyDirectory, DOMAIN_LABEL, TYPE_LABEL } from "@/modules/technologies/service";
import { IconArrowRight, IconRoute } from "@/components/icons";
import { Badge, Card, Container, EmptyState, PageHeader } from "@/components/ui";
import { safeLoad } from "@/components/safe-load";
import { JsonLd, breadcrumbLd, pageOpenGraph } from "@/lib/seo";

const description = "Học theo công nghệ: ngôn ngữ, framework, runtime và database — mỗi trang chỉ xuất hiện khi đã có khóa học thật.";
export const metadata: Metadata = {
  title: "Công nghệ",
  description,
  alternates: { canonical: "/technologies" },
  openGraph: pageOpenGraph({ title: "Công nghệ", description, url: "/technologies" }),
};

export default async function TechnologiesPage() {
  const dir = await safeLoad(() => getTechnologyDirectory(), { hubs: [], planned: [] });
  const byDomain = Map.groupBy(dir.planned, (t) => t.domain);
  return (
    <div className="bg-grain-warm">
      <JsonLd data={breadcrumbLd([{ name: "Công nghệ", path: "/technologies" }])} />
      <Container className="py-10 sm:py-14">
        <PageHeader eyebrow="Thư viện" title="Học theo công nghệ" description={description} />

        {dir.hubs.length === 0 ? (
          <EmptyState title="Chưa có trang công nghệ nào">Trang công nghệ chỉ được mở khi có ít nhất một khóa học đã xuất bản.</EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dir.hubs.map((t) => (
              <li key={t.slug}>
                <Card interactive className="h-full p-5">
                  <Link href={`/technologies/${t.slug}`} className="group flex h-full flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{TYPE_LABEL[t.type]}</Badge>
                      <Badge>{DOMAIN_LABEL[t.domain]}</Badge>
                    </div>
                    <h2 className="text-h3 mt-3 text-ink group-hover:text-brand-700">{t.name}</h2>
                    <p className="mt-1 line-clamp-3 flex-1 text-sm text-ink-soft">{t.description}</p>
                    <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      {t.courseCount} khóa học <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {dir.planned.length ? (
          <section className="mt-16" aria-labelledby="roadmap">
            <h2 id="roadmap" className="text-h2 flex items-center gap-2 text-ink">
              <IconRoute className="text-brand-600" /> Lộ trình nội dung
            </h2>
            <p className="mt-2 max-w-2xl text-ink-soft">
              Các công nghệ dưới đây đã có trong bản đồ kiến thức nhưng <strong>chưa có nội dung được xuất bản</strong>. Chúng không có trang riêng cho tới khi có bài học đã review.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...byDomain.entries()].map(([domain, items]) => (
                <div key={domain}>
                  <h3 className="text-caption text-ink-faint">{DOMAIN_LABEL[domain]}</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {items.map((t) => (
                      <li key={t.slug}>
                        <Badge title={`${TYPE_LABEL[t.type]} — đang lên kế hoạch`}>{t.name}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
