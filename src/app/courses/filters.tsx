"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconClose, IconSearch } from "@/components/icons";
import { cn } from "@/components/ui";

type Initial = { q: string; category: string; level: string; sort: string };

/** Bộ lọc catalog: tìm kiếm debounce 400ms + chip lọc; trạng thái nằm trong URL (chia sẻ/refresh được). */
export function CatalogFilters({ categories, levels, initial, total }: { categories: { slug: string; name: string }[]; levels: { value: string; label: string }[]; initial: Initial; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (state.q.trim()) sp.set("q", state.q.trim());
      if (state.category) sp.set("category", state.category);
      if (state.level) sp.set("level", state.level);
      if (state.sort !== "newest") sp.set("sort", state.sort);
      const s = sp.toString();
      startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
    }, 400);
    return () => clearTimeout(t);
  }, [state, router, pathname]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition duration-[var(--duration-micro)] active:scale-95",
      active ? "border-brand-700 bg-brand-700 text-white shadow-cta" : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-ink",
    );
  const hasFilters = Boolean(state.q || state.category || state.level || state.sort !== "newest");

  return (
    <div className="mb-10 space-y-5">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="q" className="sr-only">
          Tìm khóa học
        </label>
        <IconSearch size={22} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-brand-600" />
        <input
          id="q"
          type="search"
          placeholder="Tìm theo tên hoặc mô tả — gõ không dấu cũng được…"
          maxLength={100}
          value={state.q}
          onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))}
          className="h-14 w-full rounded-full border border-line bg-surface pl-14 pr-5 text-base shadow-sm transition placeholder:text-ink-faint focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
        {pending ? <span className="absolute right-5 top-1/2 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" aria-label="Đang lọc" /> : null}
      </form>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo chủ đề">
          <button type="button" aria-pressed={!state.category} className={chip(!state.category)} onClick={() => setState((s) => ({ ...s, category: "" }))}>
            Tất cả chủ đề
          </button>
          {categories.map((c) => (
            <button key={c.slug} type="button" aria-pressed={state.category === c.slug} className={chip(state.category === c.slug)} onClick={() => setState((s) => ({ ...s, category: s.category === c.slug ? "" : c.slug }))}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Lọc theo cấp độ">
            {[{ value: "", label: "Mọi cấp độ" }, ...levels].map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={state.level === l.value}
                onClick={() => setState((s) => ({ ...s, level: l.value }))}
                className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", state.level === l.value ? "bg-brand-100 text-brand-800" : "text-ink-soft hover:text-ink")}
              >
                {l.label}
              </button>
            ))}
          </div>
          <label htmlFor="sort" className="sr-only">
            Sắp xếp
          </label>
          <select
            id="sort"
            value={state.sort}
            onChange={(e) => setState((s) => ({ ...s, sort: e.target.value }))}
            className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-soft focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <option value="newest">Mới nhất</option>
            <option value="rating">Đánh giá cao</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-ink-soft" aria-live="polite">
        <span>
          <strong className="text-ink">{total}</strong> khóa học
        </span>
        {hasFilters ? (
          <button type="button" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline" onClick={() => setState({ q: "", category: "", level: "", sort: "newest" })}>
            <IconClose size={14} /> Xóa bộ lọc
          </button>
        ) : null}
      </div>
    </div>
  );
}
