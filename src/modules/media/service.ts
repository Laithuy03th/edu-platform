import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { env } from "@/lib/env";
import { stripControlChars } from "@/lib/text";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withTransaction } from "@/server/db/client";
import { cols, type Doc, type MediaAssetDoc, type MediaPurpose, type UploadReservationDoc } from "@/server/db/models";
import { audit } from "@/server/audit";
import { destroyResource, fetchResource, listResources, signUpload, type CloudResource } from "@/server/cloudinary";
import type { Viewer } from "@/server/auth/viewer-core";
import { loadEditableCourse } from "@/modules/courses/authoring";
import { getSettings } from "./settings";
import { mediaImageUrl } from "./urls";
import { budgetStatus } from "./usage";

export const RESERVATION_TTL_MS = 90 * 60_000; // chữ ký 60 phút + thời gian upload
export const MAX_ACTIVE_RESERVATIONS = 3;
export const ORPHAN_GRACE_MS = 24 * 3600_000;

const PURPOSES: Record<MediaPurpose, { resourceType: "image" | "video"; deliveryType: "upload" | "authenticated"; formats: string[] }> = {
  course_thumbnail: { resourceType: "image", deliveryType: "upload", formats: ["jpg", "jpeg", "png", "webp"] },
  lesson_image: { resourceType: "image", deliveryType: "upload", formats: ["jpg", "jpeg", "png", "webp"] },
  lesson_video: { resourceType: "video", deliveryType: "authenticated", formats: ["mp4", "webm"] },
  preview_video: { resourceType: "video", deliveryType: "upload", formats: ["mp4", "webm"] },
};
const MIME: Record<string, string[]> = { image: ["image/jpeg", "image/png", "image/webp"], video: ["video/mp4", "video/webm"] };
const MAX_DIMENSION = 4000;

export const prefix = () => `lms/${env().appEnv}/`;
const storageKey = "storage:global";
const videoKey = (courseId: ObjectId) => `videos:course:${courseId.toHexString()}`;

/* ---------------- Quota (atomic, một document mỗi counter) ---------------- */

async function ensureCounter(id: string, session?: ClientSession) {
  const c = await cols();
  await c.quotaCounters
    .updateOne({ _id: id }, { $setOnInsert: { usedBytes: 0, reservedBytes: 0, usedCount: 0, reservedCount: 0, updatedAt: new Date() } }, { upsert: true, session })
    .catch((err) => {
      if (!isDuplicateKeyError(err)) throw err;
    });
}

/** Reserve nguyên tử: chỉ thành công nếu used + reserved + n ≤ limit (M2). */
export async function reserveBytes(n: number, limit: number): Promise<boolean> {
  const c = await cols();
  await ensureCounter(storageKey);
  const r = await c.quotaCounters.updateOne(
    { _id: storageKey, $expr: { $lte: [{ $add: ["$usedBytes", "$reservedBytes", n] }, limit] } },
    { $inc: { reservedBytes: n }, $set: { updatedAt: new Date() } },
  );
  return r.modifiedCount === 1;
}

async function reserveVideoSlot(courseId: ObjectId, perCourse: number): Promise<boolean> {
  const c = await cols();
  await ensureCounter(videoKey(courseId));
  const r = await c.quotaCounters.updateOne(
    { _id: videoKey(courseId), $expr: { $lt: [{ $add: ["$usedCount", "$reservedCount"] }, perCourse] } },
    { $inc: { reservedCount: 1 }, $set: { updatedAt: new Date() } },
  );
  return r.modifiedCount === 1;
}

async function releaseQuota(res: Pick<UploadReservationDoc, "reservedBytes" | "countsVideo" | "courseId">, session?: ClientSession) {
  const c = await cols();
  await c.quotaCounters.updateOne({ _id: storageKey }, { $inc: { reservedBytes: -res.reservedBytes }, $set: { updatedAt: new Date() } }, { session });
  if (res.countsVideo) await c.quotaCounters.updateOne({ _id: videoKey(res.courseId) }, { $inc: { reservedCount: -1 }, $set: { updatedAt: new Date() } }, { session });
}

