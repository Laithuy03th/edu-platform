"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { IconArrowRight, IconBook, IconClock } from "../icons";
import { coverSrcSet } from "@/lib/images";

export type GoalPanel = {
  key: string;
  label: string;
  title: string;
  description: string;
  skills: { name: string; href: string | null }[];
  courses: { slug: string; title: string; level: string; lessonCount: number; minutes: number; thumbnailUrl: string | null }[];
  cta: { href: string; label: string };
};

/**
 * Tab "Bạn muốn trở thành…": WAI-ARIA tabs (←/→/Home/End), indicator trượt.
 * Mọi panel đều có trong HTML (panel không chọn dùng `hidden`) → không JS vẫn đọc được panel đầu.
 */
export function GoalTabs({ goals }: { goals: GoalPanel[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const n = goals.length;
    const next = e.key === "ArrowRight" ? (active + 1) % n : e.key === "ArrowLeft" ? (active - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Mục tiêu học" className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-xs" onKeyDown={onKey}>
        {goals.map((g, i) => (
          <button
            key={g.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-ui)] sm:px-5 ${active === i ? "text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {active === i ? <span aria-hidden className="absolute inset-0 -z-10 animate-[scale-in_240ms_var(--ease-out-soft)] rounded-full bg-brand-700 shadow-cta" /> : null}
            {g.label}
          </button>
        ))}
      </div>

      {goals.map((g, i) => (
        <div key={g.key} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={active !== i} tabIndex={0} className="mt-8 animate-fade-up focus-visible:outline-none">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h3 className="font-display text-3xl font-extrabold tracking-tight text-ink">{g.title}</h3>
              <p className="mt-3 text-lg leading-relaxed text-ink-soft">{g.description}</p>
              <p className="text-caption mt-6 text-ink-faint">Kỹ năng trong mục tiêu này</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.skills.map((s) =>
                  s.href ? (
                    <li key={s.name}>
                      <Link href={s.href} className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 transition hover:-translate-y-0.5 hover:bg-brand-100">
                        {s.name}
                      </Link>
                    </li>
                  ) : (
                    <li key={s.name} className="rounded-full border border-dashed border-line-strong px-3 py-1 text-sm text-ink-faint" title="Nội dung đang biên soạn">
                      {s.name} <span className="text-xs">· sắp có</span>
                    </li>
                  ),
                )}
              </ul>
              <Link href={g.cta.href} className="group mt-8 inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-800">
                {g.cta.label} <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid gap-3">
              {g.courses.length ? (
                g.courses.map((c, j) => (
                  <Link
                    key={c.slug}
                    href={`/courses/${c.slug}`}
                    className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3 shadow-xs transition duration-[var(--duration-ui)] hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                    style={{ animationDelay: `${j * 60}ms` }}
                  >
                    <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-brand-100 sm:w-40">
                      {c.thumbnailUrl ? <img {...coverSrcSet(c.thumbnailUrl)} sizes="(min-width: 1024px) 320px, 50vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-caption text-brand-700">{c.level}</span>
                      <span className="mt-0.5 block font-semibold leading-snug text-ink group-hover:text-brand-800">{c.title}</span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-ink-faint">
                        <span className="inline-flex items-center gap-1">
                          <IconBook size={13} /> {c.lessonCount} bài
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IconClock size={13} /> {c.minutes} phút
                        </span>
                      </span>
                    </span>
                    <IconArrowRight size={18} className="mr-2 shrink-0 text-brand-600 transition-transform group-hover:translate-x-1" />
                  </Link>
                ))
              ) : (
                <div className="grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface/60 p-10 text-center text-sm text-ink-soft">
                  Khóa học cho mục tiêu này đang được biên soạn và review. Xem lộ trình nội dung ở trang Công nghệ.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
