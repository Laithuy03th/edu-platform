"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { defineAction, zText } from "@/server/action";
import {
  endSession,
  googleSignIn,
  passwordSignIn,
  refreshSessionClaims,
  setLinkIntentCookie,
  currentSessionLoginAt,
} from "@/server/auth";
import { isValidEmail } from "@/server/auth/email";
import { safeCallbackUrl } from "@/server/auth/redirect";
import { sendMail, type Mail } from "@/server/mail";
import * as svc from "./service";

const zEmail = z.string().trim().max(254).refine(isValidEmail, "Email không hợp lệ");
const zPassword = z.string().max(1024, "Mật khẩu quá dài");

/** Gửi email sau khi response đã trả (giảm chênh lệch thời gian, không chặn người dùng). */
const deliverAfter = (m: Mail) => {
  after(async () => {
    try {
      await sendMail(m);
    } catch (err) {
      logger.error("mail.send_failed", { subject: m.subject, err });
    }
  });
};

const register = defineAction(
  {
    auth: "public",
    schema: z
      .object({
        displayName: zText(2, 60, "Tên hiển thị"),
        email: zEmail,
        password: zPassword,
        confirmPassword: zPassword,
      })
      .refine((d) => d.password === d.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] }),
  },
  async (input, { req }) => {
    await svc.registerUser(input, { ip: req.ip }, deliverAfter);
    return { message: "Nếu email hợp lệ, chúng tôi đã gửi liên kết xác minh. Hãy kiểm tra hộp thư rồi đăng nhập." };
  },
);
export async function registerAction(input: unknown) {
  return register(input);
}

const login = defineAction(
  { auth: "public", schema: z.object({ email: z.string().max(300), password: zPassword, callbackUrl: z.string().max(500).optional() }) },
  async (input) => {
    const result = await passwordSignIn(input.email, input.password);
    if (result === "rate_limited") throw new AppError("RATE_LIMITED", "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.", { retryAfterSeconds: 900 });
    if (result === "invalid") throw new AppError("VALIDATION_FAILED", "Email hoặc mật khẩu không đúng.");
    redirect(safeCallbackUrl(input.callbackUrl, env().appOrigin));
  },
);
export async function loginAction(input: unknown) {
  return login(input);
}

const google = defineAction(
  { auth: "public", schema: z.object({ callbackUrl: z.string().max(500).optional() }) },
  async (input) => {
    if (!env().googleEnabled) throw new AppError("NOT_CONFIGURED", "Đăng nhập Google chưa được cấu hình.");
    return googleSignIn(safeCallbackUrl(input.callbackUrl, env().appOrigin));
  },
);
export async function googleLoginAction(input: unknown) {
  return google(input);
}

const logout = defineAction({ auth: "public", schema: z.object({}) }, async () => {
  await endSession();
  redirect("/");
});
export async function logoutAction(input: unknown) {
  return logout(input);
}

const logoutAll = defineAction({ schema: z.object({}) }, async (_i, { viewer }) => {
  await svc.logoutAllDevices(viewer.id);
  await endSession();
  redirect("/login?notice=logged_out_all");
});
export async function logoutAllAction(input: unknown) {
  return logoutAll(input);
}

const resend = defineAction({ schema: z.object({}) }, async (_i, { viewer }) => {
  return svc.resendVerification(viewer.id, deliverAfter);
});
export async function resendVerificationAction(input: unknown) {
  return resend(input);
}

const verify = defineAction(
  { auth: "public", schema: z.object({ token: z.string().min(20).max(100) }), rate: (_i, { req }) => [[{ name: "verify:ip", limit: 20, windowSec: 3600 }, req.ip]] },
  async (input) => {
    await svc.verifyEmail(input.token);
    return { verified: true };
  },
);
export async function verifyEmailAction(input: unknown) {
  return verify(input);
}

const forgot = defineAction({ auth: "public", schema: z.object({ email: zEmail }) }, async (input, { req }) => {
  await svc.requestPasswordReset(input.email, { ip: req.ip }, deliverAfter);
  return { message: "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu." };
});
export async function forgotPasswordAction(input: unknown) {
  return forgot(input);
}

const reset = defineAction(
  {
    auth: "public",
    schema: z
      .object({ token: z.string().min(20).max(100), password: zPassword, confirmPassword: zPassword })
      .refine((d) => d.password === d.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] }),
    rate: (_i, { req }) => [[{ name: "reset:ip", limit: 10, windowSec: 3600 }, req.ip]],
  },
  async (input) => {
    await svc.resetPasswordWithToken(input.token, input.password);
    // Phiên hiện tại (nếu có) đã bị thu hồi bởi authVersion; xóa cookie cho sạch.
    await endSession().catch(() => {});
    return { done: true };
  },
);
export async function resetPasswordAction(input: unknown) {
  return reset(input);
}

const change = defineAction(
  {
    schema: z
      .object({ currentPassword: zPassword, newPassword: zPassword, confirmPassword: zPassword })
      .refine((d) => d.newPassword === d.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] }),
  },
  async (input, { viewer }) => {
    await svc.changePassword(viewer.id, input.currentPassword, input.newPassword);
    await refreshSessionClaims(); // thiết bị hiện tại giữ đăng nhập với authVersion mới
    return { message: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." };
  },
);
export async function changePasswordAction(input: unknown) {
  return change(input);
}

const requestSetPw = defineAction({ schema: z.object({}) }, async (_i, { viewer }) => {
  await svc.requestSetPassword(viewer.id, deliverAfter);
  return { message: "Đã gửi liên kết đặt mật khẩu tới email của bạn." };
});
export async function requestSetPasswordAction(input: unknown) {
  return requestSetPw(input);
}

const startLink = defineAction(
  { schema: z.object({ currentPassword: zPassword.optional() }) },
  async (input, { viewer }) => {
    const token = await svc.startGoogleLink(viewer.id, input.currentPassword ?? null, await currentSessionLoginAt());
    await setLinkIntentCookie(token);
    return googleSignIn("/settings/security?linked=1");
  },
);
export async function startGoogleLinkAction(input: unknown) {
  return startLink(input);
}

const unlink = defineAction({ schema: z.object({}) }, async (_i, { viewer }) => {
  await svc.unlinkGoogle(viewer.id);
  return { message: "Đã hủy liên kết Google." };
});
export async function unlinkGoogleAction(input: unknown) {
  return unlink(input);
}
