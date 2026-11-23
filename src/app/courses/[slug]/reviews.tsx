"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReviewDto } from "@/modules/reviews/service";
import { deleteReviewAction, upsertReviewAction } from "@/modules/reviews/actions";
import { reportContentAction } from "@/modules/discussions/actions";
import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { useConfirm, useToast } from "@/components/overlays";
import { Button, Textarea, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function CourseReviews({ courseId, reviews, myReview, canReview, loggedIn }: { courseId: string; reviews: { items: ReviewDto[]; total: number }; myReview: { rating: number; comment: string } | null; canReview: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const save = useAction(upsertReviewAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã lưu đánh giá." });
      router.refresh();
    },
  });
  const del = useAction(deleteReviewAction, { onSuccess: () => router.refresh() });
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-h2 mb-5">
        Đánh giá <span className="text-ink-faint">({reviews.total})</span>
      </h2>
      {canReview ? (
        <form
          className="mb-8 space-y-4 rounded-[var(--radius-lg)] bg-brand-50/70 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const comment = new FormData(e.currentTarget).get("comment");
            save.run({ courseId, rating, comment: typeof comment === "string" ? comment : "" });
          }}
        >
          <fieldset>
            <legend className="text-sm font-semibold">{myReview ? "Cập nhật đánh giá của bạn" : "Bạn thấy khóa học thế nào?"}</legend>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Số sao" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} onMouseEnter={() => setHover(n)} className={cn("cursor-pointer rounded-lg p-1 text-3xl leading-none transition-transform hover:scale-110 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-700", n <= shown ? "text-amber-500" : "text-brand-200")}>
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                  <span aria-hidden>★</span>
                  <span className="sr-only">{n} sao</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Textarea name="comment" rows={3} maxLength={2000} defaultValue={myReview?.comment ?? ""} placeholder="Nhận xét (không bắt buộc)" aria-label="Nhận xét" />
          <FormError error={save.error ?? del.error} />
          <div className="flex gap-2">
            <Button type="submit" pending={save.pending} disabled={!rating}>
              Lưu đánh giá
            </Button>
            {myReview ? (
              <Button type="button" variant="ghost" pending={del.pending} onClick={async () => (await confirm({ title: "Xóa đánh giá của bạn?", confirmLabel: "Xóa" })).ok && del.run({ courseId })}>
                Xóa
              </Button>
            ) : null}
          </div>
        </form>
      ) : loggedIn ? (
        <p className="mb-6 text-sm text-ink-faint">Bạn có thể đánh giá sau khi đăng ký và hoàn thành ít nhất một bài học.</p>
      ) : null}
      {reviews.items.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-6 text-center text-sm text-ink-faint">Chưa có đánh giá nào.</p>
      ) : (
        <ul className="divide-y divide-line">
          {reviews.items.map((r) => (
            <li key={r.id} className="flex gap-4 py-5">
              <Avatar name={r.authorName} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{r.authorName}</span>
                  <span className="text-amber-500" aria-label={`${r.rating} trên 5 sao`}>
                    {"★".repeat(r.rating)}
                    <span className="text-brand-200">{"★".repeat(5 - r.rating)}</span>
                  </span>
                </div>
                {r.comment ? <p className="mt-1.5 whitespace-pre-line text-ink-soft">{r.comment}</p> : null}
                {loggedIn ? (
                  <button
                    type="button"
                    className="mt-2 text-xs text-ink-faint hover:text-ink hover:underline"
                    onClick={async () => {
                      const c = await confirm({ title: "Báo cáo đánh giá", requireReason: "Lý do", tone: "brand", confirmLabel: "Gửi báo cáo" });
                      if (!c.ok) return;
                      const res = await reportContentAction({ targetType: "review", targetId: r.id, reason: "other", note: c.reason.slice(0, 500) }).catch(() => null);
                      toast(res?.ok ? { tone: "success", message: "Đã gửi báo cáo." } : { tone: "error", message: "Không gửi được báo cáo." });
                    }}
                  >
                    Báo cáo
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
