import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export type RequestCtx = { ip: string; requestId: string; origin: string | null; host: string | null };

/** IP client: chỉ tin header proxy khi TRUST_PROXY=true (ADR-012). */
export function clientIpFrom(h: Headers): string {
  if (!env().TRUST_PROXY) return "local";
  const vercel = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  const xff = h.get("x-forwarded-for");
  const raw = (vercel ?? xff?.split(",")[0] ?? "").trim();
  return raw && raw.length <= 64 ? raw : "unknown";
}

export async function requestCtx(): Promise<RequestCtx> {
  const h = await headers();
  return {
    ip: clientIpFrom(h),
    requestId: h.get("x-request-id") ?? crypto.randomUUID(),
    origin: h.get("origin"),
    host: (env().TRUST_PROXY ? h.get("x-forwarded-host") : null) ?? h.get("host"),
  };
}

/**
 * Kiểm tra Origin cho mutation dùng cookie (ARCHITECTURE §6): bắt buộc có Origin và trùng app.
 * Next.js bỏ qua kiểm tra khi request không có Origin, nên ta tự chặn.
 */
export function assertSameOrigin(ctx: Pick<RequestCtx, "origin" | "host">): void {
  const { origin, host } = ctx;
  if (!origin) throw new AppError("FORBIDDEN_ORIGIN", "Yêu cầu không hợp lệ.");
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    throw new AppError("FORBIDDEN_ORIGIN", "Yêu cầu không hợp lệ.");
  }
  const e = env();
  if (o.origin === e.appOrigin) return;
  // Dev: cho phép truy cập qua host khác (vd 127.0.0.1) miễn Origin khớp Host của chính request.
  if (!e.isProduction && host && o.host === host) return;
  throw new AppError("FORBIDDEN_ORIGIN", "Yêu cầu không hợp lệ.");
}
