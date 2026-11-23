"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMediaAction } from "@/modules/media/actions";
import { MediaUploader } from "@/components/media-uploader";
import { useConfirm, useToast } from "@/components/overlays";
import { Select, Tooltip } from "@/components/ui";

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
