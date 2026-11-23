import { NextResponse } from "next/server";

/** Health tối thiểu: không truy vấn DB (tránh tốn ops của Atlas Free), không lộ cấu hình. */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
