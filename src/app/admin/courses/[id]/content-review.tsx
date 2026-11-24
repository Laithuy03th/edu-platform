"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordContentReviewAction } from "@/modules/technologies/actions";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { ActionError } from "@/lib/errors";

/**
 * T06: ghi nhận REVIEW CHUYÊN MÔN (người thật đã kiểm tra tính đúng kỹ thuật) — khác "duyệt xuất bản".
 * Gắn với phiên bản xuất bản hiện tại; nội dung đổi sau đó → trang công khai ghi "đã thay đổi sau lần review".
 */
export function ContentReviewForm({ courseId, current, canReview }: { courseId: string; current: { reviewerName: string; reviewedAt: string; outdated: boolean } | null; canReview: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  async function submit(clear: boolean) {
    setPending(true);
    setError(null);
    const r = await recordContentReviewAction({ courseId, clear, reviewerName: name, note }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      toast({ tone: "success", message: clear ? "Đã gỡ ghi nhận review." : "Đã ghi nhận review chuyên môn." });
      setName("");
      setNote("");
      router.refresh();
    } else setError(r ? r.error : { code: "INTERNAL_ERROR", message: "Không kết nối được máy chủ." });
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-h3">Review chuyên môn</h2>
      <p className="text-xs text-ink-faint">Khác với duyệt xuất bản: chỉ ghi khi một người có chuyên môn đã kiểm tra tính đúng của nội dung và ví dụ code. Tên hiển thị công khai.</p>
      {current ? (
        <p className="text-sm">
          {current.reviewerName} · {new Date(current.reviewedAt).toLocaleDateString("vi-VN")} {current.outdated ? <Badge tone="warning">Nội dung đã đổi sau review</Badge> : <Badge tone="success">Khớp bản hiện tại</Badge>}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">Chưa có review chuyên môn.</p>
      )}
      {canReview ? (
        <>
          <FormError error={error} />
          <Field id="rv-name" label="Người review" errors={error?.fieldErrors?.reviewerName}>
            <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <Field id="rv-note" label="Ghi chú nội bộ" optional>
            <Textarea id="rv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" pending={pending} onClick={() => submit(false)}>
              Ghi nhận cho bản hiện tại
            </Button>
            {current ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => submit(true)}>
                Gỡ ghi nhận
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-faint">Khóa chưa có bản xuất bản.</p>
      )}
    </Card>
  );
}
