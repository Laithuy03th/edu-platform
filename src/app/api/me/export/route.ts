import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getViewer } from "@/server/auth";
import { toActionError } from "@/server/action";
import { requestCtx } from "@/server/request";
import { exportMyData } from "@/modules/users/privacy";

/**
 * Tải toàn bộ dữ liệu của CHÍNH người dùng (JSON). GET không đổi trạng thái; chỉ dữ liệu của viewer;
 * không ghi nội dung ra log; không cache (private, no-store).
 */
export async function GET() {
  const ctx = await requestCtx();
  try {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
    const data = await exportMyData(viewer);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="tuhoc-du-lieu-cua-toi-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ error: toActionError(err, ctx.requestId) }, { status });
  }
}
