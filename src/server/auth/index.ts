import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Role } from "@/server/db/models";
import { LINK_INTENT_COOKIE, auth, signIn, signOut, unstable_update } from "./nextauth";
import { resolveViewer, type Viewer } from "./viewer-core";

export type { Viewer } from "./viewer-core";
export { handlers } from "./nextauth";

/**
 * Data Access Layer: viewer hiện tại (memo trong phạm vi một request bằng React cache).
 * Trả null nếu chưa đăng nhập, phiên hết hạn tuyệt đối, user bị khóa hoặc authVersion lệch.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  let session;
  try {
    session = await auth();
  } catch (err) {
    logger.warn("auth.session_read_failed", { err });
    return null;
  }
  if (!session) return null;
  try {
    return await resolveViewer({ sub: session.user?.id, av: session.av, lat: session.lat });
  } catch (err) {
    // Fail-closed: DB lỗi/chưa cấu hình → coi như chưa đăng nhập (không cấp quyền).
    logger.error("auth.resolve_viewer_failed", { err });
    return null;
  }
});

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  return v;
}

export async function requireVerifiedViewer(): Promise<Viewer> {
  const v = await requireViewer();
  if (!v.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi thực hiện thao tác này.");
  return v;
}

export async function requireRole(role: Role): Promise<Viewer> {
  const v = await requireViewer();
  if (!v.roles.includes(role)) throw new AppError("FORBIDDEN", "Bạn không có quyền truy cập.");
  return v;
}

/** Dùng trong page/layout: chuyển hướng thay vì ném lỗi. */
export async function viewerOrRedirect(callbackPath?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(callbackPath ? `/login?callbackUrl=${encodeURIComponent(callbackPath)}` : "/login");
  return v;
}

/** Thời điểm đăng nhập (epoch giây) của phiên hiện tại — dùng cho "xác thực gần đây". */
export async function currentSessionLoginAt(): Promise<number> {
  const session = await auth();
  return typeof session?.lat === "number" ? session.lat : 0;
}

/** Đăng nhập email/mật khẩu qua Auth.js. Trả mã lỗi nghiệp vụ thay vì ném. */
export async function passwordSignIn(email: string, password: string): Promise<"ok" | "invalid" | "rate_limited"> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return "ok";
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      return code === "rate_limited" ? "rate_limited" : "invalid";
    }
    throw err;
  }
}

/** Bắt đầu OAuth Google (ném NEXT_REDIRECT). */
export async function googleSignIn(redirectTo: string): Promise<never> {
  await signIn("google", { redirectTo });
  throw new Error("unreachable");
}

export async function endSession(): Promise<void> {
  await signOut({ redirect: false });
}

/** Phát lại cookie phiên với authVersion hiện hành (sau khi đổi mật khẩu trên thiết bị này). */
export async function refreshSessionClaims(): Promise<void> {
  await unstable_update({});
}

export async function setLinkIntentCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(LINK_INTENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
}