/** Giải phóng reservation active đã hết hạn (lười, lô nhỏ) — trả quota. */
export async function releaseExpiredReservations(limit = 20, now = new Date()): Promise<number> {
  const c = await cols();
  let n = 0;
  for (let i = 0; i < limit; i++) {
    const r = await c.uploadReservations.findOneAndUpdate(
      { status: "active", expiresAt: { $lt: now } },
      { $set: { status: "expired", purgeAt: new Date(now.getTime() + 30 * 86400_000), updatedAt: now } },
      { returnDocument: "after" },
    );
    if (!r) break;
    await releaseQuota(r);
    n++;
  }
  return n;
}

/* ---------------- Reservation + chữ ký upload ---------------- */

export type UploadTicket = { reservationId: string; uploadUrl: string; fields: Record<string, string>; maxBytes: number; resourceType: "image" | "video" };

export async function requestUpload(
  viewer: Viewer,
  input: { courseId: ObjectId; purpose: MediaPurpose; fileName: string; declaredBytes: number; declaredType: string; declaredDurationSeconds: number | null },
): Promise<UploadTicket> {
  await loadEditableCourse(viewer, input.courseId); // M1: chỉ khóa mình được sửa
  const spec = PURPOSES[input.purpose];
  const status = await budgetStatus({ refreshIfOlderThanMinutes: 60 });
  if (status.uploadsBlockedReason) {
    throw new AppError(status.stale ? "USAGE_STALE" : "UPLOADS_DISABLED", status.uploadsBlockedReason);
  }
  const { limits } = await getSettings();
  const maxBytes = spec.resourceType === "video" ? limits.videoMaxBytes : limits.imageMaxBytes;
  // Kiểm tra khai báo (UX) — bảo mật thật nằm ở finalize.
  if (!MIME[spec.resourceType]!.includes(input.declaredType)) throw new AppError("VALIDATION_FAILED", `Định dạng không được hỗ trợ. Cho phép: ${spec.formats.join(", ")}.`);
  if (input.declaredBytes > maxBytes) throw new AppError("VALIDATION_FAILED", `File vượt giới hạn ${(maxBytes / 1024 / 1024).toFixed(0)} MiB.`);
  if (spec.resourceType === "video" && input.declaredDurationSeconds !== null && input.declaredDurationSeconds > limits.videoMaxSeconds) {
    throw new AppError("VALIDATION_FAILED", `Video dài quá ${Math.round(limits.videoMaxSeconds / 60)} phút.`);
  }

  await releaseExpiredReservations();
  const c = await cols();
  if ((await c.uploadReservations.countDocuments({ userId: viewer.id, status: { $in: ["active", "finalizing"] } })) >= MAX_ACTIVE_RESERVATIONS) {
    throw new AppError("LIMIT_REACHED", "Bạn đang có quá nhiều lượt tải lên dở dang. Hoàn tất hoặc hủy bớt rồi thử lại.");
  }

  const countsVideo = spec.resourceType === "video";
  if (countsVideo) {
    const counter = await c.quotaCounters.findOne({ _id: videoKey(input.courseId) });
    const courseHasVideo = (counter?.usedCount ?? 0) + (counter?.reservedCount ?? 0) > 0;
    if (!courseHasVideo) {
      const coursesWithVideo = await c.quotaCounters.countDocuments({ _id: { $regex: /^videos:course:/ }, $expr: { $gt: [{ $add: ["$usedCount", "$reservedCount"] }, 0] } } as never);
      if (coursesWithVideo >= limits.coursesWithVideo) throw new AppError("QUOTA_EXCEEDED", `Đã đạt giới hạn ${limits.coursesWithVideo} khóa học có video.`);
    }
  }
  if (!(await reserveBytes(maxBytes, limits.storageBytes))) throw new AppError("QUOTA_EXCEEDED", "Đã hết dung lượng lưu trữ media cho phép.");
  if (countsVideo && !(await reserveVideoSlot(input.courseId, limits.videosPerCourse))) {
    await releaseQuota({ reservedBytes: maxBytes, countsVideo: false, courseId: input.courseId });
    throw new AppError("QUOTA_EXCEEDED", `Mỗi khóa học tối đa ${limits.videosPerCourse} video.`);
  }

  const reservationId = new ObjectId();
  const publicId = `${prefix()}c/${input.courseId.toHexString()}/${reservationId.toHexString()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const now = new Date();
  try {
    await c.uploadReservations.insertOne({
      _id: reservationId,
      userId: viewer.id,
      courseId: input.courseId,
      purpose: input.purpose,
      resourceType: spec.resourceType,
      deliveryType: spec.deliveryType,
      publicId,
      reservedBytes: maxBytes,
      countsVideo,
      status: "active",
      signatureTimestamp: timestamp,
      originalFilename: input.fileName.slice(0, 200),
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS),
      purgeAt: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    await releaseQuota({ reservedBytes: maxBytes, countsVideo, courseId: input.courseId });
    throw err;
  }

  // Bộ tham số do server quyết định 100% (ADR-009).
  const params: Record<string, string | number> = {
    timestamp,
    public_id: publicId,
    type: spec.deliveryType,
    allowed_formats: spec.formats.join(","),
    overwrite: "false",
    tags: `lms,${env().appEnv},course_${input.courseId.toHexString()}`,
  };
  if (countsVideo && status.eagerAllowed) {
    params.eager = "so_2,w_640,c_limit,f_jpg";
    params.eager_async = "true";
  }
  if (env().appUrl.startsWith("https://")) params.notification_url = `${env().appUrl}/api/webhooks/cloudinary`;
  const { signature, apiKey, cloudName } = signUpload(params);
  await audit({ actorId: viewer.id, action: "media.reserve", targetType: "uploadReservation", targetId: reservationId, meta: { purpose: input.purpose, bytes: input.declaredBytes } });
  return {
    reservationId: reservationId.toHexString(),
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${spec.resourceType}/upload`,
    fields: Object.fromEntries([...Object.entries(params).map(([k, v]) => [k, String(v)]), ["api_key", apiKey], ["signature", signature]]),
    maxBytes,
    resourceType: spec.resourceType,
  };
}

