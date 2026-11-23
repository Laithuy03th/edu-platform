import "server-only";
import { isDuplicateKeyError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { audit } from "@/server/audit";
import { normalizeEmail } from "./email";
import { consumeToken } from "./tokens";

export type GoogleSignInInput = {
  providerAccountId: string;
  email: string | null | undefined;
  emailVerified: boolean | null | undefined;
  name: string | null | undefined;
  picture: string | null | undefined;
  linkIntentToken: string | null;
};

export type GoogleSignInResult =
  | { ok: true; userId: string; mode: "existing" | "linked" | "created" }
  | { ok: false; error: "email_unverified" | "account_exists" | "linked_elsewhere" | "blocked" | "link_expired" };

const safePicture = (p: string | null | undefined) =>
  p && /^https:\/\/lh3\.googleusercontent\.com\//.test(p) && p.length < 500 ? p : null;

/**
 * Bảng quyết định đăng nhập Google (AUTH_SECURITY §5.3–5.4):
 * A. Đã liên kết → đăng nhập user đó.
 * B. Có link_intent hợp lệ → liên kết vào user đang đăng nhập.
 * C. Chưa liên kết: email chưa xác minh → từ chối; email trùng tài khoản khác → từ chối (KHÔNG tự gộp);
 *    còn lại → tạo user mới.
 */
export async function resolveGoogleSignIn(input: GoogleSignInInput, now = new Date()): Promise<GoogleSignInResult> {
  const c = await cols();
  const linked = await c.authAccounts.findOne({ provider: "google", providerAccountId: input.providerAccountId });

  if (input.linkIntentToken) {
    const intent = await consumeToken(input.linkIntentToken, "link_intent", now);
    if (!intent) return { ok: false, error: "link_expired" };
    if (linked && !linked.userId.equals(intent.userId)) return { ok: false, error: "linked_elsewhere" };
    const user = await c.users.findOne({ _id: intent.userId });
    if (!user || user.status !== "active") return { ok: false, error: "blocked" };
    if (!linked) {
      try {
        await c.authAccounts.insertOne({
          userId: intent.userId,
          provider: "google",
          providerAccountId: input.providerAccountId,
          emailAtLink: input.email ?? "",
          linkedAt: now,
        });
      } catch (err) {
        if (isDuplicateKeyError(err)) return { ok: false, error: "linked_elsewhere" };
        throw err;
      }
      await audit({ actorId: intent.userId, action: "auth.link_google", targetType: "user", targetId: intent.userId });
    }
    return { ok: true, userId: intent.userId.toHexString(), mode: "linked" };
  }

  if (linked) {
    const user = await c.users.findOne({ _id: linked.userId }, { projection: { status: 1 } });
    if (!user || user.status !== "active") return { ok: false, error: "blocked" };
    await c.users.updateOne({ _id: linked.userId }, { $set: { lastLoginAt: now } });
    return { ok: true, userId: linked.userId.toHexString(), mode: "existing" };
  }

  if (input.emailVerified !== true || !input.email) return { ok: false, error: "email_unverified" };
  const emailNormalized = normalizeEmail(input.email);
  const existing = await c.users.findOne({ emailNormalized }, { projection: { _id: 1 } });
  if (existing) return { ok: false, error: "account_exists" };

  const picture = safePicture(input.picture);
  let insertedId;
  try {
    const res = await c.users.insertOne({
      email: input.email.trim(),
      emailNormalized,
      emailVerifiedAt: now,
      passwordHash: null,
      passwordUpdatedAt: null,
      displayName: (input.name ?? "").trim().slice(0, 60) || emailNormalized.split("@")[0]!.slice(0, 60),
      bio: "",
      timezone: "Asia/Ho_Chi_Minh",
      learningGoal: "",
      avatar: picture ? { kind: "google", url: picture } : { kind: "initials" },
      roles: ["student"],
      status: "active",
      blockedReason: null,
      authVersion: 1,
      dataSaver: false,
      publicProfile: { enabled: false, handle: null },
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    insertedId = res.insertedId;
  } catch (err) {
    // Race: request khác vừa tạo user cùng email → coi như email đã tồn tại.
    if (isDuplicateKeyError(err)) return { ok: false, error: "account_exists" };
    throw err;
  }
  try {
    await c.authAccounts.insertOne({
      userId: insertedId,
      provider: "google",
      providerAccountId: input.providerAccountId,
      emailAtLink: input.email,
      linkedAt: now,
    });
  } catch (err) {
    // Race hai lần đăng nhập Google đồng thời: dọn user vừa tạo, dùng liên kết đã thắng.
    await c.users.deleteOne({ _id: insertedId });
    if (!isDuplicateKeyError(err)) throw err;
    const winner = await c.authAccounts.findOne({ provider: "google", providerAccountId: input.providerAccountId });
    return winner ? { ok: true, userId: winner.userId.toHexString(), mode: "existing" } : { ok: false, error: "account_exists" };
  }
  return { ok: true, userId: insertedId.toHexString(), mode: "created" };
}
