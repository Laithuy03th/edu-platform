import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cols } from "@/server/db/models";
import { verifyWebhookSignature } from "@/server/cloudinary";
import { finalizeReservation } from "@/modules/media/service";

/**
 * Webhook Cloudinary (finalize phụ, ADR-009): xác minh chữ ký + timestamp, rồi gọi cùng hàm finalize
 * idempotent. Không dùng cookie. Body giới hạn 64 KB.
 */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 64 * 1024) return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 413 });
  if (!verifyWebhookSignature(body, req.headers.get("x-cld-timestamp"), req.headers.get("x-cld-signature"))) {
    logger.warn("webhook.cloudinary.bad_signature");
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  let payload: { notification_type?: string; public_id?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 422 });
  }
  if (payload.notification_type !== "upload" || typeof payload.public_id !== "string") return new NextResponse(null, { status: 204 });
  const c = await cols();
  const reservation = await c.uploadReservations.findOne({ publicId: payload.public_id });
  if (!reservation) return new NextResponse(null, { status: 204 }); // orphan: để cleanup xử lý
  try {
    await finalizeReservation(reservation._id, "webhook");
  } catch (err) {
    // Lỗi nghiệp vụ (hết hạn, bị từ chối) là kết quả hợp lệ; không yêu cầu provider gửi lại.
    if (!(err instanceof AppError)) {
      logger.error("webhook.cloudinary.finalize_failed", { err });
      return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
    }
  }
  return new NextResponse(null, { status: 204 });
}
