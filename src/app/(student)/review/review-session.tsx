"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { answerReviewAction } from "@/modules/learning/actions";
import { FormError } from "@/components/form-error";
import { IconCheck, IconClose } from "@/components/icons";
import { Button, ProgressBar, cn } from "@/components/ui";
import type { ActionError } from "@/lib/errors";

type Item = { id: string; revision: number; prompt: string; options: { optionId: string; text: string }[]; topicKey: string | null; intervalStep: number };
type Result = { correct: boolean; correctOptionId: string; explanation: string; nextReviewAt: string; mastered: boolean };

/** Phiên ôn tập: một thẻ mỗi lần, chấm ở server, chuyển thẻ có chuyển động nhẹ. */
export function ReviewSession({ items }: { items: Item[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, setPending] = useState(false);
  const [score, setScore] = useState(0);
  const item = items[idx];

  if (!item) {
    return (
      <div className="animate-scale-in rounded-[var(--radius-xl)] border border-line bg-surface p-8 text-center shadow-md">
        <div className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-success-600 text-white">
          <IconCheck size={30} />
        </div>
        <h2 className="text-h2 mt-4">Xong phiên ôn hôm nay!</h2>
        <p className="mt-1 text-ink-soft">
          Đúng {score}/{items.length} câu. Câu sai sẽ quay lại vào ngày mai.
        </p>
        <Button className="mt-6" onClick={() => router.refresh()}>
          Làm mới danh sách
        </Button>
      </div>
    );
  }

  async function check() {
    if (!selected || !item) return;
    setPending(true);
    setError(null);
    const r = await answerReviewAction({ itemId: item.id, revision: item.revision, optionId: selected }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      setResult(r.data);
      if (r.data.correct) setScore((s) => s + 1);
    } else setError(r?.error ?? { code: "INTERNAL_ERROR", message: "Không gửi được — kiểm tra mạng và thử lại." });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <ProgressBar value={(idx / items.length) * 100} label={`Thẻ ${idx + 1}/${items.length}`} />
      </div>
      <div key={item.id} className="animate-fade-up rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-md sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-faint">
          {item.topicKey ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800">#{item.topicKey}</span> : null}
          Mốc hiện tại: {[1, 3, 7, 14][item.intervalStep] ?? 1} ngày
        </div>
        <p className="mt-3 text-xl font-semibold leading-snug">{item.prompt.replace(/`/g, "")}</p>
        <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Lựa chọn">
          {item.options.map((o) => {
            const isSel = selected === o.optionId;
            const isCorrect = result?.correctOptionId === o.optionId;
            return (
              <label
                key={o.optionId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
                  result ? (isCorrect ? "border-success-600 bg-success-50" : isSel ? "border-danger-700 bg-danger-50" : "border-line opacity-70") : isSel ? "border-brand-700 bg-brand-50" : "border-line hover:border-brand-300",
                )}
              >
                <input type="radio" name="answer" disabled={Boolean(result)} checked={isSel} onChange={() => setSelected(o.optionId)} className="sr-only" />
                <span className="flex-1">{o.text.replace(/`/g, "")}</span>
                {result && isCorrect ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700"><IconCheck size={14} /> Đúng</span> : null}
                {result && isSel && !isCorrect ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger-700"><IconClose size={14} /> Bạn chọn</span> : null}
              </label>
            );
          })}
        </div>
        <FormError error={error} />
        {result ? (
          <div className="mt-5 animate-fade-in space-y-3">
            <p className={cn("font-semibold", result.correct ? "text-success-700" : "text-danger-700")}>
              {result.correct ? (result.mastered ? "Chính xác — bạn đã thuộc câu này!" : "Chính xác!") : "Chưa đúng."}{" "}
              <span className="font-normal text-ink-soft">
                {result.mastered ? "Sẽ không nhắc lại nữa." : `Ôn lại vào ${new Date(result.nextReviewAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}.`}
              </span>
            </p>
            {result.explanation ? <p className="rounded-lg bg-brand-50/70 p-3 text-sm text-ink-soft">{result.explanation.replace(/`/g, "")}</p> : null}
            <Button
              onClick={() => {
                setIdx((i) => i + 1);
                setSelected(null);
                setResult(null);
              }}
            >
              {idx + 1 < items.length ? "Thẻ tiếp theo →" : "Hoàn thành"}
            </Button>
          </div>
        ) : (
          <Button className="mt-5" disabled={!selected} pending={pending} onClick={check}>
            Kiểm tra
          </Button>
        )}
      </div>
    </div>
  );
}
