"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMediaAction, updateImageMetaAction } from "@/modules/media/actions";
import { MediaUploader } from "@/components/media-uploader";
import { Dialog, useConfirm, useToast } from "@/components/overlays";
import { Button, Field, Input, Select, Tooltip } from "@/components/ui";

export function UploadPanel({ courseId, limits }: { courseId: string; limits: { imageMaxBytes: number; videoMaxBytes: number; videoMaxSeconds: number } }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<"course_thumbnail" | "lesson_image" | "lesson_video" | "preview_video">("lesson_video");
  const isVideo = purpose.includes("video");
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Mục đích
        <Select className="mt-1.5" value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)}>
          <option value="lesson_video">Video bài học (cần quyền học)</option>
          <option value="preview_video">Video học thử (công khai)</option>
          <option value="course_thumbnail">Ảnh bìa khóa học</option>
          <option value="lesson_image">Ảnh trong bài học</option>
        </Select>
      </label>
      <MediaUploader key={purpose} courseId={courseId} purpose={purpose} maxBytes={isVideo ? limits.videoMaxBytes : limits.imageMaxBytes} maxSeconds={isVideo ? limits.videoMaxSeconds : undefined} onDone={() => router.refresh()} />
    </div>
  );
}

export function MediaActions({ mediaId, courseId, inUse }: { mediaId: string; courseId: string; inUse: boolean }) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  if (inUse)
    return (
      <Tooltip content="Gỡ khỏi bài học trước khi xóa">
        <span className="text-xs text-ink-faint" tabIndex={0}>
          Đang dùng
        </span>
      </Tooltip>
    );
  return (
    <button
      type="button"
      className="text-sm font-semibold text-danger-700 hover:underline"
      onClick={async () => {
        if (!(await confirm({ title: "Xóa file media?", description: "File sẽ bị xóa khỏi Cloudinary. Chỉ báo thành công khi Cloudinary xác nhận.", confirmLabel: "Xóa file" })).ok) return;
        const r = await deleteMediaAction({ mediaId, courseId }).catch(() => null);
        toast(r?.ok ? { tone: "success", message: "Đã yêu cầu xóa." } : { tone: "error", message: r?.error.message ?? "Không xóa được." });
        router.refresh();
      }}
    >
      Xóa
    </button>
  );
}

type ImageMeta = { alt: string; caption: string; credit: string; license: string };
const LICENSES = ["Tự tạo cho khóa học", "CC0", "CC BY 4.0", "CC BY-SA 4.0", "Được tác giả cho phép", "Ảnh chụp màn hình phần mềm"];

/** M03: alt/chú thích/nguồn/giấy phép cho ảnh + chép Markdown chèn vào bài (title = chú thích hiển thị dưới ảnh). */
export function ImageMetaButton({ mediaId, purpose, url, initial }: { mediaId: string; purpose: string; url: string | null; initial: ImageMeta | null }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [m, setM] = useState<ImageMeta>(initial ?? { alt: "", caption: "", credit: "", license: "Tự tạo cho khóa học" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const captionLine = [m.caption, [m.credit && `Nguồn: ${m.credit}`, m.license].filter(Boolean).join(" · ")].filter(Boolean).join(" — ");
  const markdown = url ? `![${m.alt.replace(/[\[\]]/g, "")}](${url}${captionLine ? ` "${captionLine.replace(/"/g, "'")}"` : ""})` : "";
  return (
    <>
      <button type="button" className="mr-3 text-sm font-semibold text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        {initial?.alt ? "Thông tin ảnh" : "Thêm alt/nguồn"}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Thông tin ảnh"
        description="Alt mô tả nội dung ảnh cho người dùng trình đọc màn hình. Ghi rõ nguồn và giấy phép nếu ảnh không do bạn tạo."
        footer={
          <>
            {purpose === "lesson_image" && url ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(markdown).catch(() => {});
                  toast({ tone: "success", message: "Đã chép Markdown — dán vào nội dung bài." });
                }}
              >
                Chép Markdown
              </Button>
            ) : null}
            <Button
              pending={pending}
              onClick={async () => {
                setPending(true);
                setErr(null);
                const r = await updateImageMetaAction({ mediaId, ...m }).catch(() => null);
                setPending(false);
                if (r?.ok) {
                  toast({ tone: "success", message: "Đã lưu thông tin ảnh." });
                  setOpen(false);
                  router.refresh();
                } else setErr(r && !r.ok ? r.error.message : "Không kết nối được máy chủ.");
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {url ? <img src={url} alt="" className="max-h-48 w-full rounded-[var(--radius-sm)] object-contain bg-surface-muted" /> : null}
          {err ? <p className="text-sm text-danger-700">{err}</p> : null}
          <Field id={`alt-${mediaId}`} label="Mô tả (alt)" hint={purpose === "lesson_image" ? "Bắt buộc với ảnh trong bài." : "Ảnh bìa chỉ trang trí: có thể để trống."}>
            <Input id={`alt-${mediaId}`} value={m.alt} maxLength={200} onChange={(e) => setM({ ...m, alt: e.target.value })} />
          </Field>
          <Field id={`cap-${mediaId}`} label="Chú thích" optional>
            <Input id={`cap-${mediaId}`} value={m.caption} maxLength={300} onChange={(e) => setM({ ...m, caption: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`cr-${mediaId}`} label="Nguồn / tác giả" optional>
              <Input id={`cr-${mediaId}`} value={m.credit} maxLength={120} onChange={(e) => setM({ ...m, credit: e.target.value })} />
            </Field>
            <Field id={`li-${mediaId}`} label="Giấy phép">
              <Input id={`li-${mediaId}`} list={`lic-${mediaId}`} value={m.license} maxLength={80} onChange={(e) => setM({ ...m, license: e.target.value })} />
              <datalist id={`lic-${mediaId}`}>
                {LICENSES.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
          </div>
          {purpose === "lesson_image" && url ? <p className="break-all rounded-[var(--radius-sm)] bg-surface-muted p-2 font-mono text-xs text-ink-soft">{markdown}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
