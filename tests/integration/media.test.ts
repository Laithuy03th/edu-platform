import { describe, expect, it, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

/*
 * MOCK ranh giới provider Cloudinary (ADR-015): kiểm tra logic reservation/quota/finalize của ứng dụng.
 * KHÔNG chứng minh hành vi Cloudinary thật — cần kiểm thử thủ công với tài khoản thật (TEST_PLAN, provider tests).
 */
const cloud = vi.hoisted(() => ({ resources: new Map<string, Record<string, unknown>>(), destroyed: [] as string[], signed: [] as Record<string, string | number>[] }));
vi.mock("@/server/cloudinary", () => ({
  signUpload: (params: Record<string, string | number>) => {
    cloud.signed.push(params);
    return { signature: "sig", apiKey: "key", cloudName: "demo" };
  },
  fetchResource: async (publicId: string) => cloud.resources.get(publicId) ?? null,
  destroyResource: async (publicId: string) => {
    cloud.destroyed.push(publicId);
    return true;
  },
  fetchUsage: async () => ({ plan: "Free", last_updated: new Date().toISOString().slice(0, 10), storage: { usage: 1000 }, bandwidth: { usage: 0 }, transformations: { usage: 0 }, credits: { usage: 0.5, limit: 25 } }),
  listResources: async () => ({ resources: [] }),
  verifyWebhookSignature: () => true,
}));

process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "secret";

const { cols } = await import("@/server/db/models");
const { resetEnvCache } = await import("@/lib/env");
resetEnvCache();
const media = await import("@/modules/media/service");
const { refreshCloudinaryUsage } = await import("@/modules/media/usage");
const { makeUser, publishedCourse } = await import("./helpers");

const MiB = 1024 * 1024;
const fileMeta = (over: Partial<{ declaredBytes: number; declaredType: string; declaredDurationSeconds: number | null }> = {}) => ({
  purpose: "lesson_video" as const,
  fileName: "bai1.mp4",
  declaredBytes: 5 * MiB,
  declaredType: "video/mp4",
  declaredDurationSeconds: 60,
  ...over,
});

beforeEach(async () => {
  await refreshCloudinaryUsage(null); // usage mới → không bị fail-closed
});

function uploadedResource(publicId: string, over: Record<string, unknown> = {}) {
  cloud.resources.set(publicId, { asset_id: "a" + publicId.length, public_id: publicId, resource_type: "video", type: "authenticated", format: "mp4", bytes: 4 * MiB, duration: 90, width: 1280, height: 720, version: 1, created_at: new Date().toISOString(), ...over });
}

describe("media & quota (mock Cloudinary)", () => {
  it("M1: không xin upload cho khóa không sở hữu", async () => {
    const p = await publishedCourse();
    const other = await makeUser(["instructor"]);
    await expect(media.requestUpload(other, { courseId: p.courseId, ...fileMeta() })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("M11: tham số ký do server quyết định (public_id, type, allowed_formats, overwrite)", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const params = cloud.signed.at(-1)!;
    expect(params.public_id).toBe(`lms/test/c/${p.courseId.toHexString()}/${t.reservationId}`);
    expect(params).toMatchObject({ type: "authenticated", allowed_formats: "mp4,webm", overwrite: "false" });
    expect(t.fields.signature).toBe("sig");
    expect(t.fields).not.toHaveProperty("api_secret");
  });

  it("khai báo vượt giới hạn bị từ chối ngay (UX), file sai định dạng bị từ chối", async () => {
    const p = await publishedCourse();
    await expect(media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta({ declaredBytes: 50 * MiB }) })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta({ declaredType: "image/svg+xml" }) })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("M2: hai reservation đồng thời không vượt quota lưu trữ", async () => {
    const c = await cols();
    // Đặt quota còn đúng chỗ cho 1 video 20 MiB
    await c.appSettings.updateOne({ _id: "limits" } as never, { $set: { videoMaxBytes: 20 * MiB, videoMaxSeconds: 300, imageMaxBytes: MiB, videosPerCourse: 10, coursesWithVideo: 50, storageBytes: 30 * MiB, version: 1 } } as never, { upsert: true });
    await c.quotaCounters.deleteMany({});
    const results = await Promise.allSettled([media.reserveBytes(20 * MiB, 30 * MiB), media.reserveBytes(20 * MiB, 30 * MiB), media.reserveBytes(20 * MiB, 30 * MiB)]);
    expect(results.filter((r) => r.status === "fulfilled" && r.value === true)).toHaveLength(1);
    await c.appSettings.deleteOne({ _id: "limits" } as never);
    await c.quotaCounters.deleteMany({});
  });

  it("M3/M4: finalize dùng metadata thật; gọi lặp chỉ tạo 1 asset và cộng quota 1 lần", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const c = await cols();
    const res = await c.uploadReservations.findOne({ _id: new ObjectId(t.reservationId) });
    uploadedResource(res!.publicId);
    const before = (await c.quotaCounters.findOne({ _id: "storage:global" }))!;
    const [a, b, w] = await Promise.allSettled([
      media.finalizeReservation(res!._id, { userId: p.instructor.id }),
      media.finalizeReservation(res!._id, { userId: p.instructor.id }),
      media.finalizeReservation(res!._id, "webhook"),
    ]);
    const ok = [a, b, w].filter((x) => x.status === "fulfilled") as PromiseFulfilledResult<{ mediaId: string }>[];
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((x) => x.value.mediaId)).size).toBe(1);
    expect(await c.mediaAssets.countDocuments({ reservationId: res!._id })).toBe(1);
    const after = (await c.quotaCounters.findOne({ _id: "storage:global" }))!;
    expect(after.usedBytes - before.usedBytes).toBe(4 * MiB);
    expect(before.reservedBytes - after.reservedBytes).toBe(res!.reservedBytes);
    // Gọi lại lần nữa vẫn idempotent
    const again = await media.finalizeReservation(res!._id, { userId: p.instructor.id });
    expect(again.mediaId).toBe(ok[0]!.value.mediaId);
  });

  it("M3: file thật vượt thời lượng → bị từ chối, xóa trên provider, hoàn quota", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const c = await cols();
    const res = await c.uploadReservations.findOne({ _id: new ObjectId(t.reservationId) });
    uploadedResource(res!.publicId, { duration: 999 }); // client khai 60s nhưng thực tế 999s
    await expect(media.finalizeReservation(res!._id, { userId: p.instructor.id })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(cloud.destroyed).toContain(res!.publicId);
    expect((await c.uploadReservations.findOne({ _id: res!._id }))?.status).toBe("rejected");
    expect(await c.mediaAssets.countDocuments({ reservationId: res!._id, status: "ready" })).toBe(0);
  });

  it("client đổi resource_type (ảnh thay video) bị phát hiện", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const c = await cols();
    const res = await c.uploadReservations.findOne({ _id: new ObjectId(t.reservationId) });
    uploadedResource(res!.publicId, { resource_type: "image", format: "png", duration: undefined });
    await expect(media.finalizeReservation(res!._id, { userId: p.instructor.id })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
  });

  it("finalize sau khi reservation hết hạn bị từ chối và hoàn quota", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const c = await cols();
    await c.uploadReservations.updateOne({ _id: new ObjectId(t.reservationId) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(media.finalizeReservation(new ObjectId(t.reservationId), { userId: p.instructor.id })).rejects.toMatchObject({ code: "RESERVATION_EXPIRED" });
    expect((await c.uploadReservations.findOne({ _id: new ObjectId(t.reservationId) }))?.status).toBe("expired");
  });

  it("M7: không xóa media còn được bài học tham chiếu", async () => {
    const p = await publishedCourse();
    const t = await media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() });
    const c = await cols();
    const res = await c.uploadReservations.findOne({ _id: new ObjectId(t.reservationId) });
    uploadedResource(res!.publicId);
    const { mediaId } = await media.finalizeReservation(res!._id, { userId: p.instructor.id });
    await c.mediaAssets.updateOne({ _id: new ObjectId(mediaId) }, { $push: { refs: { kind: "lesson_published", id: p.lessonIds[0]! } } });
    await expect(media.requestDeleteMedia(p.instructor, new ObjectId(mediaId))).rejects.toMatchObject({ code: "MEDIA_IN_USE" });
  });

  it("M8: usage cũ → fail-closed, không cấp chữ ký mới", async () => {
    const p = await publishedCourse();
    const c = await cols();
    await c.usageSnapshots.updateMany({}, { $set: { takenAt: new Date(Date.now() - 3 * 86400_000) } });
    // Lần refresh tự động cũng thất bại (mô phỏng API lỗi bằng snapshot lỗi gần đây)
    await c.usageSnapshots.insertOne({ source: "cloudinary_admin_api", takenAt: new Date(), ok: false, error: "timeout", providerLastUpdated: null, authoritative: false, data: {}, fetchedBy: null });
    await expect(media.requestUpload(p.instructor, { courseId: p.courseId, ...fileMeta() })).rejects.toMatchObject({ code: "USAGE_STALE" });
  });
});
