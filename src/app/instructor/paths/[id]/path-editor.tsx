"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePathAction } from "@/modules/learning-paths/actions";
import { FormError } from "@/components/form-error";
import { IconChevronDown, IconTrash } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Badge, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";

type Item = { itemId?: string; kind: "course" | "chapter" | "lesson" | "milestone"; refId: string | null; title: string | null; required: boolean; dependsOn: string[] };
type Init = { title: string; goal: string; audience: string; prerequisites: string; status: "draft" | "published" | "archived"; featured: boolean; items: Item[] };
type Content = { id: string; title: string; chapters: { id: string; title: string; lessons: { id: string; title: string }[] }[] }[];

export function PathEditor({ pathId, initial, content, isAdmin }: { pathId: string | null; initial: Init | null; content: Content; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<Init>(initial ?? { title: "", goal: "", audience: "", prerequisites: "", status: "draft", featured: false, items: [] });
  const [pick, setPick] = useState("");
  const save = useAction(savePathAction, {
    onSuccess: (d) => {
      toast({ tone: "success", message: "Đã lưu lộ trình." });
      if (!pathId) router.push(`/instructor/paths/${d.id}`);
      else router.refresh();
    },
  });
  const options = content.flatMap((c) => [
    { value: `course:${c.id}`, label: `📘 ${c.title}` },
    ...c.chapters.flatMap((ch) => [{ value: `chapter:${ch.id}`, label: `   └ Chương: ${ch.title}` }, ...ch.lessons.map((l) => ({ value: `lesson:${l.id}`, label: `      · Bài: ${l.title}` }))]),
  ]);
  const labelOf = (it: Item) => (it.kind === "milestone" ? it.title ?? "Cột mốc" : (options.find((o) => o.value === `${it.kind}:${it.refId}`)?.label.trim() ?? "Nội dung không còn khả dụng"));
  const move = (i: number, d: -1 | 1) => setS((x) => {
    const items = [...x.items];
    const j = i + d;
    if (j < 0 || j >= items.length) return x;
    [items[i], items[j]] = [items[j]!, items[i]!];
    return { ...x, items };
  });
  const withIds = s.items.map((it, i) => ({ ...it, itemId: it.itemId ?? `n${i}` }));

  return (
    <form
      className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_320px]"
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ ...(pathId ? { pathId } : {}), ...s, items: withIds });
      }}
    >
      <div className="min-w-0 space-y-6">
        <FormError error={save.error} />
        <Card className="space-y-4">
          <Field id="ptitle" label="Tên lộ trình">
            <Input id="ptitle" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} required maxLength={120} />
          </Field>
          <Field id="pgoal" label="Mục tiêu" hint="Học xong làm được gì — cụ thể, không hứa việc làm.">
            <Textarea id="pgoal" rows={2} value={s.goal} onChange={(e) => setS({ ...s, goal: e.target.value })} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="paud" label="Đối tượng">
              <Input id="paud" value={s.audience} onChange={(e) => setS({ ...s, audience: e.target.value })} maxLength={300} />
            </Field>
            <Field id="ppre" label="Kiến thức đầu vào">
              <Input id="ppre" value={s.prerequisites} onChange={(e) => setS({ ...s, prerequisites: e.target.value })} maxLength={500} />
            </Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-h3">Các mục theo thứ tự</h2>
          <ol className="space-y-2">
            {withIds.map((it, i) => (
              <li key={it.itemId} className="rounded-[var(--radius-md)] border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{i + 1}</span>
                  <Badge>{it.kind === "course" ? "Khóa" : it.kind === "chapter" ? "Chương" : it.kind === "lesson" ? "Bài" : "Cột mốc"}</Badge>
                  {it.kind === "milestone" ? (
                    <Input aria-label="Tên cột mốc" value={it.title ?? ""} onChange={(e) => setS({ ...s, items: s.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className="min-w-0 flex-1" />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{labelOf(it)}</span>
                  )}
                  <button type="button" aria-label="Lên" onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-brand-50">
                    <IconChevronDown size={15} className="rotate-180" />
                  </button>
                  <button type="button" aria-label="Xuống" onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-brand-50">
                    <IconChevronDown size={15} />
                  </button>
                  <button type="button" aria-label="Xóa mục" onClick={() => setS({ ...s, items: s.items.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700">
                    <IconTrash size={15} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 pl-9 text-sm">
                  {it.kind !== "milestone" ? (
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={it.required} onChange={(e) => setS({ ...s, items: s.items.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)) })} className="accent-brand-700" /> Bắt buộc
                    </label>
                  ) : null}
                  {i > 0 ? (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={it.dependsOn.includes(withIds[i - 1]!.itemId)}
                        onChange={(e) => setS({ ...s, items: s.items.map((x, j) => (j === i ? { ...x, dependsOn: e.target.checked ? [withIds[i - 1]!.itemId] : [] } : x)) })}
                        className="accent-brand-700"
                      />
                      Cần xong mục trước
                    </label>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Chọn nội dung để thêm" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 font-mono text-xs">
              <option value="">— Chọn khóa/chương/bài đã xuất bản —</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="soft"
              disabled={!pick}
              onClick={() => {
                const [kind, refId] = pick.split(":") as [Item["kind"], string];
                setS({ ...s, items: [...s.items, { kind, refId, title: null, required: true, dependsOn: [] }] });
                setPick("");
              }}
            >
              Thêm
            </Button>
            <Button type="button" variant="outline" onClick={() => setS({ ...s, items: [...s.items, { kind: "milestone", refId: null, title: "Cột mốc mới", required: false, dependsOn: [] }] })}>
              + Cột mốc
            </Button>
          </div>
        </Card>
      </div>
      <aside>
        <Card className="space-y-4 lg:sticky lg:top-24">
          <Field id="pstatus" label="Trạng thái">
            <Select id="pstatus" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value as Init["status"] })}>
              <option value="draft">Nháp</option>
              <option value="published">Công khai</option>
              <option value="archived">Lưu trữ</option>
            </Select>
          </Field>
          {isAdmin ? <Checkbox label="Nổi bật trên trang chủ" checked={s.featured} onChange={(e) => setS({ ...s, featured: e.target.checked })} /> : null}
          <p className="text-xs text-ink-faint">Thời gian ước tính tự tính từ thời lượng bài học. Mục bị gỡ sẽ hiển thị “không khả dụng” thay vì làm hỏng trang.</p>
          <Button type="submit" className="w-full" pending={save.pending}>
            Lưu lộ trình
          </Button>
        </Card>
      </aside>
    </form>
  );
}
