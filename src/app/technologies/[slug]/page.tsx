import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTechnologyHub, DOMAIN_LABEL, TYPE_LABEL } from "@/modules/technologies/service";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import type { Level } from "@/server/db/models";
import { IconArrowRight, IconBook, IconLink, IconRoute } from "@/components/icons";
import { Badge, Card, Container, PageHeader, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/time";
import { JsonLd, breadcrumbLd, pageOpenGraph } from "@/lib/seo";
import { KIND_LABEL, listPublicArticles } from "@/modules/articles/service";
import { safeLoad } from "@/components/safe-load";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9][a-z0-9.+#-]{0,59}$/.test(slug)) return null;
  return getTechnologyHub(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = await load(slug).catch(() => null);
  if (!hub || "redirectTo" in hub) return {};
  const title = `${hub.name} — học ${TYPE_LABEL[hub.type].toLowerCase()} ${hub.name}`;
  const description = hub.description || `Khóa học và lộ trình về ${hub.name}, ghi rõ phiên bản đã kiểm thử.`;
  return { title, description, alternates: { canonical: `/technologies/${hub.slug}` }, openGraph: pageOpenGraph({ title, description, url: `/technologies/${hub.slug}`, images: "file" }) };
}

/** Hub công nghệ (T02): chỉ tồn tại khi có khóa đã xuất bản; alias → 308 về slug chuẩn. */
export default async function TechnologyHubPage({ params }: Props) {
  const { slug } = await params;
  const hub = await load(slug);
  if (!hub) notFound();
  if ("redirectTo" in hub) permanentRedirect(`/technologies/${hub.redirectTo}`);
  const articles = await safeLoad(() => listPublicArticles({ tech: hub.slug, limit: 12 }), []);
  return (
    <div className="bg-grain-warm">
      <JsonLd data={breadcrumbLd([{ name: "Công nghệ", path: "/technologies" }, { name: hub.name, path: `/technologies/${hub.slug}` }])} />
      <Container className="py-10 sm:py-14">
        <PageHeader
          breadcrumb={[{ href: "/technologies", label: "Công nghệ" }, { label: hub.name }]}
          eyebrow={`${TYPE_LABEL[hub.type]} · ${DOMAIN_LABEL[hub.domain]}`}
          title={hub.name}
          description={hub.description || undefined}
          actions={
            hub.officialUrl ? (
              <a href={hub.officialUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", undefined, "sm")}>
                <IconLink size={16} /> Tài liệu chính thức ↗
              </a>
            ) : undefined
          }
        />
        {hub.aliases.length ? <p className="-mt-4 mb-8 text-sm text-ink-faint">Còn gọi là: {hub.aliases.join(", ")}</p> : null}

        {hub.prerequisites.length || hub.next.length ? (
          <section aria-label="Kiến thức liên quan" className="mb-10 grid gap-4 sm:grid-cols-2">
            {[
              { title: "Nên biết trước", items: hub.prerequisites, empty: "Có thể bắt đầu ngay." },
              { title: "Học tiếp sau " + hub.name, items: hub.next, empty: "" },
            ]
              .filter((g) => g.items.length || g.empty)
              .map((g) => (
                <div key={g.title} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                  <h2 className="text-caption text-ink-faint">{g.title}</h2>
                  {g.items.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {g.items.map((x) => (
                        <li key={x.slug}>
                          {x.hasHub ? (
                            <Link href={`/technologies/${x.slug}`} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 transition hover:bg-brand-100">
                              {x.name} <IconArrowRight size={13} />
                            </Link>
                          ) : (
                            <span className="inline-flex rounded-full border border-dashed border-line-strong px-3 py-1 text-sm text-ink-faint" title="Nội dung đang biên soạn">
                              {x.name} · sắp có
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">{g.empty}</p>
                  )}
                </div>
              ))}
          </section>
        ) : null}

        <section aria-labelledby="khoa-hoc">
          <h2 id="khoa-hoc" className="text-h2 flex items-center gap-2 text-ink">
            <IconBook className="text-brand-600" /> Khóa học
          </h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-2">
            {hub.courses.map((c) => (
              <li key={c.slug}>
                <Card interactive className="h-full p-5">
                  <Link href={`/courses/${c.slug}`} className="group flex h-full flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{LEVEL_LABEL[c.level as Level] ?? c.level}</Badge>
                      {c.testedVersion ? (
                        <Badge tone="success" title="Phiên bản giảng viên đã kiểm thử nội dung">
                          {hub.name} {c.testedVersion}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-ink-faint">{c.lessonCount} bài</span>
                    </div>
                    <h3 className="text-h3 mt-3 text-ink group-hover:text-brand-700">{c.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-ink-soft">{c.shortDescription}</p>
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      Xem khóa học <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {hub.paths.length ? (
          <section aria-labelledby="lo-trinh" className="mt-12">
            <h2 id="lo-trinh" className="text-h2 flex items-center gap-2 text-ink">
              <IconRoute className="text-brand-600" /> Lộ trình có {hub.name}
            </h2>
            <ul className="mt-5 space-y-3">
              {hub.paths.map((p) => (
                <li key={p.slug}>
                  <Link href={`/paths/${p.slug}`} className="block rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-brand-200 hover:bg-brand-50/60">
                    <span className="font-semibold text-ink">{p.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{p.goal}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {articles.length ? (
          <section aria-labelledby="huong-dan" className="mt-12">
            <h2 id="huong-dan" className="text-h2 flex items-center gap-2 text-ink">
              <IconLink className="text-brand-600" /> Hướng dẫn & tham khảo
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link href={`/huong-dan/${a.slug}`} className="group block rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-brand-200 hover:bg-brand-50/60">
                    <span className="text-caption text-brand-700">{KIND_LABEL[a.kind]}</span>
                    <span className="mt-0.5 block font-semibold text-ink group-hover:text-brand-800">{a.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{a.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/huong-dan?tech=${hub.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Tất cả bài về {hub.name} <IconArrowRight size={14} />
            </Link>
          </section>
        ) : null}

        <p className="mt-12 text-xs text-ink-faint">Cập nhật nội dung gần nhất: {formatDate(hub.lastUpdated)}</p>
      </Container>
    </div>
  );
}
