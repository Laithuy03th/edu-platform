"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReviewDto } from "@/modules/reviews/service";
import { deleteReviewAction, upsertReviewAction } from "@/modules/reviews/actions";
import { reportContentAction } from "@/modules/discussions/actions";
import { FormError } from "@/components/form-error";
import { Alert, Button, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function CourseReviews({
  courseId,
  reviews,
  myReview,
  canReview,
  loggedIn,
}: {
  courseId: string;
  reviews: { items: ReviewDto[]; total: number };
  myReview: { rating: number; comment: string } | null;
  canReview: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const save = useAction(upsertReviewAction, { onSuccess: () => router.refresh() });
  const del = useAction(deleteReviewAction, { onSuccess: () => router.refresh() });
  const report = useAction(reportContentAction);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold">Đánh giá ({reviews.total})</h2>
      {canReview ? (
        <form
          className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const comment = new FormData(e.currentTarget).get("comment");
            save.run({ courseId, rating, comment: typeof comment === "string" ? comment : "" });
          }}
        >
          <fieldset>
            <legend className="text-sm font-medium">{myReview ? "Cập nhật đánh giá của bạn" : "Đánh giá khóa học"}</legend>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Số sao">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`cursor-pointer rounded px-2 py-1 text-lg ${n <= rating ? "text-amber-500" : "text-slate-300"}`}>
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                  <span aria-hidden>★</span>
                  <span className="sr-only">{n} sao</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Textarea name="comment" rows={3} maxLength={2000} defaultValue={myReview?.comment ?? ""} placeholder="Nhận xét (không bắt buộc)" aria-label="Nhận xét" />
          <FormError error={save.error ?? del.error} />
          {save.data && !save.pending ? <Alert tone="success">{save.data.message}</Alert> : null}
          <div className="flex gap-2">
            <Button type="submit" pending={save.pending}>
              Lưu đánh giá
            </Button>
            {myReview ? (
              <Button type="button" variant="ghost" pending={del.pending} onClick={() => confirm("Xóa đánh giá của bạn?") && del.run({ courseId })}>
                Xóa
              </Button>
            ) : null}
          </div>
        </form>
      ) : loggedIn ? (
        <p className="mb-4 text-sm text-slate-500">Bạn có thể đánh giá sau khi đăng ký và hoàn thành ít nhất một bài học.</p>
      ) : null}
      {reviews.items.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có đánh giá.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.items.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.authorName}</span>
                <span className="text-amber-500" aria-label={`${r.rating} sao`}>
                  {"★".repeat(r.rating)}
                  <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.comment ? <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.comment}</p> : null}
              {loggedIn ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-slate-500 hover:underline"
                  onClick={() => {
                    const reason = prompt("Lý do báo cáo (spam / xúc phạm / lạc đề / khác):", "spam");
                    if (reason) report.run({ targetType: "review", targetId: r.id, reason: ["spam", "abuse", "off_topic"].includes(reason) ? reason : "other", note: reason });
                  }}
                >
                  Báo cáo
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {report.data ? <p className="mt-2 text-xs text-green-700">Đã gửi báo cáo. Cảm ơn bạn.</p> : null}
    </section>
  );
}
