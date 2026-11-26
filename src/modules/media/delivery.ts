import "server-only";
import { ObjectId } from "mongodb";
import { unstable_cache } from "next/cache";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { signedVideoPosterUrl, signedVideoUrl } from "@/server/cloudinary";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccessMemo } from "@/modules/learning/access";
import { getSettings } from "./settings";
import { posterUrl } from "./urls";
import { CATALOG_TAG } from "@/modules/courses/catalog";

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
  const { lesson } = await requireLessonAccessMemo(viewer, lessonId);
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

/**
 * S05: video HỌC THỬ công khai của khóa (bài isPreview đầu tiên có video delivery "upload") cho trang khóa học
 * + VideoObject. Chỉ video của bài học thử (ai cũng xem được) — video bài thường (authenticated) không lộ ra đây.
 */
async function coursePreviewVideoUncached(courseId: string) {
  const cloud = env().CLOUDINARY_CLOUD_NAME;
  if (!cloud || !ObjectId.isValid(courseId)) return null;
  const c = await cols();
  const id = new ObjectId(courseId);
  const [chapters, lessons] = await Promise.all([
    c.chapters.find({ courseId: id, published: { $ne: null } }, { projection: { "published.order": 1 } }).toArray(),
    c.lessons
      .find({ courseId: id, "published.isPreview": true, "published.type": "video", "published.mediaId": { $ne: null } }, { projection: { "published.title": 1, "published.mediaId": 1, "published.order": 1, "published.chapterId": 1 } })
      .toArray(),
  ]);
  const chapterOrder = new Map(chapters.map((ch) => [ch._id.toHexString(), ch.published!.order]));
  const sorted = lessons
    .filter((l) => chapterOrder.has(l.published!.chapterId.toHexString()))
    .sort((a, b) => chapterOrder.get(a.published!.chapterId.toHexString())! - chapterOrder.get(b.published!.chapterId.toHexString())! || a.published!.order - b.published!.order);
  for (const l of sorted) {
    const m = await c.mediaAssets.findOne({ _id: l.published!.mediaId!, status: "ready", deliveryType: "upload", resourceType: "video" });
    if (!m) continue;
    return {
      lessonId: l._id.toHexString(),
      lessonTitle: l.published!.title,
      url: `https://res.cloudinary.com/${cloud}/video/upload/v${m.version}/${m.publicId}.${m.format}`,
      format: m.format,
      posterUrl: posterUrl(m.publicId, m.version, "upload"),
      durationSeconds: m.durationSeconds ?? 0,
      uploadDate: m.createdAt.toISOString(),
    };
  }
  return null;
}
export const getCoursePreviewVideo = unstable_cache(coursePreviewVideoUncached, ["course-preview-video-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });
