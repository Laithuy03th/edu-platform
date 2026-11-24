"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveArticleAction, recordArticleReviewAction, rejectArticleAction, setArticleArchivedAction } from "@/modules/articles/actions";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";

/** Bảng của admin: duyệt/từ chối bản nộp, lưu trữ, ghi nhận review chuyên môn (người thật). */
export function ArticleAdminPanel({ id, pendingRevision, status, hasPublished, review }: { id: string; pendingRevision: number | null; status: string; hasPublished: boolean; review: { reviewerName: string; outdated: boolean } | null }) {
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [reviewer, setReviewer] = useState("");
  const approve = useAction(approveArticleAction);
  const reject = useAction(rejectArticleAction);
  const archive = useAction(setArticleArchivedAction);
  const rec = useAction(recordArticleReviewAction);
  const done = (msg: string) => {
    toast({ tone: "success", message: msg });
    router.refresh();
  };
  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <h2 className="text-h3">Duyệt (admin)</h2>
        <FormError error={approve.error ?? reject.error ?? archive.error} />
        {pendingRevision !== null ? (
          <>
            <Button
              className="w-full"
              pending={approve.pending}
              onClick={async () => {
                const r = await approve.run({ id, submittedRevision: pendingRevision });
                if (r?.ok) done("Đã xuất bản.");
              }}
            >
              Duyệt & xuất bản
            </Button>
            <Field id="ap-reason" label="Lý do từ chối" errors={reject.fieldErrors.reason}>
              <Textarea id="ap-reason" rows={2} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              variant="outline"
              className="w-full"
              pending={reject.pending}
              disabled={reason.trim().length < 5}
              onClick={async () => {
                const r = await reject.run({ id, reason });
                if (r?.ok) done("Đã từ chối.");
              }}
            >
              Từ chối
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink-soft">Không có bản nộp chờ duyệt.</p>
        )}
        {hasPublished ? (
          <Button
            variant="ghost"
            size="sm"
            pending={archive.pending}
            onClick={async () => {
              const r = await archive.run({ id, archived: status !== "archived" });
              if (r?.ok) done(status === "archived" ? "Đã khôi phục." : "Đã lưu trữ.");
            }}
          >
            {status === "archived" ? "Khôi phục công khai" : "Lưu trữ (noindex, giữ URL)"}
          </Button>
        ) : null}
      </Card>
      {hasPublished ? (
        <Card className="space-y-3 p-5">
          <h2 className="text-h3">Review chuyên môn</h2>
          <p className="text-xs text-ink-faint">Chỉ ghi khi một người có chuyên môn đã kiểm tra tính đúng của bài. Tên hiển thị công khai.</p>
          {review ? (
            <p className="text-sm">
              {review.reviewerName} {review.outdated ? <Badge tone="warning">Đã đổi sau review</Badge> : <Badge tone="success">Khớp bản hiện tại</Badge>}
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Chưa có.</p>
          )}
          <FormError error={rec.error} />
          <Field id="ap-rv" label="Người review" errors={rec.fieldErrors.reviewerName}>
            <Input id="ap-rv" value={reviewer} maxLength={80} onChange={(e) => setReviewer(e.target.value)} />
          </Field>
          <Button
            size="sm"
            pending={rec.pending}
            onClick={async () => {
              const r = await rec.run({ id, reviewerName: reviewer });
              if (r?.ok) {
                setReviewer("");
                done("Đã ghi nhận review.");
              }
            }}
          >
            Ghi nhận cho bản hiện tại
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
