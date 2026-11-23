"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createLessonAction,
  deleteChapterAction,
  deleteLessonAction,
  moveItemAction,
  saveChapterAction,
  setCourseStatusAction,
  submitForReviewAction,
  updateCourseAction,
  withdrawSubmissionAction,
} from "@/modules/courses/actions";
import { createQuizAction } from "@/modules/quizzes/actions";
import { createAssignmentAction } from "@/modules/projects/actions";
import type { ActionResult } from "@/lib/errors";
import { FormError } from "@/components/form-error";
import { Markdown } from "@/components/markdown";
import { IconAlert, IconArrowRight, IconBook, IconCheck, IconChevronDown, IconEdit, IconPlay, IconTrash } from "@/components/icons";
import { Dialog, Tabs, useConfirm, useToast } from "@/components/overlays";
import { Alert, Badge, Button, Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { useAction } from "@/components/use-action";

type Lesson = { id: string; title: string; type: string; isPreview: boolean; isRequired: boolean; hasQuiz: boolean; published: boolean };
type Chapter = { id: string; title: string; description: string; lessons: Lesson[] };
type Props = {
  courseId: string;
  revision: number;
  status: string;
  review: { state: string; rejectReason: string | null };
  isAdmin: boolean;
  draft: { title: string; shortDescription: string; description: string; learningObjectives: string; prerequisites: string; categoryId: string; level: string; thumbnailMediaId: string; placementQuizId: string };
  categories: { id: string; name: string }[];
  images: { id: string; label: string }[];
  chapters: Chapter[];
  quizzes: { id: string; kind: string; title: string; count: number; published: boolean }[];
  assignments: { id: string; title: string }[];
  problems: string[];
};

/** Hook gọi mutation khóa học: gửi expectedRevision, làm mới trang khi xong (revision mới từ server). */
function useMutation() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  return {
    pending,
    async run<T>(fn: () => Promise<ActionResult<T>>, ok?: string): Promise<ActionResult<T> | null> {
      setPending(true);
      const r = await fn().catch(() => null);
      setPending(false);
      if (r?.ok) {
        if (ok) toast({ tone: "success", message: ok });
        router.refresh();
      } else {
        toast({ tone: "error", message: r?.error.message ?? "Không kết nối được máy chủ." });
        if (r?.error.code === "STALE_REVISION") router.refresh();
      }
      return r;
    },
  };
}

export function CourseEditor(p: Props) {
  const locked = p.review.state === "pending";
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-8">
        {locked ? <Alert tone="info" title="Đang chờ duyệt">Nội dung bị khóa chỉnh sửa trong lúc chờ duyệt. Rút yêu cầu duyệt nếu cần sửa tiếp.</Alert> : null}
        {p.review.state === "rejected" && p.review.rejectReason ? <Alert tone="danger" title="Quản trị viên đã từ chối">{p.review.rejectReason}</Alert> : null}
        <Tabs
          tabs={[
            { id: "curriculum", label: "Nội dung khóa học", content: <Curriculum {...p} locked={locked} /> },
            { id: "info", label: "Thông tin khóa học", content: <InfoForm {...p} locked={locked} /> },
            { id: "extras", label: "Quiz & dự án", content: <Extras {...p} locked={locked} /> },
          ]}
        />
      </div>
      <aside className="space-y-6">
        <ReviewPanel {...p} />
      </aside>
    </div>
  );
}

/* ------------------------- Thông tin khóa ------------------------- */

