import Link from "next/link";
import type { CourseCardDto } from "@/modules/courses/catalog";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import type { ProjectShowcase as Showcase } from "@/modules/site/stats";
import { formatMinutes } from "@/lib/text";
import { CourseCover } from "../course-card";
import { IconArrowRight, IconBook, IconCheck, IconClock, IconPlay, IconRubric, IconUser } from "../icons";
import { Reveal } from "../motion";
import { Badge, buttonClass } from "../ui";
import type { GoalPanel } from "./goal-tabs";
import { coverSrcSet } from "@/lib/images";

type Tech = { slug: string; name: string; type: string; courseCount: number };

/* ---------------- Dải công nghệ ---------------- */
export function TechMarquee({ hubs, planned }: { hubs: Tech[]; planned: { slug: string; name: string }[] }) {
  if (!hubs.length) return null;
  const items = [...hubs.map((h) => ({ ...h, live: true })), ...planned.slice(0, 14).map((p) => ({ ...p, type: "", courseCount: 0, live: false }))];
  const row = (copy: boolean) => (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={copy || undefined}>
      {items.map((t) =>
        t.live ? (
          <li key={t.slug}>
            <Link
              href={`/technologies/${t.slug}`}
              tabIndex={copy ? -1 : undefined}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-brand-200 bg-surface px-4 py-2 text-sm font-bold text-ink shadow-xs transition hover:border-brand-400 hover:text-brand-800"
            >
              <span className="size-2 rounded-full bg-success-600" aria-hidden />
              {t.name}
              <span className="text-xs font-medium text-ink-faint">{t.courseCount} khóa</span>
            </Link>
          </li>
        ) : (
          <li key={t.slug} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-dashed border-line-strong px-4 py-2 text-sm font-medium text-ink-faint">
            {t.name} <span className="text-xs">sắp có</span>
          </li>
        ),
      )}
    </ul>
  );
  return (
    <section aria-label="Công nghệ đang dạy và đang biên soạn" className="border-y border-brand-100 bg-surface/70 py-5 backdrop-blur">
      <div className="marquee overflow-hidden">
        <div className="marquee-track">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Mục tiêu (dữ liệu cho tab) ---------------- */
const GOALS: { key: string; label: string; title: string; description: string; skills: string[]; match: string[]; cta: { href: string; label: string } }[] = [
  {
    key: "frontend",
    label: "Frontend",
    title: "Xây giao diện web nhanh và dễ dùng",
    description: "Từ HTML/CSS/JavaScript tới React và Next.js: component, routing, render ở server, SEO và hiệu năng thật trên điện thoại.",
    skills: ["html", "css", "javascript", "typescript", "react", "nextjs", "vue"],
    match: ["html", "css", "react", "nextjs"],
    cta: { href: "/courses?tech=react", label: "Khóa học frontend" },
  },
  {
    key: "backend",
    label: "Backend & API",
    title: "Viết server, API và xử lý dữ liệu an toàn",
    description: "Node.js, validate ở server, phân quyền, chống injection, biến môi trường và triển khai. Các ngôn ngữ backend khác đang trong lộ trình nội dung.",
    skills: ["nodejs", "typescript", "python", "go", "java", "docker"],
    match: ["nodejs"],
    cta: { href: "/courses?tech=nodejs", label: "Khóa học backend" },
  },
  {
    key: "database",
    label: "Database",
    title: "Thiết kế dữ liệu và truy vấn hiệu quả",
    description: "Mô hình document, nhúng hay tham chiếu, index theo truy vấn thật, quyền tối thiểu và sao lưu.",
    skills: ["mongodb", "sql", "postgresql", "redis"],
    match: ["mongodb", "sql", "postgresql", "mysql", "redis"],
    cta: { href: "/courses?tech=mongodb", label: "Khóa học database" },
  },
  {
    key: "fullstack",
    label: "Full-stack JavaScript",
    title: "Một ngôn ngữ từ giao diện tới database",
    description: "Ghép frontend, backend và database thành một ứng dụng hoàn chỉnh, kết thúc bằng dự án có rubric và portfolio.",
    skills: ["javascript", "react", "nextjs", "nodejs", "mongodb", "git"],
    match: ["javascript", "nextjs", "nodejs", "mongodb"],
    cta: { href: "/paths", label: "Xem lộ trình full-stack" },
  },
];

export function buildGoals(courses: CourseCardDto[], hubs: Tech[], allTech: { slug: string; name: string }[]): GoalPanel[] {
  const hubSet = new Set(hubs.map((h) => h.slug));
  const nameOf = new Map(allTech.map((t) => [t.slug, t.name]));
  return GOALS.map((g) => ({
    key: g.key,
    label: g.label,
    title: g.title,
    description: g.description,
    cta: g.cta,
    skills: g.skills.filter((s) => nameOf.has(s)).map((s) => ({ name: nameOf.get(s)!, href: hubSet.has(s) ? `/technologies/${s}` : null })),
    courses: courses
      .filter((c) => c.technologies.some((t) => g.match.includes(t.slug)))
      .slice(0, 4)
      .map((c) => ({ slug: c.slug, title: c.title, level: LEVEL_LABEL[c.level], lessonCount: c.lessonCount, minutes: Math.round(c.totalDurationSeconds / 60), thumbnailUrl: c.thumbnailUrl })),
  }));
}

/* ---------------- Khóa nổi bật: 1 thẻ lớn + lưới ---------------- */
export function FeaturedEditorial({ courses }: { courses: CourseCardDto[] }) {
  const [lead, ...rest] = courses;
  if (!lead) return null;
  return (
    <div className="space-y-6">
      <Reveal>
        <article className="group relative grid overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-md transition duration-500 hover:shadow-lg md:grid-cols-[1.15fr_1fr]">
          <div className="relative aspect-video overflow-hidden md:aspect-auto md:min-h-[340px]">
            {lead.thumbnailUrl ? (
              <img {...coverSrcSet(lead.thumbnailUrl)} sizes="(min-width: 1024px) 640px, 100vw" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
            ) : (
              <CourseCover title={lead.title} className="absolute inset-0 h-full w-full" />
            )}
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-800 shadow-sm backdrop-blur">
              <IconPlay size={12} /> Có bài học thử
            </span>
          </div>
          <div className="flex flex-col p-7 sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{LEVEL_LABEL[lead.level]}</Badge>
              {lead.categoryName ? <span className="text-caption text-brand-700">{lead.categoryName}</span> : null}
            </div>
            <h3 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
              <Link href={`/courses/${lead.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {lead.title}
              </Link>
            </h3>
            <p className="mt-3 text-ink-soft">{lead.shortDescription}</p>
            {lead.technologies.length ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Công nghệ">
                {lead.technologies.map((t) => (
                  <li key={t.slug} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                    {t.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <IconBook size={16} className="text-brand-600" /> {lead.lessonCount} bài
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconClock size={16} className="text-brand-600" /> {formatMinutes(lead.totalDurationSeconds)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconUser size={16} className="text-brand-600" /> {lead.instructorName}
              </span>
              <span className="relative z-10 ml-auto inline-flex items-center gap-1 font-semibold text-brand-700">
                Xem khóa học <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </article>
      </Reveal>
      {rest.length ? (
        <Reveal group className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((c) => (
            <SmallCourse key={c.id} c={c} />
          ))}
        </Reveal>
      ) : null}
    </div>
  );
}

function SmallCourse({ c }: { c: CourseCardDto }) {
  return (
    <article className="group relative flex overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden">
        {c.thumbnailUrl ? <img {...coverSrcSet(c.thumbnailUrl)} sizes="(min-width: 1024px) 320px, 50vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <CourseCover title={c.title} className="h-full w-full" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
          <p className="text-xs font-semibold opacity-90">{LEVEL_LABEL[c.level]} · {c.lessonCount} bài</p>
          <h3 className="mt-1 font-bold leading-snug">
            <Link href={`/courses/${c.slug}`} className="after:absolute after:inset-0">
              {c.title}
            </Link>
          </h3>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Dự án tiêu biểu ---------------- */
export function ProjectShowcase({ p }: { p: Showcase }) {
  const total = p.rubric.reduce((a, r) => a + r.max, 0) || 1;
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
      <Reveal>
        <p className="text-caption text-brand-700">Dự án cuối khóa · {p.courseTitle}</p>
        <h2 className="mt-2 font-display text-[clamp(2rem,3.6vw,2.8rem)] font-extrabold leading-tight tracking-tight text-ink">{p.title}</h2>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{p.brief}</p>
        {p.objectives.length ? (
          <ul className="mt-6 space-y-2.5">
            {p.objectives.map((o) => (
              <li key={o} className="flex gap-3 text-ink">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <IconCheck size={14} />
                </span>
                {o}
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={`/courses/${p.courseSlug}`} className={buttonClass("primary", "group/btn mt-8", "lg")}>
          Xem khóa có dự án này <IconArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
        </Link>
      </Reveal>
      <Reveal>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-brand-50 to-transparent blur-2xl" aria-hidden />
          <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-lg sm:p-8">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <IconRubric size={18} />
                </span>
                Rubric chấm điểm
              </p>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-800">{total} điểm</span>
            </div>
            <ul className="mt-6 space-y-4">
              {p.rubric.map((r, i) => (
                <li key={r.title}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{r.title}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-ink-faint">{r.max} đ</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-50">
                    <div className="grow-x h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700" style={{ width: `${(r.max / total) * 100}%`, "--d": `${200 + i * 150}ms` } as React.CSSProperties} />
                  </div>
                </li>
              ))}
            </ul>
            {p.checklist.length ? (
              <div className="mt-7 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-surface-muted p-4">
                <p className="text-caption text-ink-faint">Checklist trước khi nộp</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {p.checklist.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-1 size-3.5 shrink-0 rounded border border-line-strong bg-surface" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-5 text-xs text-ink-faint">Nộp link GitHub/demo → tự đánh giá theo rubric → giảng viên phản hồi từng tiêu chí, có thể yêu cầu sửa.</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
