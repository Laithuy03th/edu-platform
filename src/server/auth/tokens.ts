import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ObjectId } from "mongodb";
import { cols, type AuthTokenType } from "@/server/db/models";

export const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  email_verify: 24 * 3600_000,
  password_reset: 30 * 60_000,
  set_password: 30 * 60_000,
  link_intent: 10 * 60_000,
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Tạo token mới (32 byte), vô hiệu token cùng loại chưa dùng của user. DB chỉ lưu hash. */
export async function issueToken(
  userId: ObjectId,
  type: AuthTokenType,
  meta: { emailNormalized?: string } = {},
  now = new Date(),
): Promise<string> {
  const c = await cols();
  const token = randomBytes(32).toString("base64url");
  await c.authTokens.updateMany({ userId, type, usedAt: null }, { $set: { usedAt: now } });
  await c.authTokens.insertOne({
    type,
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[type]),
    usedAt: null,
    createdAt: now,
    meta,
  });
  return token;
}

/** Consume nguyên tử: chỉ một request thắng; kiểm tra hạn trong truy vấn (không dựa vào TTL). */
export async function consumeToken(token: string, type: AuthTokenType, now = new Date()) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const c = await cols();
  return c.authTokens.findOneAndUpdate(
    { tokenHash: hashToken(token), type, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { returnDocument: "after" },
  );
}

export async function latestTokenCreatedAt(userId: ObjectId, type: AuthTokenType): Promise<Date | null> {
  const c = await cols();
  const doc = await c.authTokens.find({ userId, type }).sort({ createdAt: -1 }).limit(1).next();
  return doc?.createdAt ?? null;
}
