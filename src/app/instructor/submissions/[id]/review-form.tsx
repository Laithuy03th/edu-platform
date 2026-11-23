"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewSubmissionAction } from "@/modules/projects/actions";
import type { RubricCriterion } from "@/server/db/models";
import { FormError } from "@/components/form-error";
import { useConfirm, useToast } from "@/components/overlays";
import { Button, Card, Textarea, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function ReviewForm({ submissionId, roundNo, rubric }: { submissionId: string; roundNo: number; rubric: RubricCriterion[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [scores, setScores] = useState(rubric.map((r) => ({ criterionId: r.criterionId, points: 0, comment: "" })));
  const [summary, setSummary] = useState("");
  const a = useAction(reviewSubmissionAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã gửi đánh giá cho học viên." });
      router.push("/instructor/submissions");
    },
  });
  const total = scores.reduce((s, x) => s + x.points, 0);
  const max = rubric.reduce((s, r) => s + r.maxPoints, 0);
  const send = async (decision: "accepted" | "needs_changes") => {
    const ok = (await confirm({ title: decision === "accepted" ? "Đánh giá ĐẠT?" : "Yêu cầu chỉnh sửa?", description: `Tổng ${total}/${max} điểm. Học viên sẽ thấy điểm và nhận xét.`, tone: "brand", confirmLabel: "Gửi đánh giá" })).ok;
    if (ok) a.run({ submissionId, roundNo, scores, summary, decision });
  };
  return (
    <Card className="space-y-4 xl:sticky xl:top-24">
      <div className="flex items-center justify-between">
        <h2 className="text-h3">Chấm theo rubric</h2>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-bold tabular-nums text-brand-800">
          {total}/{max}
        </span>
      </div>
      <FormError error={a.error} />
      {rubric.map((r, i) => (
        <div key={r.criterionId} className="space-y-2 rounded-[var(--radius-md)] border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`pts-${i}`} className="text-sm font-semibold">
              {r.title}
            </label>
            <span className="flex items-center gap-1 text-sm">
              <input id={`pts-${i}`} type="number" min={0} max={r.maxPoints} value={scores[i]!.points} onChange={(e) => setScores((s) => s.map((x, j) => (j === i ? { ...x, points: Math.max(0, Math.min(r.maxPoints, Number(e.target.value) || 0)) } : x)))} className="w-16 rounded-md border border-line-strong px-2 py-1 text-right tabular-nums" />/{r.maxPoints}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
            <div className={cn("h-full rounded-full transition-[width] duration-300", scores[i]!.points >= r.maxPoints * 0.6 ? "bg-success-600" : "bg-brand-500")} style={{ width: `${(scores[i]!.points / r.maxPoints) * 100}%` }} />
          </div>
          <p className="text-xs text-ink-faint">✓ {r.passDescription}</p>
          <input aria-label={`Nhận xét cho ${r.title}`} placeholder="Nhận xét (không bắt buộc)" value={scores[i]!.comment} onChange={(e) => setScores((s) => s.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} maxLength={1000} className="w-full rounded-md border border-line px-2 py-1.5 text-sm" />
        </div>
      ))}
      <label className="block text-sm font-semibold">
        Nhận xét tổng (≥ 10 ký tự)
        <Textarea className="mt-1.5" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={5000} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" pending={a.pending} disabled={summary.trim().length < 10} onClick={() => send("needs_changes")}>
          Yêu cầu sửa
        </Button>
        <Button pending={a.pending} disabled={summary.trim().length < 10} onClick={() => send("accepted")}>
          Đạt
        </Button>
      </div>
    </Card>
  );
}
