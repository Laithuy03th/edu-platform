"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveAnnouncementAction } from "@/modules/site/actions";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, Checkbox, Field, Input, Select } from "@/components/ui";
import type { ActionError } from "@/lib/errors";

type A = { enabled: boolean; message: string; linkHref: string; linkLabel: string; tone: "brand" | "info" | "warning"; version: number; updatedAt: string | null };

const PREVIEW = {
  brand: "bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 text-white",
  info: "bg-info-50 text-info-700 border border-info-200",
  warning: "bg-warning-50 text-warning-800 border border-warning-200",
} as const;

export function AnnouncementForm({ initial }: { initial: A }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const set = <K extends keyof A>(k: K, v: A[K]) => setF((x) => ({ ...x, [k]: v }));
  const fe = error?.fieldErrors ?? {};

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await saveAnnouncementAction({ expectedVersion: initial.version, enabled: f.enabled, message: f.message, linkHref: f.linkHref, linkLabel: f.linkLabel, tone: f.tone }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      toast({ tone: "success", message: f.enabled ? "Đã lưu và bật banner." : "Đã lưu (banner đang tắt)." });
      router.refresh();
    } else {
      setError(r ? r.error : { code: "INTERNAL_ERROR", message: "Không kết nối được máy chủ." });
      if (r?.error.code === "STALE_REVISION") router.refresh();
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <FormError error={error} />
          <Checkbox label="Hiển thị banner" description="Tắt để ẩn ngay trên mọi trang." checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          <Field id="ann-msg" label="Nội dung" hint={`${f.message.length}/180 ký tự`} errors={fe.message}>
            <Input id="ann-msg" value={f.message} maxLength={180} onChange={(e) => set("message", e.target.value)} placeholder="Ví dụ: Khóa MongoDB vừa có video cho từng bài." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ann-href" label="Link" optional hint="/courses hoặc https://…" errors={fe.linkHref}>
              <Input id="ann-href" value={f.linkHref} maxLength={300} onChange={(e) => set("linkHref", e.target.value)} />
            </Field>
            <Field id="ann-label" label="Chữ trên link" optional errors={fe.linkLabel}>
              <Input id="ann-label" value={f.linkLabel} maxLength={40} onChange={(e) => set("linkLabel", e.target.value)} />
            </Field>
          </div>
          <Field id="ann-tone" label="Kiểu">
            <Select id="ann-tone" value={f.tone} onChange={(e) => set("tone", e.target.value as A["tone"])}>
              <option value="brand">Thương hiệu (đỏ)</option>
              <option value="info">Thông tin (xanh)</option>
              <option value="warning">Cảnh báo (vàng) — bảo trì, sự cố</option>
            </Select>
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" pending={pending}>
              Lưu
            </Button>
            {initial.updatedAt ? <span className="text-xs text-ink-faint">Sửa lần cuối {new Date(initial.updatedAt).toLocaleString("vi-VN")} · phiên bản {initial.version}</span> : null}
          </div>
        </form>
      </Card>
      <div className="space-y-3">
        <p className="text-caption text-ink-faint">
          Xem trước {f.enabled ? <Badge tone="success">Đang bật</Badge> : <Badge>Đang tắt</Badge>}
        </p>
        <div className={`rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium ${PREVIEW[f.tone]}`}>
          {f.message || "Nội dung banner…"} {f.linkHref ? <span className="font-bold underline underline-offset-4">{f.linkLabel || "…"} →</span> : null}
        </div>
      </div>
    </div>
  );
}
