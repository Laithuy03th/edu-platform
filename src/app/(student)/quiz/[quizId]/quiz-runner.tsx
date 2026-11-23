"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuizResultDto } from "@/modules/quizzes/service";
import { getAttemptResultAction, submitQuizAction } from "@/modules/learning/actions";
import { FormError } from "@/components/form-error";
import { IconAlert, IconCheck, IconClose, IconRepeat, IconTarget } from "@/components/icons";
import { Badge, Button, ProgressRing, buttonClass, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";
import type { ActionError } from "@/lib/errors";

type Quiz = {
  quizId: string;
  kind: "lesson" | "placement";
  courseSlug: string;
  version: number;
  title: string;
  passPercent: number;
  questions: { questionId: string; prompt: string; options: { optionId: string; text: string }[] }[];
  result: { best: number; latest: number; attemptCount: number } | null;
  attempts: { id: string; scorePercent: number; passed: boolean; submittedAt: string; outdated: boolean }[];
};

const LETTERS = "ABCDEF";

/**
 * Trạng thái: chưa làm → đang làm → đã nộp. Đáp án tạm giữ trong sessionStorage; submissionId cố định
 * cho tới khi nộp thành công → gửi lại sau lỗi mạng không tạo attempt trùng. Chấm điểm hoàn toàn ở server.
 */
export function QuizRunner({ quiz, backHref }: { quiz: Quiz; backHref: string }) {
  const storeKey = `tuhoc.quiz.${quiz.quizId}.v${quiz.version}`;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string>("");
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [started, setStarted] = useState(false);
  const [netError, setNetError] = useState<ActionError | null>(null);
  const submit = useAction(submitQuizAction, {
    onSuccess: (r) => {
      setResult(r);
      sessionStorage.removeItem(storeKey);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const view = useAction(getAttemptResultAction, { onSuccess: (r) => setResult(r) });

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "null") as { answers: Record<string, string>; submissionId: string } | null;
      if (saved) {
        setAnswers(saved.answers);
        setSubmissionId(saved.submissionId);
        setStarted(true);
        return;
      }
    } catch {
      /* ignore */
    }
    setSubmissionId(crypto.randomUUID());
  }, [storeKey]);

  useEffect(() => {
    if (started && submissionId) sessionStorage.setItem(storeKey, JSON.stringify({ answers, submissionId }));
  }, [answers, submissionId, started, storeKey]);

  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;

  async function doSubmit() {
    setNetError(null);
    const r = await submit.run({ quizId: quiz.quizId, quizVersion: quiz.version, submissionId, answers: quiz.questions.map((q) => ({ questionId: q.questionId, optionId: answers[q.questionId] ?? null })) });
    if (!r) setNetError({ code: "INTERNAL_ERROR", message: "Mất kết nối khi nộp bài. Đáp án vẫn được giữ — bấm Nộp bài lần nữa (không bị tính trùng)." });
  }

  if (result) return <ResultView quiz={quiz} result={result} backHref={backHref} onRetry={() => { setResult(null); setAnswers({}); setSubmissionId(crypto.randomUUID()); setStarted(true); }} />;

  if (!started) {
    return (
      <div className="mt-6 animate-fade-up rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-sm sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">{quiz.kind === "placement" ? <IconTarget /> : <IconRepeat />}</span>
        <h1 className="text-h1 mt-4">{quiz.title}</h1>
        <p className="mt-2 text-ink-soft">
          {total} câu một lựa chọn{quiz.kind === "lesson" ? ` · đạt từ ${quiz.passPercent}%` : ""}. {quiz.kind === "placement" ? "Kết quả gợi ý chương nên học trước — không tự đánh dấu hoàn thành bài nào. Bạn có thể bỏ qua và học theo thứ tự." : "Câu sai sẽ được đưa vào lịch ôn tập."}
        </p>
        {quiz.result ? (
          <p className="mt-3 text-sm text-ink-soft">
            Đã làm {quiz.result.attemptCount} lần · cao nhất <strong>{quiz.result.best}%</strong> · gần nhất {quiz.result.latest}%
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => setStarted(true)}>
            Bắt đầu làm bài
          </Button>
          {quiz.kind === "placement" ? (
            <Link href={backHref} className={buttonClass("ghost", undefined, "lg")}>
              Bỏ qua, học theo thứ tự
            </Link>
          ) : null}
        </div>
        {quiz.attempts.length ? (
          <div className="mt-8 border-t border-line pt-5">
            <p className="text-caption mb-2 text-ink-faint">Lịch sử (10 lần gần nhất)</p>
            <ul className="space-y-1">
              {quiz.attempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="w-36 text-ink-faint">{new Date(a.submittedAt).toLocaleString("vi-VN")}</span>
                  <span className="font-semibold tabular-nums">{a.scorePercent}%</span>
                  {quiz.kind === "lesson" ? <Badge tone={a.passed ? "success" : "neutral"}>{a.passed ? "Đạt" : "Chưa đạt"}</Badge> : null}
                  {a.outdated ? <Badge>Phiên bản cũ</Badge> : null}
                  <button type="button" className="ml-auto text-brand-700 hover:underline" onClick={() => view.run({ attemptId: a.id })}>
                    Xem lại
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void doSubmit();
      }}
    >
      <div className="sticky top-16 z-10 -mx-2 flex items-center gap-4 rounded-full border border-line bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="truncate text-sm font-semibold">{quiz.title}</p>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm tabular-nums text-ink-soft" aria-live="polite">
            {answered}/{total} câu
          </span>
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-brand-100 sm:block">
            <div className="h-full rounded-full bg-brand-700 transition-[width] duration-300" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
      </div>
      {quiz.questions.map((q, i) => (
        <fieldset key={q.questionId} className="animate-fade-up rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs sm:p-6" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
          <legend className="sr-only">Câu {i + 1}</legend>
          <p className="text-caption text-brand-700">Câu {i + 1}</p>
          <p className="mt-1 text-lg font-semibold leading-snug">{q.prompt.replace(/`/g, "")}</p>
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label={`Lựa chọn câu ${i + 1}`}>
            {q.options.map((o, oi) => {
              const checked = answers[q.questionId] === o.optionId;
              return (
                <label
                  key={o.optionId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
                    checked ? "border-brand-700 bg-brand-50 shadow-xs" : "border-line hover:border-brand-300 hover:bg-brand-50/50",
                  )}
                >
                  <input type="radio" name={q.questionId} value={o.optionId} checked={checked} onChange={() => setAnswers((a) => ({ ...a, [q.questionId]: o.optionId }))} className="sr-only" />
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition", checked ? "bg-brand-700 text-white" : "bg-brand-100 text-brand-800")}>{LETTERS[oi]}</span>
                  <span className="text-ink">{o.text.replace(/`/g, "")}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <FormError error={submit.error?.code === "QUIZ_VERSION_CHANGED" ? { ...submit.error, message: submit.error.message + " Tải lại trang để làm phiên bản mới." } : (submit.error ?? netError)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-faint">{answered < total ? `Còn ${total - answered} câu chưa trả lời (vẫn nộp được).` : "Đã trả lời đủ."}</p>
        <Button type="submit" size="lg" pending={submit.pending}>
          Nộp bài
        </Button>
      </div>
    </form>
  );
}

function ResultView({ quiz, result, backHref, onRetry }: { quiz: Quiz; result: QuizResultDto; backHref: string; onRetry: () => void }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="animate-scale-in rounded-[var(--radius-xl)] border border-line bg-surface p-6 text-center shadow-md sm:p-8">
        <div className="mx-auto w-fit animate-pop">
          <ProgressRing value={result.scorePercent} size={112} label="Điểm" />
        </div>
        <h1 className="text-h2 mt-4">
          {quiz.kind === "placement" ? "Kết quả đánh giá đầu vào" : result.passed ? "Bạn đã đạt!" : "Chưa đạt — thử lại nhé"}
        </h1>
        <p className="mt-1 text-ink-soft">
          Đúng {result.correctCount}/{result.total} câu{quiz.kind === "lesson" ? ` · cần ${result.passPercent}% để đạt` : ""}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={onRetry}>
            Làm lại
          </Button>
          <Link href={backHref} className={buttonClass("primary")}>
            Quay lại bài học
          </Link>
        </div>
      </div>

      {result.recommendations.length ? (
        <section className="rounded-[var(--radius-xl)] bg-brand-50/70 p-6">
          <h2 className="text-h3">Gợi ý lộ trình học</h2>
          <p className="mt-1 text-sm text-ink-soft">Theo quy tắc: dưới 60% ở một chủ đề → nên học chương đó trước. Gợi ý không tự hoàn thành bài nào.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.recommendations.map((r) => (
              <li key={r.chapterId} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
                <Badge tone={r.kind === "study_first" ? "warning" : "success"}>{r.kind === "study_first" ? "Nên học trước" : "Có thể ôn nhanh"}</Badge>
                <p className="mt-2 font-semibold">{r.chapterTitle}</p>
                <p className="text-sm text-ink-faint">Chủ đề “{r.topicKey}”: {r.percent}% đúng</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="space-y-4">
        {result.questions.map((q, i) => (
          <li key={q.questionId} className={cn("rounded-[var(--radius-lg)] border bg-surface p-5", q.correct ? "border-success-200" : "border-danger-200")}>
            <div className="flex items-start gap-3">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-white", q.correct ? "bg-success-600" : "bg-danger-700")}>{q.correct ? <IconCheck size={16} /> : <IconClose size={16} />}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-faint">
                  Câu {i + 1} · {q.correct ? "Đúng" : q.selectedOptionId ? "Sai" : "Chưa trả lời"}
                </p>
                <p className="mt-0.5 font-semibold">{q.prompt.replace(/`/g, "")}</p>
                <ul className="mt-3 space-y-1.5">
                  {q.options.map((o) => {
                    const isCorrect = q.correctOptionId === o.optionId;
                    const isSelected = q.selectedOptionId === o.optionId;
                    return (
                      <li key={o.optionId} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", isCorrect ? "bg-success-50 text-success-700" : isSelected ? "bg-danger-50 text-danger-800" : "text-ink-soft")}>
                        {isCorrect ? <IconCheck size={14} /> : isSelected ? <IconClose size={14} /> : <span className="w-3.5" />}
                        <span className="flex-1">{o.text.replace(/`/g, "")}</span>
                        {isSelected ? <span className="text-xs font-semibold">Bạn chọn</span> : null}
                        {isCorrect ? <span className="text-xs font-semibold">Đáp án đúng</span> : null}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation ? (
                  <p className="mt-3 flex gap-2 rounded-lg bg-brand-50/70 p-3 text-sm text-ink-soft">
                    <IconAlert size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    {q.explanation.replace(/`/g, "")}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
