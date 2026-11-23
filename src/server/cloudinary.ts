import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

/* Adapter Cloudinary — chỉ server dùng; API secret không bao giờ rời server. */

let configured = false;
export function cld() {
  const e = env();
  if (!e.cloudinaryEnabled) throw new AppError("NOT_CONFIGURED", "Cloudinary chưa được cấu hình (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
  if (!configured) {
    cloudinary.config({ cloud_name: e.CLOUDINARY_CLOUD_NAME, api_key: e.CLOUDINARY_API_KEY, api_secret: e.CLOUDINARY_API_SECRET, secure: true });
    configured = true;
  }
  return cloudinary;
}

export type SignedUploadParams = Record<string, string | number>;

/**
 * Ký bộ tham số upload DO SERVER QUYẾT ĐỊNH (ADR-009). Client chỉ nhận chữ ký cho đúng bộ này;
 * thêm/sửa tham số → chữ ký sai → Cloudinary từ chối. Chữ ký hợp lệ 1 giờ kể từ timestamp.
 */
export function signUpload(params: SignedUploadParams): { signature: string; apiKey: string; cloudName: string } {
  const c = cld();
  const e = env();
  return { signature: c.utils.api_sign_request(params, e.CLOUDINARY_API_SECRET!), apiKey: e.CLOUDINARY_API_KEY!, cloudName: e.CLOUDINARY_CLOUD_NAME! };
}

export type CloudResource = {
  asset_id: string;
  public_id: string;
  resource_type: string;
  type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  version: number;
  created_at: string;
};

/** Metadata THẬT từ Admin API (không tin dữ liệu client). null nếu không tồn tại. */
export async function fetchResource(publicId: string, resourceType: "image" | "video", type: "upload" | "authenticated"): Promise<CloudResource | null> {
  try {
    return (await cld().api.resource(publicId, { resource_type: resourceType, type })) as CloudResource;
  } catch (err) {
    const status = (err as { error?: { http_code?: number } })?.error?.http_code;
    if (status === 404) return null;
    throw new AppError("PROVIDER_UNAVAILABLE", "Không kiểm tra được file trên Cloudinary. Vui lòng thử lại.", { cause: err });
  }
}

/** Xóa asset; chỉ coi là thành công khi provider xác nhận ("ok" hoặc "not found"). */
export async function destroyResource(publicId: string, resourceType: "image" | "video", type: "upload" | "authenticated"): Promise<boolean> {
  const res = (await cld().uploader.destroy(publicId, { resource_type: resourceType, type, invalidate: true })) as { result?: string };
  return res.result === "ok" || res.result === "not found";
}

export async function listResources(resourceType: "image" | "video", type: "upload" | "authenticated", prefix: string, nextCursor?: string) {
  return (await cld().api.resources({ resource_type: resourceType, type, prefix, max_results: 100, next_cursor: nextCursor })) as {
    resources: CloudResource[];
    next_cursor?: string;
  };
}

export async function fetchUsage(): Promise<Record<string, unknown>> {
  return (await cld().api.usage()) as Record<string, unknown>;
}

/** Signed delivery URL cho video `authenticated`. LƯU Ý: không hết hạn, không chống chia sẻ link (ADR-010). */
export function signedVideoUrl(publicId: string, version: number): string {
  return cld().url(publicId, { resource_type: "video", type: "authenticated", sign_url: true, secure: true, version });
}

export function signedVideoPosterUrl(publicId: string, version: number): string {
  return cld().url(publicId, {
    resource_type: "video",
    type: "authenticated",
    sign_url: true,
    secure: true,
    version,
    format: "jpg",
    transformation: [{ start_offset: 2, width: 640, crop: "limit" }],
  });
}

export const WEBHOOK_MAX_AGE_SECONDS = 7200;

/** Xác minh chữ ký webhook: hash(body + timestamp + api_secret), SHA-1 hoặc SHA-256, so sánh timing-safe. */
export function verifyWebhookSignature(body: string, timestamp: string | null, signature: string | null, nowSec = Math.floor(Date.now() / 1000), secret = env().CLOUDINARY_API_SECRET): boolean {
  if (!secret || !timestamp || !signature || !/^\d{9,11}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  if (ts < nowSec - WEBHOOK_MAX_AGE_SECONDS || ts > nowSec + 300) return false;
  const sig = Buffer.from(signature.toLowerCase());
  for (const algo of ["sha1", "sha256"] as const) {
    const expected = Buffer.from(createHash(algo).update(body + timestamp + secret).digest("hex"));
    if (expected.length === sig.length && timingSafeEqual(expected, sig)) return true;
  }
  return false;
}
