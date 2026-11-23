import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { getViewer } from "@/server/auth";
import { toActionError } from "@/server/action";
import { RULES, consumeRate } from "@/server/rate-limit";
import { assertSameOrigin, requestCtx } from "@/server/request";
import { saveProgress } from "@/modules/learning/progress";

const schema = z.object({ lessonId: z.string(), positionSeconds: z.number().finite().min(0), clientAt: z.number().int().positive() });

/**
 * Nhận navigator.sendBeacon khi tab ẩn/thoát — BEST EFFORT (§9.2): có thể không tới server.
 * Cùng quy tắc với saveProgressAction (bỏ event cũ, furthest chỉ tăng). Kiểm tra Origin vì dùng cookie.
 */
export async function POST(req: Request) {
  const ctx = await requestCtx();
  try {
    assertSameOrigin(ctx);
    const raw = await req.text();
    if (raw.length > 1024) throw new AppError("VALIDATION_FAILED", "Body quá lớn.");
    const parsed = schema.safeParse(JSON.parse(raw));
    const lessonId = parsed.success ? parseId(parsed.data.lessonId) : null;
    if (!parsed.success || !lessonId) throw new AppError("VALIDATION_FAILED", "Dữ liệu không hợp lệ.");
    const viewer = await getViewer();
    if (!viewer) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
    await consumeRate(RULES.progressUser, viewer.idStr);
    await saveProgress(viewer, lessonId, parsed.data.positionSeconds, parsed.data.clientAt);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const e = err instanceof SyntaxError ? new AppError("VALIDATION_FAILED", "JSON không hợp lệ.") : err;
    const body = toActionError(e, ctx.requestId);
    const status = e instanceof AppError ? e.status : 500;
    return NextResponse.json({ error: body }, { status, headers: e instanceof AppError && e.retryAfterSeconds ? { "Retry-After": String(e.retryAfterSeconds) } : undefined });
  }
}
