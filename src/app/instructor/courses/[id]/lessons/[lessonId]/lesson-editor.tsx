"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveLessonAction } from "@/modules/courses/actions";
import { FormError } from "@/components/form-error";
import { Markdown } from "@/components/markdown";
import { MediaUploader } from "@/components/media-uploader";
import { Tabs, useToast } from "@/components/overlays";
import { Alert, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";

type L = { chapterId: string; title: string; type: "reading" | "video"; objectives: string; content: string; durationMinutes: number; isPreview: boolean; isRequired: boolean; mediaId: string; transcript: string; quizId: string; projectAssignmentId: string };

export function LessonEditor(p: {
  courseId: string;
  lessonId: string;
  revision: number;
  locked: boolean;
  cloudinaryEnabled: boolean;
  limits: { videoMaxBytes: number; videoMaxSeconds: number };
  lesson: L;
  chapters: { id: string; title: string }[];
  quizzes: { id: string; title: string }[];
  assignments: { id: string; title: string }[];
  videos: { id: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [l, setL] = useState<L>(p.lesson);
  const [dirty, setDirty] = useState(false);
  const save = useAction(saveLessonAction, {
    onSuccess: () => {
      setDirty(false);
      toast({ tone: "success", message: "Đã lưu bài học." });
      router.refresh();
    },
  });
  const set = <K extends keyof L>(k: K, v: L[K]) => {
    setL((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  const fe = save.fieldErrors;

  return (
    <form
      className="grid gap-8 xl:grid-cols-[1fr_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ courseId: p.courseId, lessonId: p.lessonId, expectedRevision: p.revision, ...l, mediaId: l.mediaId || null, quizId: l.quizId || null, projectAssignmentId: l.projectAssignmentId || null });
      }}
    >
      <fieldset disabled={p.locked} className="min-w-0 space-y-6">
        {p.locked ? <Alert tone="info">Khóa đang chờ duyệt — chỉ xem, không sửa được.</Alert> : null}
        <FormError error={save.error} />
        <Field id="title" label="Tên bài" errors={fe.title}>
          <Input id="title" value={l.title} onChange={(e) => set("title", e.target.value)} maxLength={120} required />
        </Field>
        <Field id="objectives" label="Mục tiêu bài học" hint="Mỗi dòng một mục (tối đa 5)." errors={fe.objectives}>
          <Textarea id="objectives" rows={3} value={l.objectives} onChange={(e) => set("objectives", e.target.value)} />
        </Field>
        {l.type === "video" ? (
          <Card className="space-y-4">
            <h3 className="text-h3">Video</h3>
            <Field id="mediaId" label="Chọn video đã tải lên" hint="Thời lượng lấy từ metadata đã xác minh, không nhập tay.">
              <Select id="mediaId" value={l.mediaId} onChange={(e) => set("mediaId", e.target.value)}>
                <option value="">— Chưa chọn —</option>
                {p.videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            {p.cloudinaryEnabled ? (
              <MediaUploader courseId={p.courseId} purpose={l.isPreview ? "preview_video" : "lesson_video"} maxBytes={p.limits.videoMaxBytes} maxSeconds={p.limits.videoMaxSeconds} onDone={(id) => { set("mediaId", id); router.refresh(); }} />
            ) : (
              <Alert tone="warning">Cloudinary chưa được cấu hình nên chưa tải video được. Điền CLOUDINARY_* trong .env.</Alert>
            )}
            <p className="text-xs text-ink-faint">
              Video bài thường được lưu dạng “authenticated”: chỉ cấp link có chữ ký cho người có quyền học. Lưu ý: link đã cấp không tự hết hạn và có thể bị chia sẻ (giới hạn của gói miễn phí). Video “Học thử” là công khai.
            </p>
          </Card>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Nội dung bài (Markdown)</p>
          <Tabs
            tabs={[
              { id: "write", label: "Soạn", content: <Textarea aria-label="Nội dung bài" rows={18} value={l.content} onChange={(e) => set("content", e.target.value)} maxLength={50000} className="font-mono text-sm" /> },
              { id: "preview", label: "Xem trước", content: <div className="min-h-60 rounded-[var(--radius-sm)] border border-line p-5">{l.content.trim() ? <Markdown allowImages>{l.content}</Markdown> : <p className="text-sm text-ink-faint">Chưa có nội dung.</p>}</div> },
            ]}
          />
          <p className="text-xs text-ink-faint">HTML trong Markdown không được thực thi. Ảnh chỉ hiển thị nếu từ Cloudinary của dự án.</p>
        </div>
        {l.type === "video" ? (
          <Field id="transcript" label="Transcript / phụ đề dạng văn bản" optional hint="Giúp học viên học khi không xem được video.">
            <Textarea id="transcript" rows={6} value={l.transcript} onChange={(e) => set("transcript", e.target.value)} maxLength={100000} />
          </Field>
        ) : null}
      </fieldset>

      <aside>
        <Card className="space-y-4 xl:sticky xl:top-24">
          <fieldset disabled={p.locked} className="space-y-4">
            <Field id="chapterId" label="Chương">
              <Select id="chapterId" value={l.chapterId} onChange={(e) => set("chapterId", e.target.value)}>
                {p.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="type" label="Loại bài">
              <Select id="type" value={l.type} onChange={(e) => set("type", e.target.value as L["type"])}>
                <option value="reading">Bài đọc</option>
                <option value="video">Video</option>
              </Select>
            </Field>
            {l.type === "reading" ? (
              <Field id="durationMinutes" label="Thời gian đọc ước tính (phút)">
                <Input id="durationMinutes" type="number" min={0} max={600} step={0.5} value={l.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
              </Field>
            ) : null}
            <Checkbox label="Bài học thử" description="Ai cũng xem được, kể cả khách." checked={l.isPreview} onChange={(e) => set("isPreview", e.target.checked)} />
            <Checkbox label="Bài bắt buộc" description="Tính vào tiến độ khóa học." checked={l.isRequired} onChange={(e) => set("isRequired", e.target.checked)} />
            <Field id="quizId" label="Quiz gắn với bài">
              <Select id="quizId" value={l.quizId} onChange={(e) => set("quizId", e.target.value)}>
                <option value="">— Không —</option>
                {p.quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="projectAssignmentId" label="Bài tập dự án">
              <Select id="projectAssignmentId" value={l.projectAssignmentId} onChange={(e) => set("projectAssignmentId", e.target.value)}>
                <option value="">— Không —</option>
                {p.assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </Field>
          </fieldset>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
            <span className="text-xs" aria-live="polite">
              {dirty ? <span className="font-semibold text-warning-800">● Chưa lưu</span> : <span className="text-ink-faint">Đã lưu</span>}
            </span>
            <Button type="submit" pending={save.pending} disabled={p.locked}>
              Lưu bài học
            </Button>
          </div>
        </Card>
      </aside>
    </form>
  );
}
