import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { getViewer } from "@/server/auth";
import { toActionError } from "@/server/action";
import { RULES, consumeRate } from "@/server/rate-limit";
import { requestCtx } from "@/server/request";
import { exportNotesMarkdown } from "@/modules/notes/service";

/** Xuất ghi chú của CHÍNH người dùng ra Markdown. GET không đổi trạng thái; dữ liệu chỉ của viewer. */
export async function GET(req: Request) {
  const ctx = await requestCtx();
  try {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
    await consumeRate(RULES.exportNotes, viewer.idStr);
    const courseId = parseId(new URL(req.url).searchParams.get("courseId"));
    const md = await exportNotesMarkdown(viewer, courseId);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="ghi-chu-${new Date().toISOString().slice(0, 10)}.md"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ error: toActionError(err, ctx.requestId) }, { status });
  }
}
