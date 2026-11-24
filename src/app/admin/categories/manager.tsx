"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertCategoryAction } from "@/modules/admin/actions";
import { useToast } from "@/components/overlays";
import { Badge, Button, Input } from "@/components/ui";

type Cat = { id?: string; name: string; slug?: string; order: number; isActive: boolean };

export function CategoryManager({ items }: { items: Cat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Cat[]>(items);
  const [busy, setBusy] = useState<number | null>(null);
  const save = async (i: number) => {
    const r = rows[i]!;
    setBusy(i);
    const res = await upsertCategoryAction({ ...(r.id ? { id: r.id } : {}), name: r.name, order: r.order, isActive: r.isActive }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      toast({ tone: "success", message: "Đã lưu chủ đề." });
      router.refresh();
    } else toast({ tone: "error", message: res?.error.message ?? "Không lưu được." });
  };
  return (
    <div className="max-w-3xl space-y-3">
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface p-3">
          <Input aria-label="Tên chủ đề" value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-w-0 flex-1" />
          <Input aria-label="Thứ tự" type="number" value={r.order} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, order: Number(e.target.value) } : x)))} className="w-20" />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={r.isActive} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} className="accent-brand-700" /> Hiển thị
          </label>
          {r.slug ? <Badge>/{r.slug}</Badge> : <Badge tone="warning">Mới</Badge>}
          <Button size="sm" variant="soft" pending={busy === i} onClick={() => save(i)}>
            Lưu
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => setRows([...rows, { name: "", order: rows.length + 1, isActive: true }])}>
        + Thêm chủ đề
      </Button>
    </div>
  );
}