/* ---------------- Finalize (idempotent) ---------------- */

export function validateResource(r: CloudResource, res: Pick<UploadReservationDoc, "publicId" | "resourceType" | "deliveryType" | "purpose" | "createdAt">, limits: { videoMaxBytes: number; imageMaxBytes: number; videoMaxSeconds: number }): string | null {
  const spec = PURPOSES[res.purpose];
  if (r.public_id !== res.publicId) return "Sai định danh file.";
  if (r.resource_type !== res.resourceType) return "Loại file không đúng (ảnh/video).";
  if (r.type !== res.deliveryType) return "Kiểu lưu trữ không đúng.";
  if (!spec.formats.includes(String(r.format).toLowerCase())) return `Định dạng ${r.format} không được hỗ trợ.`;
  const maxBytes = res.resourceType === "video" ? limits.videoMaxBytes : limits.imageMaxBytes;
  if (!Number.isFinite(r.bytes) || r.bytes <= 0 || r.bytes > maxBytes) return `File ${(r.bytes / 1024 / 1024).toFixed(1)} MiB vượt giới hạn ${(maxBytes / 1024 / 1024).toFixed(0)} MiB.`;
  if (res.resourceType === "video") {
    if (typeof r.duration !== "number" || !Number.isFinite(r.duration) || r.duration <= 0) return "Không đọc được thời lượng video.";
    if (r.duration > limits.videoMaxSeconds + 0.5) return `Video dài ${Math.floor(r.duration / 60)} phút ${Math.round(r.duration % 60)} giây, vượt giới hạn ${Math.round(limits.videoMaxSeconds / 60)} phút.`;
  }
  if ((r.width ?? 0) > MAX_DIMENSION || (r.height ?? 0) > MAX_DIMENSION) return `Kích thước vượt ${MAX_DIMENSION}px.`;
  const created = new Date(r.created_at).getTime();
  if (Number.isFinite(created) && created < res.createdAt.getTime() - 60_000) return "File được tạo trước lượt tải lên này.";
  return null;
}

export type FinalizeResult = { mediaId: string; status: "ready" };

/**
 * Finalize: luôn tra Admin API (không dùng bytes/duration/publicId từ client — M3);
 * gọi lặp (client retry, webhook) chỉ tạo một asset, cộng quota một lần (M4).
 */
