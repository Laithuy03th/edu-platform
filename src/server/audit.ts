import "server-only";
import type { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { cols } from "@/server/db/models";

/** Ghi audit log (không chứa token/password/nội dung ghi chú). Lỗi ghi audit không làm hỏng nghiệp vụ. */
export async function audit(entry: {
  actorId: ObjectId | null;
  action: string;
  targetType: string;
  targetId?: string | ObjectId | null;
  outcome?: "success" | "denied" | "error";
  requestId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const c = await cols();
    const meta = entry.meta ?? {};
    const json = JSON.stringify(meta);
    await c.auditLogs.insertOne({
      at: new Date(),
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ? String(entry.targetId) : null,
      outcome: entry.outcome ?? "success",
      requestId: entry.requestId ?? null,
      meta: json.length > 2048 ? { truncated: true } : meta,
    });
  } catch (err) {
    logger.error("audit.write_failed", { action: entry.action, err });
  }
}
