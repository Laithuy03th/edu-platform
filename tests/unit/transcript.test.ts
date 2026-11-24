import { describe, expect, it } from "vitest";
import { fmtClock, parseChapters, validateVtt } from "@/lib/transcript";

describe("parseChapters (M04)", () => {
  it("lấy mốc [m:ss] tăng dần, bỏ dòng không có mốc, cần ≥ 2 mốc", () => {
    const t = "Video minh họa.\n\n[0:00] Next.js cơ bản — Bài 1\n[0:05] Mục tiêu bài học:\n• a\n\n[1:02] Render ở đâu?\n[0:30] lùi lại (bỏ)\n[1:10:05] quá dài";
    expect(parseChapters(t, 120)).toEqual([
      { start: 0, title: "Next.js cơ bản — Bài 1" },
      { start: 5, title: "Mục tiêu bài học" },
      { start: 62, title: "Render ở đâu?" },
    ]);
    expect(parseChapters("[0:10] chỉ một mốc")).toEqual([]);
    expect(parseChapters(null)).toEqual([]);
    expect(fmtClock(3725)).toBe("1:02:05");
    expect(fmtClock(65)).toBe("1:05");
  });
});

describe("validateVtt (M04)", () => {
  it("chấp nhận WebVTT hợp lệ; báo lỗi rõ ràng", () => {
    expect(validateVtt("WEBVTT\n\n00:00.000 --> 00:02.500\nXin chào\n\n00:03.000 --> 00:05.000 align:start\nBài 1")).toBeNull();
    expect(validateVtt("1\n00:00:01,000 --> 00:00:02,000\nSRT")).toMatch(/WEBVTT/);
    expect(validateVtt("WEBVTT\n\n00:05.000 --> 00:02.000\nx")).toMatch(/kết thúc/);
    expect(validateVtt("WEBVTT\n\n00:05.000 --> 00:06.000\na\n\n00:01.000 --> 00:02.000\nb")).toMatch(/thứ tự/);
    expect(validateVtt("WEBVTT\n\n")).toMatch(/Không tìm thấy/);
    expect(validateVtt("WEBVTT\n\n00:01.000 --> 00:02.000\n<script>x</script>")).toMatch(/không được phép/);
  });
});
