"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExerciseAction, upsertExerciseAction } from "@/modules/exercises/actions";
import { useAction } from "@/components/use-action";
import { useConfirm, useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Item = {
  id: string | null;
  kind: "predict_output" | "find_bug";
  language: string;
  prompt: string;
  code: string;
  options: string[];
  correctOption: number | null;
  bugLines: number[];
  hints: string[];
  explanation: string;
  fixedCode: string;
  status: "draft" | "published";
  version?: number;
};
const blank: Item = { id: null, kind: "predict_output", language: "js", prompt: "", code: "", options: ["", ""], correctOption: 0, bugLines: [], hints: [], explanation: "", fixedCode: "", status: "draft" };

/** P04: soạn bài tập đọc code/tìm lỗi cho bài học. Sửa nội dung → version mới (người học làm lại). */
export function ExercisesEditor({ courseId, lessonId, items }: { courseId: string; lessonId: string; items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState<Item | null>(null);
  const save = useAction(upsertExerciseAction);
  const del = useAction(deleteExerciseAction);
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((x) => (x ? { ...x, [k]: v } : x));

  return (
    <Card className="mt-8 space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h3">Bài tập đọc code</h2>
          <p className="text-sm text-ink-soft">Đoán kết quả hoặc tìm dòng lỗi. Chấm ở server; đáp án chỉ lộ sau khi người học giải đúng hoặc chủ động xem lời giải.</p>
        </div>
        {!f && items.length < 6 ? (
          <Button size="sm" variant="outline" onClick={() => setF(blank)}>
            + Bài tập
          </Button>
        ) : null}
      </div>
      {items.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
          {items.map((it, i) => (
            <li key={it.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-semibold">#{i + 1}</span>
              <Badge tone="brand">{it.kind === "find_bug" ? "Tìm lỗi" : "Đoán kết quả"}</Badge>
              {it.status === "published" ? <Badge tone="success">Hiển thị</Badge> : <Badge>Nháp</Badge>}
              <span className="min-w-0 flex-1 truncate text-ink-soft">{it.prompt}</span>
              <span className="text-xs text-ink-faint">v{it.version}</span>
              <Button size="sm" variant="ghost" onClick={() => setF(it)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const c = await confirm({ title: "Xóa bài tập?", description: "Kết quả làm bài của người học cho bài tập này sẽ không còn hiển thị.", tone: "danger", confirmLabel: "Xóa" });
                  if (!c) return;
                  const r = await del.run({ courseId, lessonId, id: it.id });
                  if (r?.ok) router.refresh();
                }}
              >
                Xóa
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {f ? (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-brand-200 bg-brand-50/40 p-5">
          <FormError error={save.error} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ex-kind" label="Loại">
              <Select id="ex-kind" value={f.kind} onChange={(e) => set("kind", e.target.value as Item["kind"])}>
                <option value="predict_output">Đoán kết quả</option>
                <option value="find_bug">Tìm dòng lỗi</option>
              </Select>
            </Field>
            <Field id="ex-lang" label="Ngôn ngữ">
              <Input id="ex-lang" value={f.language} maxLength={20} onChange={(e) => set("language", e.target.value.toLowerCase())} />
            </Field>
            <Field id="ex-status" label="Trạng thái">
              <Select id="ex-status" value={f.status} onChange={(e) => set("status", e.target.value as Item["status"])}>
                <option value="draft">Nháp (ẩn)</option>
                <option value="published">Hiển thị cho người học</option>
              </Select>
            </Field>
          </div>
          <Field id="ex-prompt" label="Đề bài" errors={save.fieldErrors["data.prompt"]}>
            <Textarea id="ex-prompt" rows={2} value={f.prompt} maxLength={1000} onChange={(e) => set("prompt", e.target.value)} />
          </Field>
          <Field id="ex-code" label="Code" hint="Dòng được đánh số từ 1." errors={save.fieldErrors["data.code"]}>
            <Textarea id="ex-code" rows={8} value={f.code} maxLength={4000} onChange={(e) => set("code", e.target.value)} className="font-mono text-sm" />
          </Field>
          {f.kind === "predict_output" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Lựa chọn (đánh dấu đáp án đúng)</legend>
              {f.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="ex-correct" aria-label={`Đáp án đúng là lựa chọn ${i + 1}`} checked={f.correctOption === i} onChange={() => set("correctOption", i)} className="accent-brand-700" />
                  <Input aria-label={`Lựa chọn ${i + 1}`} value={o} maxLength={300} onChange={(e) => set("options", f.options.map((x, j) => (j === i ? e.target.value : x)))} className="font-mono text-sm" />
                </div>
              ))}
              {f.options.length < 6 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => set("options", [...f.options, ""])}>
                  + Lựa chọn
                </Button>
              ) : null}
              {save.fieldErrors["data.options"] || save.fieldErrors["data.correctOption"] ? <p className="text-sm text-danger-700">{(save.fieldErrors["data.options"] ?? save.fieldErrors["data.correctOption"])?.[0]}</p> : null}
            </fieldset>
          ) : (
            <Field id="ex-lines" label="Dòng có lỗi" hint="Số dòng, cách nhau dấu phẩy (vd 3, 7)" errors={save.fieldErrors["data.bugLines"]}>
              <Input id="ex-lines" value={f.bugLines.join(", ")} onChange={(e) => set("bugLines", e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))} />
            </Field>
          )}
          <Field id="ex-hints" label="Gợi ý (mỗi dòng một mức, tối đa 4)" optional>
            <Textarea id="ex-hints" rows={3} value={f.hints.join("\n")} onChange={(e) => set("hints", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4))} />
          </Field>
          <Field id="ex-expl" label="Giải thích lời giải" errors={save.fieldErrors["data.explanation"]}>
            <Textarea id="ex-expl" rows={3} value={f.explanation} maxLength={3000} onChange={(e) => set("explanation", e.target.value)} />
          </Field>
          <Field id="ex-fixed" label="Code đã sửa" optional>
            <Textarea id="ex-fixed" rows={5} value={f.fixedCode} maxLength={4000} onChange={(e) => set("fixedCode", e.target.value)} className="font-mono text-sm" />
          </Field>
          <div className="flex gap-2">
            <Button
              pending={save.pending}
              onClick={async () => {
                const { id, version: _v, ...data } = f;
                const r = await save.run({ courseId, lessonId, id, data: { ...data, options: data.kind === "predict_output" ? data.options : [] } });
                if (r?.ok) {
                  toast({ tone: "success", message: "Đã lưu bài tập." });
                  setF(null);
                  router.refresh();
                }
              }}
            >
              Lưu bài tập
            </Button>
            <Button variant="ghost" onClick={() => setF(null)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