export async function finalizeReservation(reservationId: ObjectId, actor: { userId: ObjectId } | "webhook", now = new Date()): Promise<FinalizeResult> {
  const c = await cols();
  const res = await c.uploadReservations.findOne({ _id: reservationId });
  if (!res || (actor !== "webhook" && !res.userId.equals(actor.userId))) throw notFound("Không tìm thấy lượt tải lên");
  if (res.status === "consumed") {
    const asset = await c.mediaAssets.findOne({ reservationId });
    if (asset) return { mediaId: asset._id.toHexString(), status: "ready" };
  }
  if (res.status === "rejected") throw new AppError("UPLOAD_REJECTED", "File đã bị từ chối trước đó.");
  if (res.status === "expired" || res.status === "released") throw new AppError("RESERVATION_EXPIRED", "Lượt tải lên đã hết hạn hoặc đã hủy. Vui lòng tải lại.");
  if (res.status === "active" && res.expiresAt < now) {
    await releaseExpiredReservations(5, now);
    throw new AppError("RESERVATION_EXPIRED", "Lượt tải lên đã hết hạn. Vui lòng tải lại.");
  }
  const locked = await c.uploadReservations.findOneAndUpdate({ _id: reservationId, status: "active" }, { $set: { status: "finalizing", updatedAt: now } }, { returnDocument: "after" });
  if (!locked) {
    const again = await c.mediaAssets.findOne({ reservationId });
    if (again?.status === "ready") return { mediaId: again._id.toHexString(), status: "ready" };
    throw new AppError("CONFLICT", "Đang xử lý lượt tải lên này, vui lòng thử lại sau giây lát.");
  }

  let resource: CloudResource | null;
  try {
    resource = await fetchResource(res.publicId, res.resourceType, res.deliveryType);
  } catch (err) {
    await c.uploadReservations.updateOne({ _id: reservationId, status: "finalizing" }, { $set: { status: "active", updatedAt: new Date() } });
    throw err;
  }
  if (!resource) {
    await c.uploadReservations.updateOne({ _id: reservationId, status: "finalizing" }, { $set: { status: "active", updatedAt: new Date() } });
    throw new AppError("UPLOAD_NOT_FOUND", "Chưa thấy file trên Cloudinary. Nếu upload vừa xong, hãy thử lại sau vài giây.");
  }

  const { limits, killSwitches } = await getSettings();
  const problem = !killSwitches.uploadsEnabled ? "Upload đang bị tạm dừng bởi quản trị viên." : validateResource(resource, res, limits);
  const assetBase = {
    publicId: res.publicId,
    assetId: resource.asset_id,
    resourceType: res.resourceType,
    deliveryType: res.deliveryType,
    purpose: res.purpose,
    format: String(resource.format).toLowerCase(),
    bytes: resource.bytes,
    width: resource.width ?? null,
    height: resource.height ?? null,
    durationSeconds: typeof resource.duration === "number" ? resource.duration : null,
    version: resource.version,
    posterPublicId: res.resourceType === "video" ? res.publicId : null,
    ownerId: res.userId,
    courseId: res.courseId,
    reservationId,
    refs: [],
    originalFilename: res.originalFilename,
    createdAt: now,
    updatedAt: now,
  };

  if (problem) {
    // Từ chối: không tính là thành công; đưa vào hàng xóa, hoàn quota đã giữ chỗ.
    let rejectedId: ObjectId | null = null;
    await withTransaction(async (session) => {
      const upd = await c.uploadReservations.updateOne({ _id: reservationId, status: "finalizing" }, { $set: { status: "rejected", purgeAt: new Date(now.getTime() + 30 * 86400_000), updatedAt: now } }, { session });
      if (upd.modifiedCount !== 1) return;
      await releaseQuota(res, session);
      const ins = await c.mediaAssets.insertOne(
        { ...assetBase, status: "deletion_pending", rejectReason: problem, deletion: { requestedAt: now, attempts: 0, lastError: null, nextAttemptAt: now } },
        { session },
      );
      rejectedId = ins.insertedId;
    });
    if (rejectedId) await processDeletion(rejectedId).catch((err) => logger.warn("media.reject_delete_deferred", { err }));
    await audit({ actorId: actor === "webhook" ? null : actor.userId, action: "media.reject", targetType: "uploadReservation", targetId: reservationId, outcome: "denied", meta: { problem } });
    throw new AppError("UPLOAD_REJECTED", problem);
  }

  try {
    const mediaId = await withTransaction(async (session) => {
      const upd = await c.uploadReservations.updateOne({ _id: reservationId, status: "finalizing" }, { $set: { status: "consumed", purgeAt: new Date(now.getTime() + 30 * 86400_000), updatedAt: now } }, { session });
      if (upd.modifiedCount !== 1) throw new AppError("CONFLICT", "Lượt tải lên đã được xử lý.");
      const ins = await c.mediaAssets.insertOne({ ...assetBase, status: "ready", rejectReason: null, deletion: null }, { session });
      await c.quotaCounters.updateOne({ _id: storageKey }, { $inc: { reservedBytes: -res.reservedBytes, usedBytes: resource!.bytes }, $set: { updatedAt: now } }, { session });
      if (res.countsVideo) await c.quotaCounters.updateOne({ _id: videoKey(res.courseId) }, { $inc: { reservedCount: -1, usedCount: 1 }, $set: { updatedAt: now } }, { session });
      return ins.insertedId;
    });
    await audit({ actorId: actor === "webhook" ? null : actor.userId, action: "media.finalize", targetType: "mediaAsset", targetId: mediaId, meta: { bytes: resource.bytes, source: actor === "webhook" ? "webhook" : "client" } });
    return { mediaId: mediaId.toHexString(), status: "ready" };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const existing = await c.mediaAssets.findOne({ reservationId });
      if (existing) return { mediaId: existing._id.toHexString(), status: "ready" };
    }
    if (err instanceof AppError && err.code === "CONFLICT") {
      const existing = await c.mediaAssets.findOne({ reservationId });
      if (existing) return { mediaId: existing._id.toHexString(), status: "ready" };
    }
    throw err;
  }
}

