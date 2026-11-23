import "server-only";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { cols, type AppSettingsBudget, type AppSettingsKillSwitches, type AppSettingsLimits } from "@/server/db/models";
import { audit } from "@/server/audit";

export type Limits = Omit<AppSettingsLimits, "_id" | "updatedBy" | "updatedAt">;
export type Budget = Omit<AppSettingsBudget, "_id" | "updatedBy" | "updatedAt">;
export type KillSwitches = Omit<AppSettingsKillSwitches, "_id" | "updatedBy" | "updatedAt">;

function defaults() {
  const e = env();
  const limits: Limits = {
    videoMaxBytes: e.QUOTA_VIDEO_MAX_BYTES,
    videoMaxSeconds: e.QUOTA_VIDEO_MAX_SECONDS,
    imageMaxBytes: e.QUOTA_IMAGE_MAX_BYTES,
    videosPerCourse: e.QUOTA_VIDEOS_PER_COURSE,
    coursesWithVideo: e.QUOTA_COURSES_WITH_VIDEO,
    storageBytes: e.QUOTA_STORAGE_BYTES,
    version: 0,
  };
  const budget: Budget = {
    cloudinaryCredits: e.BUDGET_CLOUDINARY_CREDITS,
    mongodbBytes: e.BUDGET_MONGODB_BYTES,
    usageStaleAfterMinutes: e.USAGE_STALE_AFTER_MINUTES,
    version: 0,
  };
  const killSwitches: KillSwitches = { uploadsEnabled: true, playbackIssuanceEnabled: true, eagerTransformationsEnabled: true, version: 0 };
  return { limits, budget, killSwitches };
}

export async function getSettings() {
  const c = await cols();
  const docs = await c.appSettings.find({ _id: { $in: ["limits", "budget", "killSwitches"] } }).toArray();
  const d = defaults();
  const pick = <T>(id: string, fallback: T): T => {
    const doc = docs.find((x) => x._id === id);
    if (!doc) return fallback;
    const { _id: _ignored, updatedBy: _u, updatedAt: _t, ...rest } = doc as unknown as Record<string, unknown>;
    return { ...fallback, ...rest } as T;
  };
  return { limits: pick("limits", d.limits), budget: pick("budget", d.budget), killSwitches: pick("killSwitches", d.killSwitches) };
}

/** Admin cập nhật cấu hình với optimistic concurrency (version) + audit. Không có đường tắt bỏ qua quota. */
export async function updateSettings<K extends "limits" | "budget" | "killSwitches">(
  adminId: ObjectId,
  key: K,
  expectedVersion: number,
  values: K extends "limits" ? Omit<Limits, "version"> : K extends "budget" ? Omit<Budget, "version"> : Omit<KillSwitches, "version">,
) {
  const c = await cols();
  const current = (await getSettings())[key];
  if (current.version !== expectedVersion) throw new AppError("STALE_REVISION", "Cấu hình vừa được thay đổi. Tải lại trang.");
  const res = await c.appSettings.updateOne(
    { _id: key, ...(expectedVersion === 0 ? {} : { version: expectedVersion }) } as never,
    { $set: { ...values, version: expectedVersion + 1, updatedBy: adminId, updatedAt: new Date() } } as never,
    { upsert: expectedVersion === 0 },
  );
  if (res.matchedCount === 0 && res.upsertedCount === 0) throw new AppError("STALE_REVISION", "Cấu hình vừa được thay đổi. Tải lại trang.");
  await audit({ actorId: adminId, action: `settings.${key}.update`, targetType: "appSettings", targetId: key, meta: { before: current, after: values } });
}
