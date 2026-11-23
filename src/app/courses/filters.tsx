"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input, Select } from "@/components/ui";

type Initial = { q: string; category: string; level: string; sort: string };

/** Bộ lọc catalog: tìm kiếm debounce 400ms, cập nhật URL (giữ được khi chia sẻ/refresh). */
export function CatalogFilters({ categories, levels, initial }: { categories: { slug: string; name: string }[]; levels: { value: string; label: string }[]; initial: Initial }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(initial);
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
      router.replace(s ? `${pathname}?${s}` : pathname);
    }, 400);
    return () => clearTimeout(t);
  }, [state, router, pathname]);

  return (
    <form role="search" className="mb-6 grid gap-3 sm:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
      <div className="sm:col-span-2">
        <label htmlFor="q" className="sr-only">
          Tìm khóa học
        </label>
        <Input id="q" type="search" placeholder="Tìm theo tên hoặc mô tả (không cần dấu)…" maxLength={100} value={state.q} onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="category" className="sr-only">
          Chủ đề
        </label>
        <Select id="category" value={state.category} onChange={(e) => setState((s) => ({ ...s, category: e.target.value }))}>
          <option value="">Mọi chủ đề</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <label htmlFor="level" className="sr-only">
          Cấp độ
        </label>
        <Select id="level" value={state.level} onChange={(e) => setState((s) => ({ ...s, level: e.target.value }))}>
          <option value="">Mọi cấp độ</option>
          {levels.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <label htmlFor="sort" className="sr-only">
          Sắp xếp
        </label>
        <Select id="sort" value={state.sort} onChange={(e) => setState((s) => ({ ...s, sort: e.target.value }))}>
          <option value="newest">Mới nhất</option>
          <option value="rating">Đánh giá cao</option>
        </Select>
      </div>
    </form>
  );
}