export async function cancelReservation(viewer: Viewer, reservationId: ObjectId) {
  const c = await cols();
  const r = await c.uploadReservations.findOneAndUpdate(
    { _id: reservationId, userId: viewer.id, status: "active" },
    { $set: { status: "released", purgeAt: new Date(Date.now() + 30 * 86400_000), updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (r) await releaseQuota(r);
}

/* ---------------- Xóa (chỉ khi không còn tham chiếu) ---------------- */

export async function requestDeleteMedia(viewer: Viewer, mediaId: ObjectId) {
  const c = await cols();
  const m = await c.mediaAssets.findOne({ _id: mediaId });
  if (!m) throw notFound("Không tìm thấy media");
  await loadEditableCourse(viewer, m.courseId);
  const now = new Date();
  // M7: không xóa asset còn tham chiếu (draft hoặc bản đã xuất bản).
  const upd = await c.mediaAssets.updateOne(
    { _id: mediaId, status: "ready", refs: { $size: 0 } },
    { $set: { status: "deletion_pending", deletion: { requestedAt: now, attempts: 0, lastError: null, nextAttemptAt: now }, updatedAt: now } },
  );
  if (upd.modifiedCount === 0) {
    const cur = await c.mediaAssets.findOne({ _id: mediaId });
    if (cur?.refs.length) throw new AppError("MEDIA_IN_USE", "Media đang được dùng trong bài học hoặc bản đã xuất bản. Gỡ khỏi bài trước khi xóa.");
    throw new AppError("INVALID_STATE", "Media không ở trạng thái có thể xóa.");
  }
  await audit({ actorId: viewer.id, action: "media.delete_request", targetType: "mediaAsset", targetId: mediaId });
  await processDeletion(mediaId).catch((err) => logger.warn("media.delete_deferred", { err }));
}

/** Gọi provider xóa; chỉ đánh dấu deleted khi provider xác nhận. Thất bại → backoff lũy thừa, tối đa 8 lần. */
export async function processDeletion(mediaId: ObjectId): Promise<"deleted" | "retry" | "skipped"> {
  const c = await cols();
  const m = await c.mediaAssets.findOne({ _id: mediaId, status: "deletion_pending" });
  if (!m || !m.deletion) return "skipped";
  if (m.deletion.attempts >= 8) return "skipped";
  let ok = false;
  let error: string | null = null;
  try {
    ok = await destroyResource(m.publicId, m.resourceType, m.deliveryType);
    if (!ok) error = "provider did not confirm";
  } catch (err) {
    error = err instanceof Error ? err.message.slice(0, 200) : "unknown";
  }
  const now = new Date();
  if (ok) {
    const upd = await c.mediaAssets.updateOne({ _id: mediaId, status: "deletion_pending" }, { $set: { status: m.rejectReason ? "rejected" : "deleted", updatedAt: now } });
    // Chỉ trừ quota với asset đã từng được commit (asset bị từ chối chưa từng cộng).
    if (upd.modifiedCount === 1 && !m.rejectReason) {
      await c.quotaCounters.updateOne({ _id: storageKey }, { $inc: { usedBytes: -m.bytes }, $set: { updatedAt: now } });
      if (m.resourceType === "video") await c.quotaCounters.updateOne({ _id: videoKey(m.courseId) }, { $inc: { usedCount: -1 }, $set: { updatedAt: now } });
    }
    return "deleted";
  }
  const attempts = m.deletion.attempts + 1;
  await c.mediaAssets.updateOne(
    { _id: mediaId },
    { $set: { "deletion.attempts": attempts, "deletion.lastError": error, "deletion.nextAttemptAt": new Date(now.getTime() + Math.min(2 ** attempts * 60_000, 2 * 3600_000)), updatedAt: now } },
  );
  return "retry";
}

export async function processDeletionQueue(limit = 20) {
  const c = await cols();
  const due = await c.mediaAssets.find({ status: "deletion_pending", "deletion.nextAttemptAt": { $lte: new Date() }, "deletion.attempts": { $lt: 8 } }).limit(limit).toArray();
  const results = [];
  for (const m of due) results.push({ id: m._id.toHexString(), publicId: m.publicId, result: await processDeletion(m._id) });
  return results;
}

/* ---------------- Reconcile & orphan (dry-run mặc định) ---------------- */

export async function reconcile(opts: { apply: boolean }) {
  const c = await cols();
  const now = new Date();
  const report: string[] = [];
  const expired = await c.uploadReservations.countDocuments({ status: "active", expiresAt: { $lt: now } });
  report.push(`Reservation active đã hết hạn: ${expired}`);
  if (opts.apply && expired) report.push(`→ đã giải phóng ${await releaseExpiredReservations(1000, now)}`);
  const stuck = await c.uploadReservations.find({ status: "finalizing", updatedAt: { $lt: new Date(now.getTime() - 15 * 60_000) } }).toArray();
  report.push(`Reservation 'finalizing' treo > 15 phút: ${stuck.length}`);
  for (const r of stuck) {
    if (!opts.apply) continue;
    await c.uploadReservations.updateOne({ _id: r._id, status: "finalizing" }, { $set: { status: "active", updatedAt: now } });
    try {
      await finalizeReservation(r._id, "webhook", now);
      report.push(`→ finalize lại ${r.publicId}: ok`);
    } catch (err) {
      report.push(`→ finalize lại ${r.publicId}: ${err instanceof Error ? err.message : "lỗi"}`);
    }
  }
  // Tính lại counter từ nguồn sự thật (assets ready + reservation đang giữ).
  const [usedAgg] = await c.mediaAssets.aggregate<{ bytes: number }>([{ $match: { status: { $in: ["ready", "deletion_pending"] }, rejectReason: null } }, { $group: { _id: null, bytes: { $sum: "$bytes" } } }]).toArray();
  const [resAgg] = await c.uploadReservations.aggregate<{ bytes: number }>([{ $match: { status: { $in: ["active", "finalizing"] } } }, { $group: { _id: null, bytes: { $sum: "$reservedBytes" } } }]).toArray();
  const counter = await c.quotaCounters.findOne({ _id: storageKey });
  const expected = { usedBytes: usedAgg?.bytes ?? 0, reservedBytes: resAgg?.bytes ?? 0 };
  report.push(`Counter storage hiện: used=${counter?.usedBytes ?? 0}, reserved=${counter?.reservedBytes ?? 0}; tính lại: used=${expected.usedBytes}, reserved=${expected.reservedBytes}`);
  if (opts.apply && (counter?.usedBytes !== expected.usedBytes || counter?.reservedBytes !== expected.reservedBytes)) {
    await c.quotaCounters.updateOne({ _id: storageKey }, { $set: { ...expected, updatedAt: now } }, { upsert: true });
    report.push("→ đã cập nhật counter storage");
  }
  return report;
}

/** Liệt kê orphan trên Cloudinary (không có bản ghi tương ứng, cũ hơn grace 24h). Xóa chỉ khi apply. */
export async function findOrphans(opts: { apply: boolean; maxPages?: number }) {
  const c = await cols();
  const out: { publicId: string; resourceType: string; type: string; bytes: number; createdAt: string; reason: string; deleted?: boolean }[] = [];
  for (const resourceType of ["image", "video"] as const) {
    for (const type of ["upload", "authenticated"] as const) {
      let cursor: string | undefined;
      for (let page = 0; page < (opts.maxPages ?? 5); page++) {
        const res = await listResources(resourceType, type, prefix(), cursor);
        for (const r of res.resources) {
          if (Date.now() - new Date(r.created_at).getTime() < ORPHAN_GRACE_MS) continue;
          // Bỏ qua derived/eager: chỉ xét public_id gốc.
          const asset = await c.mediaAssets.findOne({ publicId: r.public_id, status: { $in: ["ready", "deletion_pending"] } });
          const reservation = await c.uploadReservations.findOne({ publicId: r.public_id, status: { $in: ["active", "finalizing"] } });
          if (asset || reservation) continue;
          const item: (typeof out)[number] = { publicId: r.public_id, resourceType, type, bytes: r.bytes, createdAt: r.created_at, reason: "Không có bản ghi mediaAssets/reservation hợp lệ" };
          if (opts.apply) item.deleted = await destroyResource(r.public_id, resourceType, type).catch(() => false);
          out.push(item);
        }
        cursor = res.next_cursor;
        if (!cursor) break;
      }
    }
  }
  return out;
}

/* ---------------- Truy vấn cho UI ---------------- */

export async function listCourseMedia(viewer: Viewer, courseId: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const assets = await c.mediaAssets.find({ courseId, status: { $in: ["ready", "deletion_pending"] } }).sort({ createdAt: -1 }).limit(100).toArray();
  return assets.map((a: Doc<MediaAssetDoc>) => ({
    id: a._id.toHexString(),
    purpose: a.purpose,
    resourceType: a.resourceType,
    deliveryType: a.deliveryType,
    bytes: a.bytes,
    durationSeconds: a.durationSeconds,
    width: a.width,
    height: a.height,
    status: a.status,
    inUse: a.refs.length > 0,
    filename: a.originalFilename,
    imageMeta: a.imageMeta ?? null,
    imageUrl: a.resourceType === "image" && a.status === "ready" && a.deliveryType === "upload" ? mediaImageUrl(a.publicId, a.version, 960) : null,
    createdAt: a.createdAt.toISOString(),
  }));
}

/* ---------------- M03: thông tin ảnh ---------------- */

export const IMAGE_LICENSES = ["Tự tạo cho khóa học", "CC0", "CC BY 4.0", "CC BY-SA 4.0", "Được tác giả cho phép", "Ảnh chụp màn hình phần mềm"] as const;

export async function updateImageMeta(viewer: Viewer, mediaId: ObjectId, meta: { alt: string; caption: string; credit: string; license: string }) {
  const c = await cols();
  const a = await c.mediaAssets.findOne({ _id: mediaId, resourceType: "image", status: "ready" });
  if (!a) throw notFound("Không tìm thấy ảnh");
  await loadEditableCourse(viewer, a.courseId); // chỉ chủ khóa/admin
  const clean = (s: string, n: number) => stripControlChars(s).replace(/\s+/g, " ").trim().slice(0, n);
  const m = { alt: clean(meta.alt, 200), caption: clean(meta.caption, 300), credit: clean(meta.credit, 120), license: clean(meta.license, 80) };
  if (a.purpose === "lesson_image" && m.alt.length < 3) throw new AppError("VALIDATION_FAILED", "Ảnh trong bài cần mô tả (alt) để người dùng trình đọc màn hình hiểu nội dung.", { fieldErrors: { alt: ["Bắt buộc"] } });
  await c.mediaAssets.updateOne({ _id: mediaId }, { $set: { imageMeta: m, updatedAt: new Date() } });
  await audit({ actorId: viewer.id, action: "media.image_meta", targetType: "mediaAsset", targetId: mediaId, meta: { license: m.license } });
}
