"use client";

import { useRef, useState } from "react";
import { cancelUploadAction, finalizeUploadAction, requestUploadAction } from "@/modules/media/actions";
import { IconCheck, IconUpload } from "./icons";
import { Alert, Button, cn } from "./ui";

type Purpose = "course_thumbnail" | "lesson_image" | "lesson_video" | "preview_video";
type Stage = "idle" | "checking" | "uploading" | "verifying" | "done" | "error";

const MiB = 1024 * 1024;
const fmt = (b: number) => `${(b / MiB).toFixed(1).replace(".", ",")} MiB`;

function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

/**
 * Upload trực tiếp lên Cloudinary bằng chữ ký do server cấp (ADR-009). Kiểm tra ở trình duyệt chỉ để UX tốt —
 * server luôn xác minh lại metadata thật qua Admin API khi finalize.
 */
export function MediaUploader({ courseId, purpose, maxBytes, maxSeconds, onDone }: { courseId: string; purpose: Purpose; maxBytes: number; maxSeconds?: number; onDone?: (mediaId: string) => void }) {
  const isVideo = purpose === "lesson_video" || purpose === "preview_video";
  const accept = isVideo ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp";
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const reservationRef = useRef<string | null>(null);

  async function start(f: File) {
    setFile(f);
    setError(null);
    setStage("checking");
    if (!accept.split(",").includes(f.type)) return fail(`Định dạng ${f.type || "không rõ"} không được hỗ trợ.`);
    if (f.size > maxBytes) return fail(`File ${fmt(f.size)} vượt giới hạn ${fmt(maxBytes)}. ${isVideo ? "Hãy nén video (ví dụ 720p, ~500 kbps) trước khi tải lên." : "Hãy giảm kích thước ảnh."}`);
    const duration = isVideo ? await videoDuration(f) : null;
    if (isVideo && maxSeconds && duration && duration > maxSeconds) return fail(`Video dài ${Math.floor(duration / 60)} phút ${Math.round(duration % 60)} giây, vượt giới hạn ${Math.round(maxSeconds / 60)} phút.`);
    const ticket = await requestUploadAction({ courseId, purpose, fileName: f.name, declaredBytes: f.size, declaredType: f.type, declaredDurationSeconds: duration }).catch(() => null);
    if (!ticket?.ok) return fail(ticket?.error.message ?? "Không xin được quyền tải lên.");
    reservationRef.current = ticket.data.reservationId;
    setStage("uploading");
    const form = new FormData();
    for (const [k, v] of Object.entries(ticket.data.fields)) form.append(k, v);
    form.append("file", f);
    const ok = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", ticket.data.uploadUrl);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.onabort = () => resolve(false);
      xhr.send(form);
    });
    if (!ok) {
      if (reservationRef.current) await cancelUploadAction({ reservationId: reservationRef.current }).catch(() => {});
      return fail("Tải lên Cloudinary không thành công (mạng lỗi hoặc file bị từ chối).");
    }
    setStage("verifying");
    for (let i = 0; i < 4; i++) {
      const r = await finalizeUploadAction({ reservationId: ticket.data.reservationId }).catch(() => null);
      if (r?.ok) {
        setStage("done");
        onDone?.(r.data.mediaId);
        return;
      }
      if (r && r.error.code !== "UPLOAD_NOT_FOUND" && r.error.code !== "CONFLICT") return fail(r.error.message);
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
    fail("Chưa xác minh được file. Thử lại sau — file sẽ được đối soát tự động.");
  }

  function fail(msg: string) {
    setError(msg);
    setStage("error");
  }

  const busy = stage === "checking" || stage === "uploading" || stage === "verifying";
  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-8 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
          busy ? "pointer-events-none border-brand-300 bg-brand-50/60" : "border-line-strong hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        <input type="file" accept={accept} className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && start(e.target.files[0])} />
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">{stage === "done" ? <IconCheck /> : <IconUpload />}</span>
        <span className="font-semibold">{isVideo ? "Chọn video (MP4/WebM)" : "Chọn ảnh (JPG/PNG/WebP)"}</span>
        <span className="text-xs text-ink-faint">
          Tối đa {fmt(maxBytes)}
          {isVideo && maxSeconds ? ` · ${Math.round(maxSeconds / 60)} phút` : ""}
          {isVideo ? " · nên nén 720p trước khi tải" : ""}
        </span>
      </label>
      {file && stage !== "idle" ? (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">{file.name}</span>
            <span className="shrink-0 text-ink-faint">{fmt(file.size)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={stage === "done" ? 100 : progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến trình tải lên">
            <div className={cn("h-full rounded-full transition-[width] duration-300", stage === "error" ? "bg-danger-700" : stage === "done" ? "bg-success-600" : "bg-brand-700")} style={{ width: `${stage === "done" ? 100 : stage === "verifying" ? 100 : progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            {stage === "checking" ? "Đang kiểm tra file…" : stage === "uploading" ? `Đang tải lên ${progress}%` : stage === "verifying" ? "Đang xác minh với máy chủ…" : stage === "done" ? "Đã tải lên và xác minh ✓" : "Thất bại"}
          </p>
          {stage === "uploading" ? (
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => xhrRef.current?.abort()}>
              Hủy tải lên
            </Button>
          ) : null}
        </div>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
