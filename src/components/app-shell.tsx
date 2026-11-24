"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./ui";

export type ShellLink = { href: string; label: string; icon: ReactNode; exact?: boolean; badge?: number };

/** Khung khu quản lý (giảng viên/admin): sidebar desktop, chip cuộn ngang trên mobile. */
export function AppShell({ title, links, children }: { title: string; links: ShellLink[]; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (l: ShellLink) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/"));
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface lg:min-h-[calc(100dvh-4rem)] lg:border-b-0 lg:border-r">
        <div className="lg:sticky lg:top-16 lg:p-4">
          <p className="text-caption hidden px-3 pb-3 pt-2 text-ink-faint lg:block">{title}</p>
          <nav aria-label={title} className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:p-0">
            {links.map((l) => {
              const active = isActive(l);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    active ? "bg-brand-100 text-brand-900" : "text-ink-soft hover:bg-brand-50 hover:text-ink",
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-brand-700 lg:block" aria-hidden /> : null}
                  <span className={active ? "text-brand-700" : "text-ink-faint"}>{l.icon}</span>
                  {l.label}
                  {l.badge ? <span className="ml-auto rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{l.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
