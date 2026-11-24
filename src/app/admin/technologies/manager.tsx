"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertTechnologyAction } from "@/modules/technologies/actions";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, Field, Input, Select, Table, Td, Th, Tr, Textarea } from "@/components/ui";
import type { ActionError } from "@/lib/errors";

type Row = { id?: string; name: string; slug: string; type: string; domain: string; aliases: string; description: string; officialUrl: string; status: "active" | "planned"; order: number; prerequisites: string };
const empty: Row = { name: "", slug: "", type: "language", domain: "web", aliases: "", description: "", officialUrl: "", status: "planned", order: 100, prerequisites: "" };

export function TechnologyManager({ items, typeLabels, domainLabels }: { items: Row[]; typeLabels: Record<string, string>; domainLabels: Record<string, string> }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Row>(empty);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const set = <K extends keyof Row>(k: K, v: Row[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await upsertTechnologyAction({ ...form, id: form.id, slug: form.slug || undefined }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      toast({ tone: "success", message: form.id ? "Đã cập nhật công nghệ." : "Đã thêm công nghệ." });
      setForm(empty);
      router.refresh();
    } else setError(r ? r.error : { code: "INTERNAL_ERROR", message: "Không kết nối được máy chủ." });
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Tên</Th>
              <Th>Loại · mảng</Th>
              <Th>Alias</Th>
              <Th>Trạng thái</Th>
              <Th>
                <span className="sr-only">Thao tác</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <span className="font-semibold">{t.name}</span>
                  <span className="block text-xs text-ink-faint">/{t.slug}</span>
                </Td>
                <Td className="text-sm">
                  {typeLabels[t.type]} · {domainLabels[t.domain]}
                </Td>
                <Td className="text-sm text-ink-soft">{t.aliases || "—"}</Td>
                <Td>{t.status === "active" ? <Badge tone="success">Đang dùng</Badge> : <Badge>Kế hoạch</Badge>}</Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => setForm(t)}>
                    Sửa
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Card className="h-fit p-5">
        <form onSubmit={save} className="space-y-4" noValidate>
          <h2 className="text-h3">{form.id ? `Sửa: ${form.name}` : "Thêm công nghệ"}</h2>
          <FormError error={error} />
          <Field id="t-name" label="Tên hiển thị" errors={fe.name}>
            <Input id="t-name" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
          </Field>
          <Field id="t-slug" label="Slug" hint="Bỏ trống để tự tạo. Đổi slug làm hỏng link cũ." optional errors={fe.slug}>
            <Input id="t-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={60} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-type" label="Loại">
              <Select id="t-type" value={form.type} onChange={(e) => set("type", e.target.value)}>
                {Object.entries(typeLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="t-domain" label="Mảng">
              <Select id="t-domain" value={form.domain} onChange={(e) => set("domain", e.target.value)}>
                {Object.entries(domainLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field id="t-aliases" label="Alias tìm kiếm" hint="Cách nhau bởi dấu phẩy, ví dụ: js, ecmascript" optional errors={fe.aliases}>
            <Input id="t-aliases" value={form.aliases} onChange={(e) => set("aliases", e.target.value)} maxLength={400} />
          </Field>
          <Field id="t-url" label="Tài liệu chính thức (https)" optional errors={fe.officialUrl}>
            <Input id="t-url" type="url" value={form.officialUrl} onChange={(e) => set("officialUrl", e.target.value)} maxLength={300} />
          </Field>
          <Field id="t-prereq" label="Nên biết trước" hint="Slug công nghệ, cách nhau dấu phẩy (vd javascript, react). Hệ thống chặn vòng lặp." optional errors={fe.prerequisites}>
            <Input id="t-prereq" value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} maxLength={400} />
          </Field>
          <Field id="t-desc" label="Mô tả ngắn" optional errors={fe.description}>
            <Textarea id="t-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-status" label="Trạng thái">
              <Select id="t-status" value={form.status} onChange={(e) => set("status", e.target.value as Row["status"])}>
                <option value="planned">Kế hoạch (roadmap)</option>
                <option value="active">Đang dùng</option>
              </Select>
            </Field>
            <Field id="t-order" label="Thứ tự">
              <Input id="t-order" type="number" min={0} max={9999} value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" pending={pending}>
              {form.id ? "Lưu thay đổi" : "Thêm"}
            </Button>
            {form.id ? (
              <Button type="button" variant="ghost" onClick={() => setForm(empty)}>
                Hủy
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
