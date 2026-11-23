"use client";

import { useRouter } from "next/navigation";
import { acceptAnswerAction, answerQuestionAction, askQuestionAction, deleteOwnPostAction, markHelpfulAction, reportContentAction } from "@/modules/discussions/actions";
import { FormError } from "@/components/form-error";
import { Markdown } from "@/components/markdown";
import { Badge, Button, Input, Textarea } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";
import { useConfirm, useToast } from "@/components/overlays";

type QA = {
  total: number;
  isInstructor: boolean;
  items: {
    id: string;
    title: string;
    body: string;
    author: string;
    mine: boolean;
    acceptedAnswerId: string | null;
    createdAt: string;
    answers: { id: string; body: string; author: string; isInstructor: boolean; helpful: boolean; mine: boolean; createdAt: string }[];
  }[];
};

export function QaSection({ lessonId, data, verified }: { lessonId: string; data: QA; verified: boolean }) {
  const router = useRouter();
  const ask = useAction(askQuestionAction, { onSuccess: () => router.refresh() });
  return (
    <section id="hoi-dap" aria-labelledby="qa-heading" className="space-y-4">
      <h2 id="qa-heading" className="text-lg font-semibold">
        Hỏi đáp ({data.total})
      </h2>
      {verified ? (
        <form
          className="space-y-2 rounded-lg border border-line bg-white p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const r = await ask.run({ ...formToObject(form), lessonId });
            if (r?.ok) form.reset();
          }}
        >
          <FormError error={ask.error} />
          <Input name="title" placeholder="Tiêu đề câu hỏi" maxLength={150} aria-label="Tiêu đề câu hỏi" required />
          <Textarea name="body" rows={3} placeholder="Mô tả vấn đề (Markdown, không hỗ trợ ảnh)" maxLength={5000} aria-label="Nội dung câu hỏi" required />
          <Button type="submit" pending={ask.pending}>
            Đặt câu hỏi
          </Button>
        </form>
      ) : (
        <p className="text-sm text-ink-faint">Xác minh email để đặt câu hỏi.</p>
      )}
      <ul className="space-y-4">
        {data.items.map((q) => (
          <Question key={q.id} q={q} isInstructor={data.isInstructor} verified={verified} />
        ))}
      </ul>
    </section>
  );
}

function Question({ q, isInstructor, verified }: { q: QA["items"][number]; isInstructor: boolean; verified: boolean }) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const answer = useAction(answerQuestionAction, { onSuccess: () => router.refresh() });
  const act = useAction(async (fn: () => Promise<unknown>) => {
    await fn();
    router.refresh();
    return { ok: true as const, data: null };
  });
  const report = async (targetType: "question" | "answer", targetId: string) => {
    const r = await confirm({ title: "Báo cáo nội dung", description: "Quản trị viên sẽ xem xét. Mô tả ngắn vấn đề (spam, xúc phạm, lạc đề…).", requireReason: "Lý do", tone: "brand", confirmLabel: "Gửi báo cáo" });
    if (!r.ok) return;
    const res = await reportContentAction({ targetType, targetId, reason: "other", note: r.reason.slice(0, 500) }).catch(() => null);
    toast(res?.ok ? { tone: "success", message: "Đã gửi báo cáo. Cảm ơn bạn." } : { tone: "error", message: "Không gửi được báo cáo." });
  };
  return (
    <li className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{q.title}</p>
        <span className="shrink-0 text-xs text-ink-faint">{q.author}</span>
      </div>
      <Markdown className="prose prose-sm mt-1 max-w-none">{q.body}</Markdown>
      <div className="mt-1 flex gap-3 text-xs text-ink-faint">
        {q.mine ? (
          <button type="button" className="hover:underline" onClick={async () => (await confirm({ title: "Xóa câu hỏi?", confirmLabel: "Xóa" })).ok && act.run(() => deleteOwnPostAction({ target: "question", id: q.id }))}>
            Xóa
          </button>
        ) : (
          <button type="button" className="hover:underline" onClick={() => report("question", q.id)}>
            Báo cáo
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-2 border-l-2 border-line pl-3">
        {q.answers.map((a) => (
          <li key={a.id} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{a.author}</span>
              {a.isInstructor ? <Badge tone="info">Giảng viên</Badge> : null}
              {q.acceptedAnswerId === a.id ? <Badge tone="success">✓ Được chấp nhận</Badge> : null}
              {a.helpful ? <Badge tone="success">Hữu ích</Badge> : null}
            </div>
            <Markdown className="prose prose-sm max-w-none">{a.body}</Markdown>
            <div className="flex gap-3 text-xs text-ink-faint">
              {q.mine ? (
                <button type="button" className="hover:underline" onClick={() => act.run(() => acceptAnswerAction({ answerId: a.id, accept: q.acceptedAnswerId !== a.id }))}>
                  {q.acceptedAnswerId === a.id ? "Bỏ chấp nhận" : "Chấp nhận"}
                </button>
              ) : null}
              {isInstructor ? (
                <button type="button" className="hover:underline" onClick={() => act.run(() => markHelpfulAction({ answerId: a.id, helpful: !a.helpful }))}>
                  {a.helpful ? "Bỏ đánh dấu hữu ích" : "Đánh dấu hữu ích"}
                </button>
              ) : null}
              {a.mine ? (
                <button type="button" className="hover:underline" onClick={async () => (await confirm({ title: "Xóa câu trả lời?", confirmLabel: "Xóa" })).ok && act.run(() => deleteOwnPostAction({ target: "answer", id: a.id }))}>
                  Xóa
                </button>
              ) : (
                <button type="button" className="hover:underline" onClick={() => report("answer", a.id)}>
                  Báo cáo
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {verified ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const r = await answer.run({ ...formToObject(form), questionId: q.id });
            if (r?.ok) form.reset();
          }}
        >
          <Input name="body" placeholder="Viết câu trả lời…" aria-label="Câu trả lời" maxLength={5000} required />
          <Button type="submit" variant="outline" pending={answer.pending}>
            Gửi
          </Button>
        </form>
      ) : null}
      <FormError error={answer.error} />
    </li>
  );
}
