"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCourseTechnologiesAction } from "@/modules/technologies/actions";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { IconTrash } from "@/components/icons";
import { Button, Card, Input, Select } from "@/components/ui";
import type { ActionError } from "@/lib/errors";

type Item = { technologyId: string; testedVersion: string };

/**
 * T01/T06: giảng viên khai báo công nghệ + PHIÊN BẢN ĐÃ KIỂM THỬ nội dung (vd Next.js 16.4).
 * Ghi vào bản nháp; lên trang công khai khi admin duyệt. Không trộn API nhiều major version trong một khóa.
 */
export function TechnologiesForm({ courseId, revision, locked, options, initial }: { courseId: string; revision: number; locked: boolean; options: { id: string; name: string }[]; initial: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const used = new Set(items.map((i) => i.technologyId));
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  async function save() {
    setPending(true);
    setError(null);
    const r = await setCourseTechnologiesAction({ courseId, expectedRevision: revision, items: items.filter((i) => i.technologyId) }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      toast({ tone: "success", message: "Đã lưu công nghệ vào bản nháp." });
      router.refresh();
    } else {
      setError(r ? r.error : { code: "INTERNAL_ERROR", message: "Không kết nối được máy chủ." });
      if (r?.error.code === "STALE_REVISION") router.refresh();
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-h3">Công nghệ & phiên bản đã kiểm thử</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Ghi phiên bản bạn đã thật sự chạy thử ví dụ trong khóa (vd <code>16.4</code>, <code>22 LTS</code>). Hiển thị công khai sau khi admin duyệt.
      </p>
      <FormError error={error} />
      {options.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">Chưa có công nghệ nào được admin kích hoạt.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Select
                aria-label={`Công nghệ ${i + 1}`}
                value={it.technologyId}
                disabled={locked}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, technologyId: e.target.value } : x)))}
                className="min-w-0 flex-1"
              >
                <option value="">— Chọn —</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id} disabled={used.has(o.id) && o.id !== it.technologyId}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Phiên bản đã kiểm thử của công nghệ ${i + 1}`}
                placeholder="Phiên bản, vd 16.4"
                value={it.testedVersion}
                disabled={locked}
                maxLength={40}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, testedVersion: e.target.value } : x)))}
                className="w-36"
              />
              <Button type="button" variant="ghost" size="sm" disabled={locked} onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={`Bỏ công nghệ ${i + 1}`}>
                <IconTrash size={16} />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {items.length < 8 ? (
              <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => setItems([...items, { technologyId: "", testedVersion: "" }])}>
                + Thêm công nghệ
              </Button>
            ) : null}
            <Button type="button" size="sm" pending={pending} disabled={locked || !dirty} onClick={save}>
              Lưu
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
