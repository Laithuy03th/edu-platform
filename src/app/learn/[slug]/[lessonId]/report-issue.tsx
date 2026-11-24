"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reportIssueAction } from "@/modules/content-issues/actions";
import { useAction } from "@/components/use-action";
import { Dialog, useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { IconFlag } from "@/components/icons";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";

type Mine = { id: string; kind: string; status: "open" | "resolved" | "wont_fix"; resolution: string | null; createdAt: string };
const STATUS: Record<Mine["status"], { label: string; tone: "warning" | "success" | "neutral" }> = {
  open: { label: "Đang chờ giảng viên", tone: "warning" },
  resolved: { label: "Đã sửa", tone: "success" },
  wont_fix: { label: "Không sửa", tone: "neutral" },
};

/** T06: báo lỗi nội dung (code sai, lỗi thời…) → hộp thư giảng viên của khóa. Chỉ hiện khi đã đăng nhập và đọc được bài. */
export function ReportIssue({ lessonId, kinds, headings, mine }: { lessonId: string; kinds: Record<string, string>; headings: string[]; mine: Mine[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "code_error", message: "", location: "", environment: "" });
  const a = useAction(reportIssueAction);
  const fe = a.fieldErrors;

  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface-muted/60 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Thấy code không chạy, thông tin lỗi thời hay chỗ khó hiểu?</p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <IconFlag size={15} /> Báo lỗi nội dung
        </Button>
      </div>
      {mine.length ? (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          {mine.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
              <span className="text-ink-soft">{kinds[m.kind]}</span>
              {m.resolution ? <span className="text-ink-faint">— {m.resolution}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Báo lỗi nội dung bài học"
        description="Gửi tới giảng viên của khóa. Mô tả cách tái hiện giúp sửa nhanh hơn."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              pending={a.pending}
              onClick={async () => {
                const r = await a.run({ lessonId, ...f });
                if (r?.ok) {
                  setOpen(false);
                  setF({ kind: "code_error", message: "", location: "", environment: "" });
                  toast({ tone: "success", message: "Đã gửi báo lỗi. Cảm ơn bạn!" });
                  router.refresh();
                }
              }}
            >
              Gửi báo lỗi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError error={a.error} />
          <Field id="ri-kind" label="Loại lỗi">
            <Select id="ri-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="ri-loc" label="Vị trí trong bài" optional>
            <Select id="ri-loc" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })}>
              <option value="">— Cả bài / không rõ —</option>
              <option value="Video">Video</option>
              {headings.map((h) => (
                <option key={h} value={h}>
                  Mục: {h}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="ri-msg" label="Mô tả" hint="Bạn đã làm gì, kết quả mong đợi và kết quả thực tế (có thể dán thông báo lỗi)." errors={fe.message}>
            <Textarea id="ri-msg" rows={5} maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          </Field>
          <Field id="ri-env" label="Môi trường" optional hint="Ví dụ: Windows 11, Node 22.13, Next.js 16.4">
            <Input id="ri-env" maxLength={160} value={f.environment} onChange={(e) => setF({ ...f, environment: e.target.value })} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