function InfoForm(p: Props & { locked: boolean }) {
  const a = useAction(updateCourseAction);
  const router = useRouter();
  const toast = useToast();
  const [desc, setDesc] = useState(p.draft.description);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  const fe = a.fieldErrors;
  return (
    <form
      className="space-y-5"
      onChange={() => setDirty(true)}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await a.run({
          courseId: p.courseId,
          expectedRevision: p.revision,
          title: f.get("title"),
          shortDescription: f.get("shortDescription"),
          description: desc,
          learningObjectives: f.get("learningObjectives"),
          prerequisites: f.get("prerequisites"),
          categoryId: f.get("categoryId") || null,
          level: f.get("level"),
          thumbnailMediaId: f.get("thumbnailMediaId") || null,
        });
        if (r?.ok) {
          setDirty(false);
          toast({ tone: "success", message: "Đã lưu thông tin khóa học." });
          router.refresh();
        }
      }}
    >
      <fieldset disabled={p.locked} className="space-y-5">
        <FormError error={a.error} />
        <Field id="title" label="Tên khóa học" errors={fe.title}>
          <Input id="title" name="title" defaultValue={p.draft.title} maxLength={120} required />
        </Field>
        <Field id="shortDescription" label="Mô tả ngắn" hint="Hiển thị trên thẻ khóa học (≤ 200 ký tự)." errors={fe.shortDescription}>
          <Input id="shortDescription" name="shortDescription" defaultValue={p.draft.shortDescription} maxLength={200} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Mô tả chi tiết (Markdown)</p>
          <Tabs
            tabs={[
              { id: "write", label: "Soạn", content: <Textarea aria-label="Mô tả chi tiết" rows={10} value={desc} onChange={(e) => (setDesc(e.target.value), setDirty(true))} maxLength={20000} className="font-mono text-sm" /> },
              { id: "preview", label: "Xem trước", content: <div className="min-h-40 rounded-[var(--radius-sm)] border border-line p-4">{desc.trim() ? <Markdown>{desc}</Markdown> : <p className="text-sm text-ink-faint">Chưa có nội dung.</p>}</div> },
            ]}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="learningObjectives" label="Mục tiêu học tập" hint="Mỗi dòng một mục (tối đa 10)." errors={fe.learningObjectives}>
            <Textarea id="learningObjectives" name="learningObjectives" rows={5} defaultValue={p.draft.learningObjectives} />
          </Field>
          <Field id="prerequisites" label="Kiến thức đầu vào" hint="Mỗi dòng một mục." errors={fe.prerequisites}>
            <Textarea id="prerequisites" name="prerequisites" rows={5} defaultValue={p.draft.prerequisites} />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field id="categoryId" label="Chủ đề">
            <Select id="categoryId" name="categoryId" defaultValue={p.draft.categoryId}>
              <option value="">— Chọn —</option>
              {p.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="level" label="Cấp độ">
            <Select id="level" name="level" defaultValue={p.draft.level}>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung cấp</option>
              <option value="advanced">Nâng cao</option>
            </Select>
          </Field>
          <Field id="thumbnailMediaId" label="Ảnh bìa" hint={p.images.length ? undefined : "Tải ảnh lên trong Thư viện media."}>
            <Select id="thumbnailMediaId" name="thumbnailMediaId" defaultValue={p.draft.thumbnailMediaId}>
              <option value="">— Dùng ảnh bìa mặc định —</option>
              {p.images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" pending={a.pending}>
            Lưu thông tin
          </Button>
          <span className="text-sm" aria-live="polite">
            {dirty ? <span className="text-warning-800">● Có thay đổi chưa lưu</span> : <span className="text-ink-faint">Đã lưu</span>}
          </span>
        </div>
      </fieldset>
    </form>
  );
}

/* ------------------------- Curriculum ------------------------- */

