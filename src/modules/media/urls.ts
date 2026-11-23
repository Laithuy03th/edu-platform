import "server-only";
import { env } from "@/lib/env";

/** Chỉ cho phép 3 width cố định → không tạo transformation vô hạn theo input (ADR-011). */
export const IMAGE_WIDTHS = [320, 640, 960] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

const snap = (w: number): ImageWidth => IMAGE_WIDTHS.find((x) => x >= w) ?? 960;

/** URL ảnh public (delivery type `upload`) với transformation cố định. */
export function mediaImageUrl(publicId: string, version: number, width: number): string | null {
  const cloud = env().CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  return `https://res.cloudinary.com/${cloud}/image/upload/c_limit,w_${snap(width)},f_auto,q_auto/v${version}/${publicId}`;
}

/** URL public của poster video (eager đã tạo lúc upload). */
export function posterUrl(publicId: string, version: number, deliveryType: "upload" | "authenticated"): string | null {
  const cloud = env().CLOUDINARY_CLOUD_NAME;
  if (!cloud || deliveryType !== "upload") return null;
  return `https://res.cloudinary.com/${cloud}/video/upload/so_2,w_640,c_limit,f_jpg/v${version}/${publicId}.jpg`;
}
