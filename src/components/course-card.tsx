import Link from "next/link";
import type { CourseCardDto } from "@/modules/courses/catalog";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import { formatMinutes } from "@/lib/text";
import { IconBook, IconClock, IconUser } from "./icons";
import { Badge } from "./ui";
import { coverSrcSet } from "@/lib/images";

export function Stars({ value, count }: { value: number; count: number }) {
  if (count === 0) return <span className="text-xs text-ink-faint">Chưa có đánh giá</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink" aria-label={`Đánh giá ${value.toFixed(1)} trên 5 từ ${count} lượt`}>
      <span className="text-amber-500" aria-hidden>
        ★
      </span>
      {value.toFixed(1).replace(".", ",")} <span className="font-normal text-ink-faint">({count})</span>
    </span>
  );
}

/** Ảnh bìa dự phòng: hoa văn CSS theo tên khóa (không request ảnh). */
export function CourseCover({ title, className }: { title: string; className?: string }) {
  const hash = [...title].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const variants = [
    "from-brand-200 via-brand-100 to-brand-50",
    "from-brand-300 via-brand-100 to-white",
    "from-rose-200 via-brand-50 to-amber-50",
    "from-brand-100 via-white to-brand-200",
  ];
  const initials = title
    .split(/\s+/)
    .filter((w) => /[A-Za-zÀ-ỹ0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${variants[hash % variants.length]} ${className ?? ""}`} aria-hidden>
      <div className="bg-dots absolute inset-0 opacity-60" />
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute bottom-4 left-4 grid size-14 place-items-center rounded-2xl bg-white/80 font-display text-xl font-extrabold text-brand-700 shadow-sm backdrop-blur">
        {initials || "TH"}
      </div>
    </div>
  );
}

export function CourseCard({ course }: { course: CourseCardDto }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm transition duration-[var(--duration-ui)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden">
        {course.thumbnailUrl ? (
          <img {...coverSrcSet(course.thumbnailUrl)} sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
        ) : (
          <CourseCover title={course.title} className="h-full w-full transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="brand" className="bg-white/90 backdrop-blur">
            {LEVEL_LABEL[course.level]}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {course.categoryName ? <p className="text-caption text-brand-700">{course.categoryName}</p> : null}
        <h3 className="text-h3 line-clamp-2 text-ink">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-ink-soft">{course.shortDescription}</p>
        {course.technologies.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Công nghệ">
            {course.technologies.slice(0, 3).map((t) => (
              <li key={t.slug} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                {t.name}
                {t.testedVersion ? ` ${t.testedVersion}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <IconBook size={15} className="text-brand-600" />
            {course.lessonCount} bài
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconClock size={15} className="text-brand-600" />
            <span title="Thời lượng ước tính">{formatMinutes(course.totalDurationSeconds)}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <IconUser size={15} className="text-brand-600" />
            <span className="truncate">{course.instructorName}</span>
          </span>
        </div>
        <Stars value={course.ratingAvg} count={course.ratingCount} />
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      <div className="skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