function Curriculum(p: Props & { locked: boolean }) {
  const m = useMutation();
  const confirm = useConfirm();
  const [newChapter, setNewChapter] = useState("");
  const [lessonDialog, setLessonDialog] = useState<string | null>(null);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const move = (kind: "chapter" | "lesson", id: string, direction: "up" | "down") => m.run(() => moveItemAction({ courseId: p.courseId, kind, id, direction, expectedRevision: p.revision }));
  return (
    <div className={cn("space-y-4", m.pending && "opacity-70 transition-opacity")} aria-busy={m.pending}>
      {p.chapters.length === 0 ? <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong p-6 text-center text-sm text-ink-faint">Chưa có chương nào. Thêm chương đầu tiên bên dưới.</p> : null}
      {p.chapters.map((ch, ci) => (
        <section key={ch.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-xs">
          <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-4 py-3">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">{ci + 1}</span>
            <p className="min-w-0 flex-1 font-semibold">{ch.title}</p>
            <div className="flex items-center gap-0.5">
              <MoveButtons disabled={p.locked} first={ci === 0} last={ci === p.chapters.length - 1} onMove={(d) => move("chapter", ch.id, d)} label={`chương ${ch.title}`} />
              <button type="button" disabled={p.locked} onClick={() => setEditChapter(ch)} aria-label={`Sửa chương ${ch.title}`} className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-brand-50 hover:text-ink disabled:opacity-40">
                <IconEdit size={15} />
              </button>
              <button
                type="button"
                disabled={p.locked}
                aria-label={`Xóa chương ${ch.title}`}
                className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
                onClick={async () => {
                  if ((await confirm({ title: `Xóa chương “${ch.title}”?`, description: "Chỉ xóa được chương không còn bài học. Bản đã xuất bản giữ nguyên tới lần duyệt sau.", confirmLabel: "Xóa chương" })).ok)
                    m.run(() => deleteChapterAction({ courseId: p.courseId, chapterId: ch.id, expectedRevision: p.revision }), "Đã xóa chương.");
                }}
              >
                <IconTrash size={15} />
              </button>
            </div>
          </header>
          <ul className="divide-y divide-line">
            {ch.lessons.map((l, li) => (
              <li key={l.id} className="group flex flex-wrap items-center gap-3 px-4 py-2.5 transition hover:bg-brand-50/50">
                <span className="text-ink-faint">{l.type === "video" ? <IconPlay size={14} /> : <IconBook size={15} />}</span>
                <Link href={`/instructor/courses/${p.courseId}/lessons/${l.id}`} className="min-w-0 flex-1 font-medium hover:text-brand-700">
                  {l.title}
                </Link>
                <span className="flex flex-wrap gap-1">
                  {l.isPreview ? <Badge tone="success">Học thử</Badge> : null}
                  {!l.isRequired ? <Badge>Tùy chọn</Badge> : null}
                  {l.hasQuiz ? <Badge tone="brand">Quiz</Badge> : null}
                  {!l.published ? <Badge tone="warning">Chưa xuất bản</Badge> : null}
                </span>
                <span className="flex items-center gap-0.5">
                  <MoveButtons disabled={p.locked} first={li === 0} last={li === ch.lessons.length - 1} onMove={(d) => move("lesson", l.id, d)} label={`bài ${l.title}`} />
                  <button
                    type="button"
                    disabled={p.locked}
                    aria-label={`Xóa bài ${l.title}`}
                    className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
                    onClick={async () => {
                      if ((await confirm({ title: `Xóa bài “${l.title}”?`, description: l.published ? "Bài đã xuất bản: học viên vẫn thấy bản cũ cho tới khi bản mới được duyệt. Tiến độ và ghi chú cũ được giữ." : "Bài sẽ bị xóa khỏi bản nháp.", confirmLabel: "Xóa bài" })).ok)
                        m.run(() => deleteLessonAction({ courseId: p.courseId, lessonId: l.id, expectedRevision: p.revision }), "Đã xóa bài.");
                    }}
                  >
                    <IconTrash size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2.5">
            <button type="button" disabled={p.locked} onClick={() => setLessonDialog(ch.id)} className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-40">
              + Thêm bài học
            </button>
          </div>
        </section>
      ))}
      <form
        className="flex flex-wrap gap-2 rounded-[var(--radius-lg)] border border-dashed border-line-strong p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await m.run(() => saveChapterAction({ courseId: p.courseId, expectedRevision: p.revision, title: newChapter, description: "" }), "Đã thêm chương.");
          if (r?.ok) setNewChapter("");
        }}
      >
        <label htmlFor="new-chapter" className="sr-only">
          Tên chương mới
        </label>
        <Input id="new-chapter" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} placeholder="Tên chương mới…" className="min-w-0 flex-1" disabled={p.locked} maxLength={120} />
        <Button type="submit" variant="soft" disabled={p.locked || !newChapter.trim()} pending={m.pending}>
          + Thêm chương
        </Button>
      </form>

      <NewLessonDialog courseId={p.courseId} revision={p.revision} chapterId={lessonDialog} onClose={() => setLessonDialog(null)} />
      <Dialog open={Boolean(editChapter)} onClose={() => setEditChapter(null)} title="Sửa chương">
        {editChapter ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const r = await m.run(() => saveChapterAction({ courseId: p.courseId, chapterId: editChapter.id, expectedRevision: p.revision, title: f.get("title"), description: f.get("description") }), "Đã lưu chương.");
              if (r?.ok) setEditChapter(null);
            }}
          >
            <Field id="ch-title" label="Tên chương">
              <Input id="ch-title" name="title" defaultValue={editChapter.title} required maxLength={120} />
            </Field>
            <Field id="ch-desc" label="Mô tả" optional>
              <Textarea id="ch-desc" name="description" defaultValue={editChapter.description} rows={3} maxLength={1000} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" pending={m.pending}>
                Lưu
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}

function MoveButtons({ first, last, onMove, label, disabled }: { first: boolean; last: boolean; onMove: (d: "up" | "down") => void; label: string; disabled: boolean }) {
  const cls = "grid size-8 place-items-center rounded-full text-ink-faint hover:bg-brand-50 hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  return (
    <>
      <button type="button" className={cls} disabled={disabled || first} onClick={() => onMove("up")} aria-label={`Chuyển ${label} lên`}>
        <IconChevronDown size={16} className="rotate-180" />
      </button>
      <button type="button" className={cls} disabled={disabled || last} onClick={() => onMove("down")} aria-label={`Chuyển ${label} xuống`}>
        <IconChevronDown size={16} />
      </button>
    </>
  );
}

function NewLessonDialog({ courseId, revision, chapterId, onClose }: { courseId: string; revision: number; chapterId: string | null; onClose: () => void }) {
  const router = useRouter();
  const a = useAction(createLessonAction, { onSuccess: (d) => router.push(`/instructor/courses/${courseId}/lessons/${d.lessonId}`) });
  const [type, setType] = useState<"reading" | "video">("reading");
  return (
    <Dialog open={Boolean(chapterId)} onClose={onClose} title="Thêm bài học">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          a.run({ courseId, chapterId, expectedRevision: revision, title: f.get("title"), type });
        }}
      >
        <FormError error={a.error} />
        <Field id="lesson-title" label="Tên bài">
          <Input id="lesson-title" name="title" required maxLength={120} autoFocus />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Loại bài</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["reading", "video"] as const).map((t) => (
              <label key={t} className={cn("flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border p-3 transition", type === t ? "border-brand-700 bg-brand-50" : "border-line hover:border-brand-300")}>
                <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} className="accent-brand-700" />
                {t === "reading" ? "Bài đọc" : "Video"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" pending={a.pending}>
            Tạo và soạn bài
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ------------------------- Quiz & dự án ------------------------- */

function Extras(p: Props & { locked: boolean }) {
  const m = useMutation();
  const router = useRouter();
  const placement = p.quizzes.find((q) => q.kind === "placement");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="text-h3">Quiz</h3>
        <p className="mt-1 text-sm text-ink-soft">Gắn quiz vào bài trong trình soạn bài. Đáp án không bao giờ gửi tới trình duyệt trước khi nộp.</p>
        <ul className="mt-4 space-y-2">
          {p.quizzes.map((q) => (
            <li key={q.id}>
              <Link href={`/instructor/courses/${p.courseId}/quizzes/${q.id}`} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50/50">
                <span className="flex-1 font-medium">{q.title}</span>
                {q.kind === "placement" ? <Badge tone="brand">Đầu vào</Badge> : null}
                <span className="text-xs text-ink-faint">{q.count} câu</span>
                <IconArrowRight size={14} className="text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="soft"
            disabled={p.locked}
            pending={m.pending}
            onClick={async () => {
              const r = await m.run(() => createQuizAction({ courseId: p.courseId, expectedRevision: p.revision, kind: "lesson", title: "Quiz mới" }));
              if (r?.ok) router.push(`/instructor/courses/${p.courseId}/quizzes/${r.data.quizId}`);
            }}
          >
            + Quiz bài học
          </Button>
          {!placement ? (
            <Button
              size="sm"
              variant="outline"
              disabled={p.locked}
              onClick={async () => {
                const r = await m.run(() => createQuizAction({ courseId: p.courseId, expectedRevision: p.revision, kind: "placement", title: "Đánh giá đầu vào" }));
                if (r?.ok) router.push(`/instructor/courses/${p.courseId}/quizzes/${r.data.quizId}`);
              }}
            >
              + Bài đánh giá đầu vào
            </Button>
          ) : null}
        </div>
      </Card>
      <Card>
        <h3 className="text-h3">Bài tập dự án</h3>
        <p className="mt-1 text-sm text-ink-soft">Đề bài, checklist và rubric. Gắn vào một bài học để học viên thấy.</p>
        <ul className="mt-4 space-y-2">
          {p.assignments.map((a) => (
            <li key={a.id}>
              <Link href={`/instructor/courses/${p.courseId}/projects/${a.id}`} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50/50">
                <span className="flex-1 font-medium">{a.title}</span>
                <IconArrowRight size={14} className="text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="soft"
          className="mt-4"
          disabled={p.locked}
          onClick={async () => {
            const r = await m.run(() => createAssignmentAction({ courseId: p.courseId, expectedRevision: p.revision, title: "Bài tập dự án mới" }));
            if (r?.ok) router.push(`/instructor/courses/${p.courseId}/projects/${r.data.assignmentId}`);
          }}
        >
          + Bài tập dự án
        </Button>
      </Card>
    </div>
  );
}

/* ------------------------- Duyệt & trạng thái ------------------------- */

function ReviewPanel(p: Props) {
  const m = useMutation();
  const confirm = useConfirm();
  const ready = p.problems.length === 0;
  return (
    <Card className="space-y-4 xl:sticky xl:top-24">
      <h2 className="text-h3">Xuất bản</h2>
      <ol className="space-y-2 text-sm">
        {[
          { label: "Soạn bản nháp", done: true },
          { label: "Đủ điều kiện xuất bản", done: ready },
          { label: "Gửi quản trị viên duyệt", done: p.review.state === "pending" || p.review.state === "approved" },
          { label: "Được duyệt & công khai", done: p.status === "published" && p.review.state === "approved" },
        ].map((s, i) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", s.done ? "bg-success-600 text-white" : "bg-brand-100 text-brand-800")}>{s.done ? <IconCheck size={13} /> : i + 1}</span>
            <span className={s.done ? "text-ink" : "text-ink-soft"}>{s.label}</span>
          </li>
        ))}
      </ol>
      {!ready ? (
        <div className="rounded-[var(--radius-md)] bg-warning-50 p-3 text-sm text-warning-800">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <IconAlert size={15} /> Cần hoàn thiện
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.problems.slice(0, 8).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {p.review.state === "pending" ? (
        <Button variant="outline" className="w-full" pending={m.pending} onClick={() => m.run(() => withdrawSubmissionAction({ courseId: p.courseId }), "Đã rút yêu cầu duyệt.")}>
          Rút yêu cầu duyệt
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={!ready || p.status === "suspended"}
          pending={m.pending}
          onClick={async () => {
            if ((await confirm({ title: "Gửi duyệt khóa học?", description: "Nội dung sẽ bị khóa chỉnh sửa cho tới khi quản trị viên duyệt hoặc bạn rút yêu cầu. Bản công khai hiện tại (nếu có) giữ nguyên.", tone: "brand", confirmLabel: "Gửi duyệt" })).ok)
              m.run(() => submitForReviewAction({ courseId: p.courseId, expectedRevision: p.revision }), "Đã gửi duyệt.");
          }}
        >
          Gửi duyệt
        </Button>
      )}
      {p.status === "published" ? (
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            if ((await confirm({ title: "Lưu trữ khóa học?", description: "Ẩn khỏi catalog và dừng đăng ký mới. Học viên đã đăng ký vẫn học tiếp.", confirmLabel: "Lưu trữ" })).ok)
              m.run(() => setCourseStatusAction({ courseId: p.courseId, action: "archive", reason: "" }), "Đã lưu trữ.");
          }}
        >
          Lưu trữ khóa học
        </Button>
      ) : p.status === "archived" ? (
        <Button variant="outline" className="w-full" onClick={() => m.run(() => setCourseStatusAction({ courseId: p.courseId, action: "unarchive", reason: "" }), "Đã mở lại khóa học.")}>
          Bỏ lưu trữ
        </Button>
      ) : null}
      {p.status === "suspended" ? <Alert tone="danger">Khóa bị đình chỉ bởi quản trị viên.</Alert> : null}
    </Card>
  );
}
