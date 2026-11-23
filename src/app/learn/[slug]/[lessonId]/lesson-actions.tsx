"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markCompleteAction, setUnderstandingAction } from "@/modules/learning/actions";
import { FormError } from "@/components/form-error";
import { IconCheck } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Button, buttonClass, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";

const LEVELS = [
  { value: "understood", label: "Đã hiểu", dot: "bg-success-600" },
  { value: "needs_review", label: "Cần ôn", dot: "bg-warning-700" },
  { value: "not_understood", label: "Chưa hiểu", dot: "bg-danger-700" },
] as const;

/** Hoàn thành (theo dõi học tập — không phải chống gian lận) tách khỏi tự đánh giá mức độ hiểu. */
export function LessonActions({ lessonId, completed, isVideo, understanding, nextHref }: { lessonId: string; completed: boolean; isVideo: boolean; understanding: string | null; nextHref: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [justDone, setJustDone] = useState(false);
  const complete = useAction(markCompleteAction, {
    onSuccess: () => {
      setJustDone(true);
      toast({ tone: "success", message: "Tuyệt! Đã hoàn thành bài học." });
      router.refresh();
    },
  });
  const [level, setLevel] = useState(understanding);
  const [levelError, setLevelError] = useState<string | null>(null);
  return (
    <div className="grid gap-5 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-xs sm:grid-cols-2 sm:p-6">
      <div className="space-y-3">
        <p className="text-caption text-ink-faint">Tiến độ</p>
        {completed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("inline-flex items-center gap-2 rounded-full bg-success-50 px-3 py-1.5 font-semibold text-success-700", justDone && "animate-pop")}>
              <span className="grid size-6 place-items-center rounded-full bg-success-600 text-white">
                <IconCheck size={14} />
              </span>
              Đã hoàn thành
            </span>
            {justDone && nextHref ? (
              <Link href={nextHref} className={buttonClass("soft", "animate-fade-in", "sm")}>
                Học bài tiếp →
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <Button variant="outline" icon={<IconCheck size={16} />} pending={complete.pending} onClick={() => complete.run({ lessonId })}>
              Đánh dấu đã học
            </Button>
            {isVideo ? <p className="text-xs text-ink-faint">Với video, cần xem tới khoảng 90%.</p> : <p className="text-xs text-ink-faint">Dùng để theo dõi việc học, không phải bài kiểm tra.</p>}
            <FormError error={complete.error} />
          </>
        )}
      </div>
      <fieldset className="space-y-3">
        <legend className="text-caption text-ink-faint">Bạn hiểu bài này tới đâu?</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={level === l.value}
              onClick={async () => {
                const next = level === l.value ? null : l.value;
                const prev = level;
                setLevel(next);
                setLevelError(null);
                const r = await setUnderstandingAction({ lessonId, level: next }).catch(() => null);
                if (!r?.ok) {
                  setLevel(prev);
                  setLevelError(r?.error.message ?? "Chưa lưu được, thử lại.");
                }
              }}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition active:scale-95",
                level === l.value ? "border-brand-700 bg-brand-50 text-brand-900 shadow-xs" : "border-line text-ink-soft hover:border-brand-300 hover:bg-brand-50/60",
              )}
            >
              <span className={cn("size-2 rounded-full", l.dot)} aria-hidden />
              {l.label}
              {level === l.value ? <IconCheck size={14} /> : null}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-faint">Tách khỏi tiến độ — bài “Cần ôn/Chưa hiểu” xuất hiện trong Tổng quan.</p>
        {levelError ? <p className="text-xs text-danger-700">{levelError}</p> : null}
      </fieldset>
    </div>
  );
}
