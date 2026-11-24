import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { cols, type AppSettingsAnnouncement } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";

export const ANNOUNCEMENT_TAG = "announcement";

/** Link nội bộ ("/courses") hoặc https tuyệt đối — không javascript:, không http, không //host. */
const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s/]+\.[^\s]+$/.test(v), "Chỉ link nội bộ (bắt đầu bằng /) hoặc https://");

export const announcementFields = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(180, "Tối đa 180 ký tự"),
  linkHref: safeHref,
  linkLabel: z.string().trim().max(40),
  tone: z.enum(["brand", "info", "warning"]),
});
export type AnnouncementInput = z.infer<typeof announcementFields>;
/** Ràng buộc chéo trường — dùng chung cho service và action (Zod 4 không cho .extend() sau refine). */
export function checkAnnouncement(v: AnnouncementInput, ctx: z.RefinementCtx) {
  if (v.enabled && v.message.length < 5) ctx.addIssue({ code: "custom", path: ["message"], message: "Nhập nội dung (ít nhất 5 ký tự) trước khi bật" });
  if (v.linkHref && !v.linkLabel) ctx.addIssue({ code: "custom", path: ["linkLabel"], message: "Nhập chữ cho link" });
}
export const announcementInput = announcementFields.superRefine(checkAnnouncement);

export type AnnouncementDto = Omit<AppSettingsAnnouncement, "_id" | "updatedBy" | "updatedAt"> & { updatedAt: string | null };

const EMPTY: AnnouncementDto = { enabled: false, message: "", linkHref: "", linkLabel: "", tone: "brand", version: 0, updatedAt: null };

async function load(): Promise<AnnouncementDto> {
  const c = await cols();
  const d = (await c.appSettings.findOne({ _id: "announcement" })) as AppSettingsAnnouncement | null;
  if (!d) return EMPTY;
  return { enabled: d.enabled, message: d.message, linkHref: d.linkHref, linkLabel: d.linkLabel, tone: d.tone, version: d.version, updatedAt: d.updatedAt.toISOString() };
}

/** Public, không phụ thuộc người xem → cache chung; admin lưu thì updateTag. */
export const getAnnouncement = unstable_cache(load, ["announcement-v1"], { tags: [ANNOUNCEMENT_TAG], revalidate: 3600 });
export const __uncachedAnnouncement = load;

export async function updateAnnouncement(viewer: Viewer, expectedVersion: number, input: AnnouncementInput) {
  if (!viewer.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên được sửa banner.");
  input = announcementInput.parse(input);
  const c = await cols();
  const now = new Date();
  const doc = { ...input, version: expectedVersion + 1, updatedBy: viewer.id, updatedAt: now };
  if (expectedVersion === 0) {
    const r = await c.appSettings.updateOne({ _id: "announcement" } as never, { $setOnInsert: doc } as never, { upsert: true });
    if (r.upsertedCount === 0) throw new AppError("STALE_REVISION", "Banner vừa được người khác sửa. Tải lại trang.");
  } else {
    const r = await c.appSettings.updateOne({ _id: "announcement", version: expectedVersion } as never, { $set: doc } as never);
    if (r.matchedCount === 0) throw new AppError("STALE_REVISION", "Banner vừa được người khác sửa. Tải lại trang.");
  }
  await audit({ actorId: viewer.id, action: "site.announcement_update", targetType: "appSettings", targetId: "announcement", meta: { enabled: input.enabled, tone: input.tone } });
  return expectedVersion + 1;
}
