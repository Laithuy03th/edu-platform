"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveQuizDraftAction } from "@/modules/quizzes/actions";
import { FormError } from "@/components/form-error";
import { IconTrash } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Alert, Button, Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";

type Q = { questionId?: string; prompt: string; options: { optionId?: string; text: string }[]; correctIndex: number; explanation: string; topicKey: string };
type Init = { title: string; passPercent: number; showExplanations: "after_submit" | "never"; questions: Q[]; rules: { topicKey: string; chapterId: string; thresholdPercent: number }[] };

export function QuizEditor(p: { courseId: string; quizId: string; kind: "lesson" | "placement"; revision: number; locked: boolean; published: number | null; initial: Init; chapters: { id: string; title: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<Init>(p.initial);
  const save = useAction(saveQuizDraftAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã lưu quiz." });
      router.refresh();
    },
  });
  const upQ = (i: number, patch: Partial<Q>) => setS((x) => ({ ...x, questions: x.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ courseId: p.courseId, quizId: p.quizId, expectedRevision: p.revision, ...s, questions: s.questions.map((q) => ({ ...q, topicKey: q.topicKey || null })) });
      }}
    >
      <fieldset disabled={p.locked} className="space-y-6">
        <Alert tone="info">
          Học viên làm phiên bản đã duyệt{p.published ? ` (hiện là v${p.published})` : ""}. Sửa câu hỏi sẽ tạo phiên bản mới khi khóa được duyệt; kết quả cũ vẫn hiển thị theo phiên bản cũ.
        </Alert>
        <FormError error={save.error} />
        <Card className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field id="qtitle" label="Tên quiz">
              <Input id="qtitle" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} required maxLength={120} />
            </Field>
          </div>
          {p.kind === "lesson" ? (
            <Field id="pass" label="Điểm đạt (%)">
              <Input id="pass" type="number" min={0} max={100} value={s.passPercent} onChange={(e) => setS({ ...s, passPercent: Number(e.target.value) })} />
            </Field>
          ) : null}
          <Field id="explain" label="Hiện giải thích">
            <Select id="explain" value={s.showExplanations} onChange={(e) => setS({ ...s, showExplanations: e.target.value as Init["showExplanations"] })}>
              <option value="after_submit">Sau khi nộp</option>
              <option value="never">Không hiện</option>
            </Select>
          </Field>
        </Card>

        <ol className="space-y-4">
          {s.questions.map((q, i) => (
            <li key={i} className="animate-fade-up rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-caption text-brand-700">Câu {i + 1}</p>
                <button type="button" aria-label={`Xóa câu ${i + 1}`} onClick={() => setS({ ...s, questions: s.questions.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700">
                  <IconTrash size={15} />
                </button>
              </div>
              <Textarea aria-label={`Nội dung câu ${i + 1}`} rows={2} value={q.prompt} onChange={(e) => upQ(i, { prompt: e.target.value })} placeholder="Nội dung câu hỏi" required maxLength={2000} />
              <fieldset className="mt-3 space-y-2">
                <legend className="mb-1 text-xs font-semibold text-ink-soft">Lựa chọn (chọn nút tròn ở đáp án đúng)</legend>
                {q.options.map((o, oi) => (
                  <div key={oi} className={cn("flex items-center gap-2 rounded-[var(--radius-sm)] border p-1.5 pl-3", q.correctIndex === oi ? "border-success-600 bg-success-50" : "border-line")}>
                    <input type="radio" name={`correct-${i}`} checked={q.correctIndex === oi} onChange={() => upQ(i, { correctIndex: oi })} aria-label={`Đáp án đúng là lựa chọn ${oi + 1}`} className="accent-success-600" />
                    <input
                      aria-label={`Lựa chọn ${oi + 1}`}
                      value={o.text}
                      onChange={(e) => upQ(i, { options: q.options.map((x, k) => (k === oi ? { ...x, text: e.target.value } : x)) })}
                      required
                      maxLength={500}
                      className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm focus:outline-none"
                    />
                    {q.options.length > 2 ? (
                      <button type="button" aria-label={`Xóa lựa chọn ${oi + 1}`} className="grid size-7 place-items-center rounded-full text-ink-faint hover:text-danger-700" onClick={() => upQ(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex })}>
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                {q.options.length < 6 ? (
                  <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => upQ(i, { options: [...q.options, { text: "" }] })}>
                    + Thêm lựa chọn
                  </button>
                ) : null}
              </fieldset>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px]">
                <Textarea aria-label="Giải thích" rows={2} value={q.explanation} onChange={(e) => upQ(i, { explanation: e.target.value })} placeholder="Giải thích (hiện sau khi nộp)" maxLength={2000} />
                <Input aria-label="Chủ đề (topic key)" value={q.topicKey} onChange={(e) => upQ(i, { topicKey: e.target.value.toLowerCase() })} placeholder="chu-de (vd: routing)" pattern="[a-z0-9-]*" />
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="soft" onClick={() => setS({ ...s, questions: [...s.questions, { prompt: "", options: [{ text: "" }, { text: "" }], correctIndex: 0, explanation: "", topicKey: "" }] })} disabled={s.questions.length >= 30}>
          + Thêm câu hỏi
        </Button>

        {p.kind === "placement" ? (
          <Card className="space-y-3">
            <h3 className="text-h3">Quy tắc gợi ý</h3>
            <p className="text-sm text-ink-soft">Nếu tỉ lệ đúng của một chủ đề dưới ngưỡng → gợi ý “nên học trước” chương tương ứng; ngược lại → “ôn nhanh”.</p>
            {s.rules.map((r, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_120px_auto]">
                <Input aria-label="Chủ đề" value={r.topicKey} onChange={(e) => setS({ ...s, rules: s.rules.map((x, j) => (j === i ? { ...x, topicKey: e.target.value.toLowerCase() } : x)) })} placeholder="chu-de" />
                <Select aria-label="Chương" value={r.chapterId} onChange={(e) => setS({ ...s, rules: s.rules.map((x, j) => (j === i ? { ...x, chapterId: e.target.value } : x)) })}>
                  {p.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
                <Input aria-label="Ngưỡng %" type="number" min={1} max={100} value={r.thresholdPercent} onChange={(e) => setS({ ...s, rules: s.rules.map((x, j) => (j === i ? { ...x, thresholdPercent: Number(e.target.value) } : x)) })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setS({ ...s, rules: s.rules.filter((_, j) => j !== i) })}>
                  Xóa
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" disabled={!p.chapters.length} onClick={() => setS({ ...s, rules: [...s.rules, { topicKey: "", chapterId: p.chapters[0]?.id ?? "", thresholdPercent: 60 }] })}>
              + Thêm quy tắc
            </Button>
          </Card>
        ) : null}
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" pending={save.pending} className="shadow-lg">
            Lưu quiz
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
