import "server-only";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { audit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/email";
import { hashPassword, passwordProblems, verifyPassword } from "@/server/auth/password";
import { consumeToken, issueToken, latestTokenCreatedAt } from "@/server/auth/tokens";
import { RULES, consumeRate } from "@/server/rate-limit";
import { sendMail, type Mail } from "@/server/mail";
import { existingAccountMail, resetPasswordMail, setPasswordMail, verifyEmailMail } from "@/server/mail/templates";

export type Deliver = (mail: Mail) => void | Promise<void>;
const defaultDeliver: Deliver = (m) => sendMail(m);

export const RESEND_COOLDOWN_SECONDS = 60;

function assertPassword(pw: string, field = "password") {
  const problems = passwordProblems(pw);
  if (problems.length) throw new AppError("VALIDATION_FAILED", problems[0]!, { fieldErrors: { [field]: problems } });
}

/** Đăng ký (AUTH_SECURITY §5.1). Email trùng → kết quả trung tính, không lộ tài khoản tồn tại. */
export async function registerUser(
  input: { displayName: string; email: string; password: string },
  ctx: { ip: string },
  deliver: Deliver = defaultDeliver,
): Promise<{ userId: ObjectId | null }> {
  const emailNormalized = normalizeEmail(input.email);
  await consumeRate(RULES.registerIp, ctx.ip);
  await consumeRate(RULES.registerEmail, emailNormalized);
  assertPassword(input.password);
  const now = new Date();
  const passwordHash = await hashPassword(input.password);
  const c = await cols();
  try {
    const res = await c.users.insertOne({
      email: input.email.trim(),
      emailNormalized,
      emailVerifiedAt: null,
      passwordHash,
      passwordUpdatedAt: now,
      displayName: input.displayName.trim(),
      bio: "",
      timezone: env().DEFAULT_TIMEZONE,
      learningGoal: "",
      avatar: { kind: "initials" },
      roles: ["student"],
      status: "active",
      blockedReason: null,
      authVersion: 1,
      dataSaver: false,
      publicProfile: { enabled: false, handle: null },
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    const token = await issueToken(res.insertedId, "email_verify", { emailNormalized }, now);
    await deliver(verifyEmailMail(input.email.trim(), input.displayName.trim(), `${env().appUrl}/verify-email?token=${token}`));
    return { userId: res.insertedId };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    await deliver(existingAccountMail(input.email.trim(), `${env().appUrl}/login`));
    return { userId: null };
  }
}

export async function verifyEmail(token: string): Promise<{ userId: ObjectId }> {
  const t = await consumeToken(token, "email_verify");
  if (!t) throw new AppError("INVALID_TOKEN", "Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
  const c = await cols();
  const user = await c.users.findOne({ _id: t.userId });
  // Token gắn với email lúc phát; nếu email đã đổi thì không xác minh.
  if (!user || (t.meta.emailNormalized && t.meta.emailNormalized !== user.emailNormalized)) {
    throw new AppError("INVALID_TOKEN", "Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
  }
  if (!user.emailVerifiedAt) {
    await c.users.updateOne({ _id: user._id, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date(), updatedAt: new Date() } });
    await audit({ actorId: user._id, action: "auth.email_verified", targetType: "user", targetId: user._id });
  }
  return { userId: user._id };
}

export async function resendVerification(userId: ObjectId, deliver: Deliver = defaultDeliver): Promise<{ cooldownSeconds: number }> {
  const c = await cols();
  const user = await c.users.findOne({ _id: userId });
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (user.emailVerifiedAt) throw new AppError("INVALID_STATE", "Email đã được xác minh.");
  const last = await latestTokenCreatedAt(userId, "email_verify");
  if (last && Date.now() - last.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    const retryAfterSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - last.getTime()) / 1000);
    throw new AppError("RATE_LIMITED", `Vui lòng đợi ${retryAfterSeconds} giây trước khi gửi lại.`, { retryAfterSeconds });
  }
  await consumeRate(RULES.resendVerify, userId.toHexString());
  const token = await issueToken(userId, "email_verify", { emailNormalized: user.emailNormalized });
  await deliver(verifyEmailMail(user.email, user.displayName, `${env().appUrl}/verify-email?token=${token}`));
  return { cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

/** Quên mật khẩu: luôn trả cùng kết quả (không lộ email tồn tại). */
export async function requestPasswordReset(email: string, ctx: { ip: string }, deliver: Deliver = defaultDeliver): Promise<void> {
  const emailNormalized = normalizeEmail(email);
  await consumeRate(RULES.forgotIp, ctx.ip);
  await consumeRate(RULES.forgotEmail, emailNormalized);
  const c = await cols();
  const user = await c.users.findOne({ emailNormalized });
  if (!user || user.status !== "active") return;
  const type = user.passwordHash ? "password_reset" : "set_password";
  const token = await issueToken(user._id, type, { emailNormalized });
  const url = `${env().appUrl}/reset-password?token=${token}${type === "set_password" ? "&mode=set" : ""}`;
  await deliver(type === "password_reset" ? resetPasswordMail(user.email, url) : setPasswordMail(user.email, url));
}

/** Đặt lại/đặt mới mật khẩu bằng token: consume nguyên tử, tăng authVersion (thu hồi mọi phiên). */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  assertPassword(newPassword);
  const passwordHash = await hashPassword(newPassword);
  let t = await consumeToken(token, "password_reset");
  t ??= await consumeToken(token, "set_password");
  if (!t) throw new AppError("INVALID_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
  const c = await cols();
  const now = new Date();
  const res = await c.users.updateOne(
    { _id: t.userId, status: "active" },
    {
      $set: {
        passwordHash,
        passwordUpdatedAt: now,
        updatedAt: now,
        // Token gửi tới hộp thư đã chứng minh quyền sở hữu email.
        ...(t.meta.emailNormalized ? { emailVerifiedAt: now } : {}),
      },
      $inc: { authVersion: 1 },
    },
  );
  if (res.matchedCount === 0) throw new AppError("INVALID_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
  await audit({ actorId: t.userId, action: `auth.${t.type}`, targetType: "user", targetId: t.userId });
}

/** Đổi mật khẩu khi đang đăng nhập: cần mật khẩu hiện tại; tăng authVersion (thiết bị khác bị đăng xuất). */
export async function changePassword(userId: ObjectId, currentPassword: string, newPassword: string): Promise<void> {
  await consumeRate(RULES.passwordUser, userId.toHexString());
  const c = await cols();
  const user = await c.users.findOne({ _id: userId });
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (!user.passwordHash) throw new AppError("INVALID_STATE", "Tài khoản chưa có mật khẩu. Hãy dùng chức năng Đặt mật khẩu.");
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("VALIDATION_FAILED", "Mật khẩu hiện tại không đúng.", { fieldErrors: { currentPassword: ["Mật khẩu hiện tại không đúng."] } });
  }
  assertPassword(newPassword, "newPassword");
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  await c.users.updateOne({ _id: userId }, { $set: { passwordHash, passwordUpdatedAt: now, updatedAt: now }, $inc: { authVersion: 1 } });
  await audit({ actorId: userId, action: "auth.change_password", targetType: "user", targetId: userId });
}

export async function logoutAllDevices(userId: ObjectId): Promise<void> {
  const c = await cols();
  await c.users.updateOne({ _id: userId }, { $inc: { authVersion: 1 }, $set: { updatedAt: new Date() } });
  await audit({ actorId: userId, action: "auth.logout_all", targetType: "user", targetId: userId });
}

/** Bước đầu liên kết Google: xác thực gần đây bằng mật khẩu (nếu có), phát link_intent 10 phút. */
export async function startGoogleLink(userId: ObjectId, currentPassword: string | null, sessionLoginAt: number): Promise<string> {
  if (!env().googleEnabled) throw new AppError("NOT_CONFIGURED", "Đăng nhập Google chưa được cấu hình.");
  await consumeRate(RULES.passwordUser, userId.toHexString());
  const c = await cols();
  const user = await c.users.findOne({ _id: userId });
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const linked = await c.authAccounts.findOne({ userId, provider: "google" });
  if (linked) throw new AppError("ALREADY_EXISTS", "Tài khoản đã liên kết Google.");
  if (user.passwordHash) {
    if (!currentPassword || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError("VALIDATION_FAILED", "Mật khẩu không đúng.", { fieldErrors: { currentPassword: ["Mật khẩu không đúng."] } });
    }
  } else if (Date.now() / 1000 - sessionLoginAt > 600) {
    throw new AppError("FORBIDDEN", "Vui lòng đăng nhập lại trước khi liên kết tài khoản.");
  }
  return issueToken(userId, "link_intent");
}

/** Hủy liên kết Google: chỉ khi còn phương thức đăng nhập đã xác minh khác. */
export async function unlinkGoogle(userId: ObjectId): Promise<void> {
  const c = await cols();
  const user = await c.users.findOne({ _id: userId });
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const linked = await c.authAccounts.findOne({ userId, provider: "google" });
  if (!linked) throw new AppError("INVALID_STATE", "Tài khoản chưa liên kết Google.");
  if (!user.passwordHash || !user.emailVerifiedAt) {
    throw new AppError("INVALID_STATE", "Không thể hủy liên kết: đây là phương thức đăng nhập duy nhất. Hãy đặt mật khẩu trước.");
  }
  await c.authAccounts.deleteOne({ _id: linked._id });
  await audit({ actorId: userId, action: "auth.unlink_google", targetType: "user", targetId: userId });
}

export async function requestSetPassword(userId: ObjectId, deliver: Deliver = defaultDeliver): Promise<void> {
  await consumeRate(RULES.setPasswordUser, userId.toHexString());
  const c = await cols();
  const user = await c.users.findOne({ _id: userId });
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (user.passwordHash) throw new AppError("INVALID_STATE", "Tài khoản đã có mật khẩu.");
  if (!user.emailVerifiedAt) throw new AppError("EMAIL_NOT_VERIFIED", "Email chưa được xác minh.");
  const token = await issueToken(userId, "set_password", { emailNormalized: user.emailNormalized });
  await deliver(setPasswordMail(user.email, `${env().appUrl}/reset-password?token=${token}&mode=set`));
}

export async function linkedProviders(userId: ObjectId) {
  const c = await cols();
  const accounts = await c.authAccounts.find({ userId }).project<{ provider: string; emailAtLink: string; linkedAt: Date }>({ provider: 1, emailAtLink: 1, linkedAt: 1, _id: 0 }).toArray();
  return accounts;
}
