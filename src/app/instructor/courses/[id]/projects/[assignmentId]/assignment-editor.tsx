"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveAssignmentDraftAction } from "@/modules/projects/actions";
import { FormError } from "@/components/form-error";
import { IconTrash } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";

type R = { criterionId?: string; title: string; maxPoints: number; passDescription: string; failDescription: string; skillTag: string };
type Init = { title: string; brief: string; objectives: string; requirements: string; checklist: string; rubric: R[]; resources: { title: string; url: string }[]; maxRounds: number };
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function AssignmentEditor(p: { courseId: string; assignmentId: string; revision: number; locked: boolean; initial: Init }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<Init>(p.initial);
  const save = useAction(saveAssignmentDraftAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã lưu bài tập." });
      router.refresh();
    },
  });
  const total = s.rubric.reduce((a, r) => a + (Number(r.maxPoints) || 0), 0);
  const upR = (i: number, patch: Partial<R>) => setS((x) => ({ ...x, rubric: x.rubric.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ courseId: p.courseId, assignmentId: p.assignmentId, expectedRevision: p.revision, title: s.title, brief: s.brief, objectives: lines(s.objectives), requirements: lines(s.requirements), checklist: lines(s.checklist), rubric: s.rubric, resources: s.resources.filter((r) => r.title && r.url), maxRounds: s.maxRounds });
      }}
    >
      <fieldset disabled={p.locked} className="space-y-6">
        <FormError error={save.error} />
        <Card className="space-y-4">
          <Field id="atitle" label="Tên bài tập">
            <Input id="atitle" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} required maxLength={150} />
          </Field>
          <Field id="brief" label="Đề bài (Markdown)">
            <Textarea id="brief" rows={8} value={s.brief} onChange={(e) => setS({ ...s, brief: e.target.value })} maxLength={10000} className="font-mono text-sm" />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field id="obj" label="Mục tiêu" hint="Mỗi dòng một mục">
              <Textarea id="obj" rows={4} value={s.objectives} onChange={(e) => setS({ ...s, objectives: e.target.value })} />
            </Field>
            <Field id="req" label="Yêu cầu" hint="Mỗi dòng một mục">
              <Textarea id="req" rows={4} value={s.requirements} onChange={(e) => setS({ ...s, requirements: e.target.value })} />
            </Field>
            <Field id="chk" label="Checklist nghiệm thu" hint="Mỗi dòng một mục">
              <Textarea id="chk" rows={4} value={s.checklist} onChange={(e) => setS({ ...s, checklist: e.target.value })} />
            </Field>
          </div>
          <Field id="rounds" label="Số lượt nộp tối đa (1–5)">
            <Input id="rounds" type="number" min={1} max={5} value={s.maxRounds} onChange={(e) => setS({ ...s, maxRounds: Number(e.target.value) })} className="w-28" />
          </Field>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h3">Rubric</h3>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-800">Tổng {total} điểm</span>
          </div>
          {s.rubric.map((r, i) => (
            <div key={i} className="space-y-2 rounded-[var(--radius-md)] border border-line p-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_110px_160px_auto]">
                <Input aria-label="Tiêu chí" value={r.title} onChange={(e) => upR(i, { title: e.target.value })} placeholder="Tiêu chí" required maxLength={150} />
                <Input aria-label="Điểm tối đa" type="number" min={1} max={100} value={r.maxPoints} onChange={(e) => upR(i, { maxPoints: Number(e.target.value) })} />
                <Input aria-label="Kỹ năng" value={r.skillTag} onChange={(e) => upR(i, { skillTag: e.target.value })} placeholder="kỹ năng (vd: nextjs-routing)" maxLength={50} />
                <button type="button" aria-label={`Xóa tiêu chí ${i + 1}`} onClick={() => setS({ ...s, rubric: s.rubric.filter((_, j) => j !== i) })} className="grid size-11 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700">
                  <IconTrash size={16} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input aria-label="Mô tả đạt" value={r.passDescription} onChange={(e) => upR(i, { passDescription: e.target.value })} placeholder="✓ Đạt khi…" maxLength={500} />
                <Input aria-label="Mô tả chưa đạt" value={r.failDescription} onChange={(e) => upR(i, { failDescription: e.target.value })} placeholder="✗ Chưa đạt khi…" maxLength={500} />
              </div>
            </div>
          ))}
          <Button type="button" variant="soft" size="sm" disabled={s.rubric.length >= 10} onClick={() => setS({ ...s, rubric: [...s.rubric, { title: "", maxPoints: 10, passDescription: "", failDescription: "", skillTag: "" }] })}>
            + Thêm tiêu chí
          </Button>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-h3">Tài liệu tham khảo</h3>
          {s.resources.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
              <Input aria-label="Tên tài liệu" value={r.title} onChange={(e) => setS({ ...s, resources: s.resources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Tên" />
              <Input aria-label="URL" type="url" value={r.url} onChange={(e) => setS({ ...s, resources: s.resources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="https://" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setS({ ...s, resources: s.resources.filter((_, j) => j !== i) })}>
                Xóa
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={s.resources.length >= 10} onClick={() => setS({ ...s, resources: [...s.resources, { title: "", url: "" }] })}>
            + Thêm tài liệu
          </Button>
        </Card>
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" pending={save.pending} className="shadow-lg">
            Lưu bài tập
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
