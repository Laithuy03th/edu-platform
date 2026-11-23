import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ConfigError } from "@/lib/env";
import { AppError, type ActionResult, type FieldErrors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Role } from "@/server/db/models";
import { getViewer, type Viewer } from "@/server/auth";
import { consumeRate, type RateRule } from "@/server/rate-limit";
import { assertSameOrigin, requestCtx, type RequestCtx } from "@/server/request";

type AuthMode = "public" | "user" | "verified" | Role;

type Ctx<A extends AuthMode> = {
  viewer: A extends "public" ? Viewer | null : Viewer;
  req: RequestCtx;
};

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Định nghĩa Server Action (API_CONTRACTS §1): Origin → Zod → auth → rate limit → handler.
 * Mỗi action tự kiểm tra quyền; không dựa vào page/layout đã kiểm tra.
 */
export function defineAction<S extends z.ZodType, R, A extends AuthMode = "user">(
  opts: {
    schema: S;
    auth?: A;
    rate?: (input: z.infer<S>, ctx: Ctx<A>) => [RateRule, string][];
  },
  handler: (input: z.infer<S>, ctx: Ctx<A>) => Promise<R>,
): (raw: unknown) => Promise<ActionResult<R>> {
  return async (raw: unknown) => {
    let req: RequestCtx | null = null;
    try {
      req = await requestCtx();
      assertSameOrigin(req);
      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) {
        throw new AppError("VALIDATION_FAILED", "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.", {
          fieldErrors: zodFieldErrors(parsed.error),
        });
      }
      const mode = (opts.auth ?? "user") as AuthMode;
      const viewer = await getViewer();
      if (mode !== "public") {
        if (!viewer) throw new AppError("UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        if (mode === "verified" && !viewer.emailVerified)
          throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi thực hiện thao tác này.");
        if ((mode === "student" || mode === "instructor" || mode === "admin") && !viewer.roles.includes(mode))
          throw new AppError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
      }
      const ctx = { viewer, req } as Ctx<A>;
      if (opts.rate) {
        for (const [rule, subject] of opts.rate(parsed.data, ctx)) await consumeRate(rule, subject);
      }
      const data = await handler(parsed.data, ctx);
      return { ok: true, data };
    } catch (err) {
      unstable_rethrow(err); // redirect()/notFound() của Next.js
      return { ok: false, error: toActionError(err, req?.requestId) };
    }
  };
}

export function toActionError(err: unknown, requestId?: string) {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.warn("action.app_error", { code: err.code, message: err.message, requestId });
    return {
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors,
      retryAfterSeconds: err.retryAfterSeconds,
      details: err.details,
      requestId,
    };
  }
  if (err instanceof ConfigError) {
    logger.error("action.config_error", { message: err.message, requestId });
    return { code: "NOT_CONFIGURED" as const, message: "Hệ thống chưa được cấu hình đầy đủ cho chức năng này.", requestId };
  }
  logger.error("action.unhandled", { err, requestId });
  return { code: "INTERNAL_ERROR" as const, message: "Đã có lỗi xảy ra. Vui lòng thử lại.", requestId };
}

/** Schema dùng chung. */
export const zId = z.string().regex(/^[a-f0-9]{24}$/i, "ID không hợp lệ");
export const zText = (min: number, max: number, label = "Nội dung") =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} không được để trống` : `${label} cần ít nhất ${min} ký tự`)
    .max(max, `${label} tối đa ${max} ký tự`);
export const zHttpUrl = z
  .string()
  .trim()
  .max(500, "URL tối đa 500 ký tự")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Chỉ chấp nhận URL http:// hoặc https://");
