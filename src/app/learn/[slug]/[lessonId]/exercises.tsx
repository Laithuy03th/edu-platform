"use client";

import Link from "next/link";
import { useState } from "react";
import { requestHintAction, revealSolutionAction, submitExerciseAction } from "@/modules/exercises/actions";
import type { ExerciseDto } from "@/modules/exercises/service";
import { useAction } from "@/components/use-action";
import { IconCheck, IconSparkle, IconTerminal } from "@/components/icons";
import { Badge, Button } from "@/components/ui";

/**
 * P04: đọc code đoán kết quả / tìm dòng lỗi. Mọi chấm điểm ở server; đáp án và lời giải chỉ có trong
 * phản hồi SAU khi giải đúng hoặc bấm "Xem lời giải". Gợi ý mở dần từng mức.
 */
export function CodeExercises({ items, canTrack, loginHref }: { items: ExerciseDto[]; canTrack: boolean; loginHref: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="ex-title" className="space-y-5">
      <h2 id="ex-title" className="text-h2 flex items-center gap-2">
        <IconTerminal className="text-brand-600" /> Luyện đọc code
      </h2>
      {items.map((e, i) => (
        <Exercise key={e.id} initial={e} index={i + 1} canTrack={canTrack} loginHref={loginHref} />
      ))}
    </section>
  );
}

function Exercise({ initial, index, canTrack, loginHref }: { initial: ExerciseDto; index: number; canTrack: boolean; loginHref: string }) {
  const [e, setE] = useState(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const [lines, setLines] = useState<number[]>([]);
  const [result, setResult] = useState<null | boolean>(null);
  const hint = useAction(requestHintAction);
  const submit = useAction(submitExerciseAction);
  const reveal = useAction(revealSolutionAction);
  const done = e.solved || e.revealed;
  const codeLines = e.code.split("\n");
  const correctLines = new Set(e.solution?.lines ?? []);

  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-5 py-3">
        <span className="font-semibold text-ink">Bài {index}</span>
        <Badge tone="brand">{e.kind === "find_bug" ? "Tìm dòng lỗi" : "Đoán kết quả"}</Badge>
        {e.solved ? <Badge tone="success">Đã giải</Badge> : e.revealed ? <Badge>Đã xem lời giải</Badge> : null}
        {e.attempts ? <span className="ml-auto text-xs text-ink-faint">{e.attempts} lần thử</span> : null}
      </header>
      <div className="space-y-4 p-5">
        <p className="text-ink">{inlineCode(e.prompt)}</p>
        <div className="overflow-x-auto rounded-[var(--radius-md)] bg-[#0d1117] py-3 font-mono text-[13.5px] leading-6 text-[#e6edf3]" role={e.kind === "find_bug" ? "group" : undefined} aria-label={e.kind === "find_bug" ? "Chọn các dòng có lỗi" : undefined}>
          {codeLines.map((ln, idx) => {
            const n = idx + 1;
            const sel = lines.includes(n);
            const isBug = done && correctLines.has(n);
            const cls = `flex w-full gap-4 px-4 text-left ${isBug ? "bg-danger-700/40" : sel ? "bg-brand-500/30" : ""}`;
            const body = (
              <>
                <span className="w-6 shrink-0 select-none text-right text-[#6e7681]">{n}</span>
                <span className="whitespace-pre">{ln || " "}</span>
              </>
            );
            return e.kind === "find_bug" && !done && canTrack ? (
              <button key={n} type="button" aria-pressed={sel} onClick={() => setLines(sel ? lines.filter((x) => x !== n) : [...lines, n])} className={`${cls} hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-300`}>
                {body}
              </button>
            ) : (
              <div key={n} className={cls}>
                {body}
              </div>
            );
          })}
        </div>

        {e.kind === "predict_output" ? (
          <fieldset className="grid gap-2 sm:grid-cols-2" disabled={done || !canTrack}>
            <legend className="sr-only">Chọn kết quả</legend>
            {e.options.map((o) => {
              const right = done && e.solution?.optionId === o.optionId;
              return (
                <label key={o.optionId} className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 font-mono text-sm transition ${right ? "border-success-600 bg-success-50" : picked === o.optionId ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-300"}`}>
                  <input type="radio" name={`ex-${e.id}`} className="accent-brand-700" checked={picked === o.optionId} onChange={() => setPicked(o.optionId)} />
                  <span className="whitespace-pre-wrap">{o.text}</span>
                  {right ? <IconCheck size={16} className="ml-auto text-success-700" /> : null}
                </label>
              );
            })}
          </fieldset>
        ) : !done && canTrack ? (
          <p className="text-sm text-ink-soft">Bấm vào dòng bạn cho là có lỗi (có thể chọn nhiều dòng). Đang chọn: {lines.length ? lines.sort((a, b) => a - b).join(", ") : "chưa có"}</p>
        ) : null}

        {e.hints.length ? (
          <ol className="space-y-2">
            {e.hints.map((h, i) => (
              <li key={i} className="flex gap-2 rounded-[var(--radius-md)] border border-warning-200 bg-warning-50 px-4 py-2.5 text-sm text-warning-800">
                <IconSparkle size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Gợi ý {i + 1}:</strong> {h}
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {result === false && !done ? <p className="text-sm font-semibold text-danger-700" role="status">Chưa đúng — thử lại hoặc mở gợi ý.</p> : null}
        {e.solved && result === true ? <p className="text-sm font-semibold text-success-700" role="status">Chính xác!</p> : null}

        {!canTrack ? (
          <p className="text-sm text-ink-soft">
            <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
              Đăng nhập và đăng ký khóa
            </Link>{" "}
            để làm bài và lưu kết quả.
          </p>
        ) : !done ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              pending={submit.pending}
              disabled={e.kind === "predict_output" ? !picked : lines.length === 0}
              onClick={async () => {
                const r = await submit.run({ id: e.id, optionId: picked, lines });
                if (r?.ok) {
                  setResult(r.data.correct);
                  setE(r.data);
                }
              }}
            >
              Kiểm tra
            </Button>
            {e.hints.length < e.hintCount ? (
              <Button
                size="sm"
                variant="outline"
                pending={hint.pending}
                onClick={async () => {
                  const r = await hint.run({ id: e.id });
                  if (r?.ok) setE(r.data);
                }}
              >
                Gợi ý ({e.hints.length}/{e.hintCount})
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              pending={reveal.pending}
              onClick={async () => {
                const r = await reveal.run({ id: e.id });
                if (r?.ok) setE(r.data);
              }}
            >
              Xem lời giải
            </Button>
          </div>
        ) : null}
        {submit.error ? <p className="text-sm text-danger-700">{submit.error.message}</p> : null}

        {e.solution ? (
          <div className="space-y-3 rounded-[var(--radius-md)] border border-success-200 bg-success-50/60 p-4">
            <p className="text-sm font-bold text-success-700">Lời giải</p>
            <p className="whitespace-pre-line text-sm text-ink">{inlineCode(e.solution.explanation)}</p>
            {e.solution.fixedCode ? <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[#0d1117] p-3 font-mono text-[13px] leading-6 text-[#e6edf3]">{e.solution.fixedCode}</pre> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** `code` trong chữ thuần → <code> (không dùng HTML từ dữ liệu, không XSS). */
function inlineCode(s: string) {
  return s.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code key={i} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[0.9em] text-brand-800">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
