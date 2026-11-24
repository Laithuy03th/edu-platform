import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/modules/achievements/service";
import { formatDate } from "@/lib/time";
import { Avatar } from "@/components/avatar";
import { IconCheck, IconSparkle } from "@/components/icons";
import { Container } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await getPublicProfile(handle).catch(() => null);
  // Không tìm thấy: notFound() đã tự thêm noindex — không khai báo lặp.
  return p ? { title: `${p.displayName} — Hồ sơ thành quả`, alternates: { canonical: `/u/${handle}` } } : { title: "Không tìm thấy hồ sơ" };
}

/** Hồ sơ công khai: CHỈ mục người dùng chọn; không email, điểm chi tiết, ghi chú. */
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await getPublicProfile(handle);
  if (!p) notFound();
  return (
    <div className="bg-grain-warm">
      <Container className="max-w-4xl py-12 sm:py-16">
        <header className="flex animate-fade-up flex-col items-center text-center">
          <div className="rounded-full p-1.5 ring-4 ring-brand-100">
            <Avatar name={p.displayName} size={96} />
          </div>
          <h1 className="text-h1 mt-4">{p.displayName}</h1>
          {p.bio ? <p className="mt-2 max-w-xl text-ink-soft">{p.bio}</p> : null}
          <p className="mt-3 text-xs text-ink-faint">Hồ sơ thành quả trên Tự Học · Kỹ năng là kỹ năng đã thực hành, không phải chứng nhận kiểm định.</p>
        </header>
        {p.skills.length ? (
          <section className="mt-10 flex flex-wrap justify-center gap-2">
            {p.skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-surface px-3 py-1.5 text-sm font-semibold text-brand-800">
                <IconSparkle size={14} /> {s}
              </span>
            ))}
          </section>
        ) : null}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <section>
            <h2 className="text-h3 mb-3">Khóa học đã hoàn thành</h2>
            {p.courses.length ? (
              <ul className="space-y-3">
                {p.courses.map((c) => (
                  <li key={c.slug} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4">
                    <span className="grid size-9 place-items-center rounded-full bg-success-600 text-white">
                      <IconCheck size={16} />
                    </span>
                    <div>
                      <Link href={`/courses/${c.slug}`} className="font-semibold hover:text-brand-700">
                        {c.title}
                      </Link>
                      <p className="text-xs text-ink-faint">{formatDate(c.completedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">Chưa chia sẻ khóa học nào.</p>
            )}
          </section>
          <section>
            <h2 className="text-h3 mb-3">Dự án</h2>
            {p.projects.length ? (
              <ul className="space-y-3">
                {p.projects.map((pr) => (
                  <li key={pr.title + pr.repoUrl} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
                    <p className="font-semibold">{pr.title}</p>
                    <p className="mt-1 flex gap-3 text-sm">
                      {pr.repoUrl ? (
                        <a href={pr.repoUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-brand-700 underline">
                          Mã nguồn
                        </a>
                      ) : null}
                      {pr.demoUrl ? (
                        <a href={pr.demoUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-brand-700 underline">
                          Demo
                        </a>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">Chưa chia sẻ dự án nào.</p>
            )}
          </section>
        </div>
      </Container>
    </div>
  );
}
