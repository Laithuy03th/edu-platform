import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicArticle, KIND_LABEL } from "@/modules/articles/service";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import { formatDate } from "@/lib/time";
import { JsonLd, articleLd, breadcrumbLd, pageOpenGraph } from "@/lib/seo";
import { extractToc, LessonMarkdown } from "@/components/lesson-markdown";
import { IconArrowRight, IconBook, IconCheck, IconTerminal } from "@/components/icons";
import { Alert, Badge, Container } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return null;
  return getPublicArticle(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await load(slug).catch(() => null);
  if (!a || "redirectTo" in a) return {};
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: `/huong-dan/${a.slug}` },
    openGraph: { ...pageOpenGraph({ title: a.title, description: a.summary, url: `/huong-dan/${a.slug}`, images: "file" }), type: "article", publishedTime: a.publishedAt, modifiedTime: a.contentUpdatedAt },
    ...(a.archived ? { robots: { index: false, follow: true } } : {}),
  };
}

/** T05: bài công khai — mục lục, anchor, code copy, breadcrumb, bài/khóa liên quan; slug cũ → 308. */
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await load(slug);
  if (!a) notFound();
  if ("redirectTo" in a) permanentRedirect(`/huong-dan/${a.redirectTo}`);
  const toc = extractToc(a.content);
  return (
    <div className="bg-grain-warm">
      <JsonLd
        data={[
          articleLd({ slug: a.slug, title: a.title, summary: a.summary, authorName: a.authorName, publishedAt: a.publishedAt, contentUpdatedAt: a.contentUpdatedAt, technologies: a.technologies.map((t) => t.name) }),
          breadcrumbLd([
            { name: "Hướng dẫn", path: "/huong-dan" },
            { name: a.title, path: `/huong-dan/${a.slug}` },
          ]),
        ]}
      />
      <Container className="py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-faint">
          <Link href="/huong-dan" className="hover:text-brand-700">
            Hướng dẫn
          </Link>{" "}
          /{" "}
          <Link href={`/huong-dan?loai=${a.kind}`} className="hover:text-brand-700">
            {KIND_LABEL[a.kind]}
          </Link>
        </nav>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0">
            <header className="animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{KIND_LABEL[a.kind]}</Badge>
                <Badge>{LEVEL_LABEL[a.level]}</Badge>
                {a.technologies.map((t) => (
                  <Link key={t.slug} href={`/technologies/${t.slug}`} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-800">
                    {t.name}
                  </Link>
                ))}
              </div>
              <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.1] tracking-tight text-ink">{a.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">{a.summary}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
                <span>{a.authorName}</span>·<span>Cập nhật nội dung {formatDate(a.contentUpdatedAt)}</span>·
                {a.contentReview ? (
                  <Badge tone={a.contentReview.outdated ? "warning" : "success"}>
                    {a.contentReview.outdated ? "Đã đổi sau lần review" : `Review chuyên môn: ${a.contentReview.reviewerName}`}
                  </Badge>
                ) : (
                  <Badge tone="warning">Chưa review chuyên môn</Badge>
                )}
              </p>
            </header>
            {a.archived ? (
              <Alert tone="warning" className="mt-6">
                Bài đã được lưu trữ và có thể lỗi thời so với phiên bản mới.
              </Alert>
            ) : null}
            {a.testedOn.length ? (
              <section aria-label="Môi trường đã chạy thử" className="mt-8 rounded-[var(--radius-lg)] border border-success-200 bg-success-50/60 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-success-700">
                  <IconCheck size={16} /> Đã chạy thử các lệnh/code trong bài trên
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {a.testedOn.map((t) => (
                    <li key={t.os + t.testedAt} className="flex flex-wrap gap-x-2">
                      <span className="font-semibold">{t.os}</span>
                      <span className="text-ink-soft">{t.tools}</span>
                      <span className="text-ink-faint">({formatDate(t.testedAt)})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-faint">Môi trường khác chưa được kiểm chứng — kết quả có thể khác.</p>
              </section>
            ) : null}
            {toc.length >= 3 ? (
              <nav aria-label="Mục lục" className="mt-8 rounded-[var(--radius-md)] border border-line bg-surface px-5 py-4 text-sm lg:hidden">
                <p className="mb-2 font-semibold text-ink">Trong bài này</p>
                <ol className="space-y-1">
                  {toc.map((t) => (
                    <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                      <a href={`#${t.id}`} className="text-ink-soft hover:text-brand-700">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <div className="mt-8 text-[1.0625rem] leading-[1.8]">
              <LessonMarkdown>{a.content}</LessonMarkdown>
            </div>

            {a.relatedCourses.length || a.related.length ? (
              <section aria-labelledby="tiep-theo" className="mt-14 border-t border-line pt-8">
                <h2 id="tiep-theo" className="text-h3">
                  Học tiếp
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {a.relatedCourses.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/courses/${c.slug}`} className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-brand-300 hover:shadow-sm">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                          <IconBook size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-caption text-brand-700">Khóa học · {LEVEL_LABEL[c.level]}</span>
                          <span className="block font-semibold text-ink">{c.title}</span>
                        </span>
                        <IconArrowRight size={16} className="text-brand-600 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </li>
                  ))}
                  {a.related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/huong-dan/${r.slug}`} className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-brand-300 hover:shadow-sm">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-brand-700">
                          <IconTerminal size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-caption text-ink-faint">{KIND_LABEL[r.kind]}</span>
                          <span className="block font-semibold text-ink">{r.title}</span>
                        </span>
                        <IconArrowRight size={16} className="text-brand-600 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          {toc.length ? (
            <aside className="hidden lg:block">
              <nav aria-label="Mục lục" className="sticky top-24 rounded-[var(--radius-lg)] border border-line bg-surface/90 p-5 text-sm shadow-xs backdrop-blur">
                <p className="text-caption mb-3 text-ink-faint">Trong bài này</p>
                <ol className="space-y-2 border-l border-line">
                  {toc.map((t) => (
                    <li key={t.id} className={t.level === 3 ? "pl-6" : "pl-3"}>
                      <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-2 text-ink-soft transition hover:border-brand-500 hover:text-brand-700">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
