import "server-only";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { cols, type UsageSnapshotDoc } from "@/server/db/models";
import { getDb } from "@/server/db/client";
import { fetchUsage } from "@/server/cloudinary";
import { getSettings } from "./settings";

const GB = 1e9; // Tài liệu Cloudinary dùng "GB" — ta dùng 10^9 (cách hiểu bất lợi hơn cho ngân sách).

type UsageBlock = { usage?: number; limit?: number; used_percent?: number };

/** Chuyển response Usage API thành snapshot; credits nếu provider trả, nếu không thì ƯỚC TÍNH (authoritative=false). */
export function mapCloudinaryUsage(raw: Record<string, unknown>) {
  const block = (k: string) => (raw[k] && typeof raw[k] === "object" ? (raw[k] as UsageBlock) : {});
  const storageBytes = Number(block("storage").usage ?? 0);
  const bandwidthBytes = Number(block("bandwidth").usage ?? 0);
  const transformations = Number(block("transformations").usage ?? 0);
  const credits = block("credits");
  const hasCredits = typeof credits.usage === "number";
  const estimated = storageBytes / GB + bandwidthBytes / GB + transformations / 1000;
  const lastUpdated = typeof raw.last_updated === "string" ? new Date(raw.last_updated) : null;
  return {
    providerLastUpdated: lastUpdated && !Number.isNaN(lastUpdated.getTime()) ? lastUpdated : null,
    authoritative: hasCredits,
    data: {
      storageBytes,
      bandwidthBytes,
      transformations,
      creditsUsed: hasCredits ? Number(credits.usage) : Math.round(estimated * 100) / 100,
      creditsLimit: typeof credits.limit === "number" ? credits.limit : null,
      plan: typeof raw.plan === "string" ? raw.plan : undefined,
    },
  };
}

export async function refreshCloudinaryUsage(actorId: ObjectId | null): Promise<UsageSnapshotDoc> {
  const c = await cols();
  const takenAt = new Date();
  let doc: UsageSnapshotDoc;
  try {
    const mapped = mapCloudinaryUsage(await fetchUsage());
    doc = { source: "cloudinary_admin_api", takenAt, ok: true, error: null, fetchedBy: actorId, ...mapped };
  } catch (err) {
    logger.error("usage.cloudinary_failed", { err });
    doc = { source: "cloudinary_admin_api", takenAt, ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "unknown", providerLastUpdated: null, authoritative: false, data: {}, fetchedBy: actorId };
  }
  await c.usageSnapshots.insertOne(doc);
  return doc;
}

/** MongoDB: dataSize + indexSize qua dbStats (cần quyền dbStats; nếu thiếu thì ghi lỗi, không bịa số). */
export async function refreshMongoUsage(actorId: ObjectId | null): Promise<UsageSnapshotDoc> {
  const c = await cols();
  const takenAt = new Date();
  let doc: UsageSnapshotDoc;
  try {
    const stats = (await (await getDb()).command({ dbStats: 1 })) as { dataSize?: number; indexSize?: number; storageSize?: number };
    doc = { source: "mongodb_dbstats", takenAt, ok: true, error: null, providerLastUpdated: takenAt, authoritative: true, data: { dataSize: stats.dataSize ?? 0, indexSize: stats.indexSize ?? 0 }, fetchedBy: actorId };
  } catch (err) {
    doc = { source: "mongodb_dbstats", takenAt, ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "unknown", providerLastUpdated: null, authoritative: false, data: {}, fetchedBy: actorId };
  }
  await c.usageSnapshots.insertOne(doc);
  return doc;
}

export async function latestSnapshot(source: UsageSnapshotDoc["source"], onlyOk = true) {
  const c = await cols();
  return c.usageSnapshots.find({ source, ...(onlyOk ? { ok: true } : {}) }).sort({ takenAt: -1 }).limit(1).next();
}

export type BudgetLevel = "ok" | "warn" | "strict" | "stop";
export const levelOf = (percent: number): BudgetLevel => (percent >= 90 ? "stop" : percent >= 80 ? "strict" : percent >= 60 ? "warn" : "ok");

/**
 * Trạng thái ngân sách + quyết định cấp upload (fail-closed khi usage cũ/lỗi — §17.3).
 * Bài đọc không phụ thuộc trạng thái này.
 */
export async function budgetStatus(opts: { refreshIfOlderThanMinutes?: number } = {}) {
  const { budget, killSwitches, limits } = await getSettings();
  let snap = await latestSnapshot("cloudinary_admin_api");
  const lastAttempt = await latestSnapshot("cloudinary_admin_api", false);
  const ageMin = (d: Date | undefined | null) => (d ? (Date.now() - d.getTime()) / 60000 : Infinity);
  if (env().cloudinaryEnabled && opts.refreshIfOlderThanMinutes !== undefined && ageMin(snap?.takenAt) > opts.refreshIfOlderThanMinutes && ageMin(lastAttempt?.takenAt) > 15) {
    const fresh = await refreshCloudinaryUsage(null);
    if (fresh.ok) snap = await latestSnapshot("cloudinary_admin_api");
  }
  const c = await cols();
  const storage = await c.quotaCounters.findOne({ _id: "storage:global" });
  const localStorageBytes = (storage?.usedBytes ?? 0) + (storage?.reservedBytes ?? 0);
  const creditsUsed = snap?.data.creditsUsed ?? null;
  const creditPercent = creditsUsed === null || creditsUsed === undefined ? null : (creditsUsed / budget.cloudinaryCredits) * 100;
  const storagePercent = (localStorageBytes / limits.storageBytes) * 100;
  const stale = !snap || ageMin(snap.takenAt) > budget.usageStaleAfterMinutes;
  const level = levelOf(Math.max(creditPercent ?? 0, storagePercent));
  let uploadsBlockedReason: string | null = null;
  if (!env().cloudinaryEnabled) uploadsBlockedReason = "Cloudinary chưa được cấu hình.";
  else if (!killSwitches.uploadsEnabled) uploadsBlockedReason = "Quản trị viên đã tạm dừng upload.";
  else if (stale) uploadsBlockedReason = "Số liệu sử dụng Cloudinary quá cũ hoặc không lấy được — tạm dừng upload (an toàn).";
  else if (level === "stop") uploadsBlockedReason = "Đã chạm 90% ngân sách nội bộ — tạm dừng upload.";
  return {
    snapshot: snap,
    lastAttempt,
    stale,
    creditsUsed,
    creditPercent,
    localStorageBytes,
    storagePercent,
    level,
    uploadsBlockedReason,
    eagerAllowed: killSwitches.eagerTransformationsEnabled && level !== "strict" && level !== "stop",
    budget,
    limits,
    killSwitches,
  };
}
