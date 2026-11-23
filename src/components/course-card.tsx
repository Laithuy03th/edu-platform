import Link from "next/link";
import type { CourseCardDto } from "@/modules/courses/catalog";
import { LEVEL_LABEL } from "@/modules/courses/catalog";
import { formatMinutes } from "@/lib/text";
import { Badge } from "./ui";

export function Stars({ value, count }: { value: number; count: number }) {
  if (count === 0) return <span className="text-xs text-slate-500">Chưa có đánh giá</span>;
  return (
    <span className="text-xs text-slate-700" aria-label={`Đánh giá ${value.toFixed(1)} trên 5 từ ${count} lượt`}>
      ★ {value.toFixed(1).replace(".", ",")} <span className="text-slate-500">({count})</span>
    </span>
  );
}

export function CourseCard({ course }: { course: CourseCardDto }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt="" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-brand-100 to-slate-100 p-4 text-center text-lg font-semibold text-brand-800" aria-hidden>
          {course.title}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="info">{LEVEL_LABEL[course.level]}</Badge>
          {course.categoryName ? <Badge>{course.categoryName}</Badge> : null}
        </div>
        <h3 className="font-semibold leading-snug">
          <Link href={`/courses/${course.slug}`} className="hover:text-brand-700 hover:underline">
            {course.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600">{course.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
          <span>{course.instructorName}</span>
          <span>
            {course.lessonCount} bài · {formatMinutes(course.totalDurationSeconds)}
          </span>
        </div>
        <Stars value={course.ratingAvg} count={course.ratingCount} />
      </div>
    </article>
  );
}
