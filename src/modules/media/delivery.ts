import "server-only";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { signedVideoPosterUrl, signedVideoUrl } from "@/server/cloudinary";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccess } from "@/modules/learning/access";
import { getSettings } from "./settings";
import { posterUrl } from "./urls";

/**
 * Tóm tắt media cho trang học — CHỈ gọi sau khi đã kiểm tra quyền đọc bài.
 * Không chứa URL video (URL cấp riêng qua playbackSource / khi render có quyền).
 */
export async function mediaSummary(mediaId: ObjectId) {
  const c = await cols();
  const m = await c.mediaAssets.findOne({ _id: mediaId });
  if (!m) return { status: "missing" as const, bytes: 0, durationSeconds: 0, posterUrl: null };
  if (m.status !== "ready") return { status: "removed" as const, bytes: m.bytes, durationSeconds: m.durationSeconds ?? 0, posterUrl: null };
  let poster: string | null = null;
  if (env().cloudinaryEnabled) {
    poster = m.deliveryType === "authenticated" ? signedVideoPosterUrl(m.publicId, m.version) : posterUrl(m.publicId, m.version, "upload");
  }
  return { status: "ready" as const, bytes: m.bytes, durationSeconds: m.durationSeconds ?? 0, posterUrl: poster };
}

/**
 * Cấp nguồn phát video cho người có quyền (M10): kiểm tra enrollment + trạng thái khóa trước.
 * GIỚI HẠN (ADR-010): signed URL không hết hạn và có thể bị chia sẻ; tắt cấp mới không thu hồi URL cũ.
 */
export async function playbackSource(viewer: Viewer | null, lessonId: ObjectId) {
  const { lesson } = await requireLessonAccess(viewer, lessonId);
  if (lesson.published.type !== "video" || !lesson.published.mediaId) throw new AppError("NOT_FOUND", "Bài này không có video.");
  const c = await cols();
  const m = await c.mediaAssets.findOne({ _id: lesson.published.mediaId });
  if (!m || m.status !== "ready") throw new AppError("NOT_FOUND", "Video đã bị gỡ hoặc chưa sẵn sàng.");
  if (!env().cloudinaryEnabled) throw new AppError("NOT_CONFIGURED", "Dịch vụ media chưa được cấu hình.");
  if (m.deliveryType === "authenticated") {
    const { killSwitches } = await getSettings();
    if (!killSwitches.playbackIssuanceEnabled) throw new AppError("PLAYBACK_DISABLED", "Tạm dừng phát video để tiết kiệm tài nguyên. Bài đọc và transcript vẫn dùng được.");
    return { url: signedVideoUrl(m.publicId, m.version), bytes: m.bytes, durationSeconds: m.durationSeconds ?? 0 };
  }
  return { url: `https://res.cloudinary.com/${env().CLOUDINARY_CLOUD_NAME}/video/upload/v${m.version}/${m.publicId}.${m.format}`, bytes: m.bytes, durationSeconds: m.durationSeconds ?? 0 };
}
