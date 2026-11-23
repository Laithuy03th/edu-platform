"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSubmissionDraftAction, submitProjectAction } from "@/modules/projects/actions";
import type { RubricCriterion, SubmissionFields } from "@/server/db/models";
import { FormError } from "@/components/form-error";
import { useConfirm, useToast } from "@/components/overlays";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function SubmissionForm({ assignmentId, rubric, initial, roundsLeft, hasDraft, needsChanges, verified }: { assignmentId: string; rubric: RubricCriterion[]; initial: SubmissionFields | null; roundsLeft: number; hasDraft: boolean; needsChanges: boolean; verified: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState<SubmissionFields>(initial ?? { repoUrl: "", demoUrl: "", description: "", selfAssessment: [] });
  const [saved, setSaved] = useState(hasDraft);
  const save = useAction(saveSubmissionDraftAction, {
    onSuccess: () => {
      setSaved(true);
      toast({ tone: "success", message: "Đã lưu bản nháp." });
    },
  });
  const submit = useAction(submitProjectAction, {
    onSuccess: (d) => {
      toast({ tone: "success", message: d.message });
      router.refresh();
    },
  });
  const self = (id: string) => f.selfAssessment.find((s) => s.criterionId === id);
  const setSelf = (id: string, patch: Partial<{ points: number; note: string }>) =>
    setF((x) => {
      const rest = x.selfAssessment.filter((s) => s.criterionId !== id);
      const cur = self(id) ?? { criterionId: id, points: 0, note: "" };
      return { ...x, selfAssessment: [...rest, { ...cur, ...patch }] };
    });
  const fe = save.fieldErrors;
  return (
    <Card className="space-y-4">
      <h2 className="text-h3">{needsChanges ? "Chỉnh sửa và nộp lại" : "Bài nộp của bạn"}</h2>
      {needsChanges ? <Alert tone="warning">Giảng viên yêu cầu chỉnh sửa — xem phản hồi bên trái.</Alert> : null}
      <Field id="repoUrl" label="Link GitHub" errors={fe.repoUrl}>
        <Input id="repoUrl" type="url" placeholder="https://github.com/…" value={f.repoUrl} onChange={(e) => (setF({ ...f, repoUrl: e.target.value }), setSaved(false))} />
      </Field>
      <Field id="demoUrl" label="Link demo" optional errors={fe.demoUrl}>
        <Input id="demoUrl" type="url" placeholder="https://…" value={f.demoUrl} onChange={(e) => (setF({ ...f, demoUrl: e.target.value }), setSaved(false))} />
      </Field>
      <Field id="description" label="Mô tả" hint="Bạn đã làm gì, khó khăn và điều muốn giảng viên góp ý." errors={fe.description}>
        <Textarea id="description" rows={4} maxLength={5000} value={f.description} onChange={(e) => (setF({ ...f, description: e.target.value }), setSaved(false))} />
      </Field>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Tự đánh giá theo rubric</legend>
        {rubric.map((r) => (
          <div key={r.criterionId} className="rounded-[var(--radius-md)] border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`self-${r.criterionId}`} className="text-sm font-medium">
                {r.title}
              </label>
              <span className="flex items-center gap-1 text-sm">
                <input
                  id={`self-${r.criterionId}`}
                  type="number"
                  min={0}
                  max={r.maxPoints}
                  value={self(r.criterionId)?.points ?? 0}
                  onChange={(e) => (setSelf(r.criterionId, { points: Math.max(0, Math.min(r.maxPoints, Number(e.target.value) || 0)) }), setSaved(false))}
                  className="w-16 rounded-md border border-line-strong px-2 py-1 text-right tabular-nums"
                />
                /{r.maxPoints}
              </span>
            </div>
            <input
              aria-label={`Ghi chú tự đánh giá: ${r.title}`}
              placeholder="Ghi chú (không bắt buộc)"
              maxLength={500}
              value={self(r.criterionId)?.note ?? ""}
              onChange={(e) => (setSelf(r.criterionId, { note: e.target.value }), setSaved(false))}
              className="mt-2 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </fieldset>
      <FormError error={save.error ?? submit.error} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" pending={save.pending} onClick={() => save.run({ assignmentId, ...f })}>
          Lưu nháp
        </Button>
        <Button
          pending={submit.pending}
          disabled={!saved || !verified || roundsLeft <= 0}
          onClick={async () => {
            if ((await confirm({ title: "Nộp bài cho giảng viên?", description: `Sau khi nộp bạn không sửa được cho tới khi có phản hồi. Còn ${roundsLeft} lượt nộp.`, tone: "brand", confirmLabel: "Nộp bài" })).ok) submit.run({ assignmentId });
          }}
        >
          Nộp bài
        </Button>
      </div>
      <p className="text-xs text-ink-faint">{!verified ? "Cần xác minh email để nộp bài. " : ""}{!saved ? "Hãy lưu nháp trước khi nộp. " : ""}Còn {roundsLeft} lượt nộp. Link chỉ hiển thị công khai nếu bạn chọn trên hồ sơ thành quả.</p>
    </Card>
  );
}
