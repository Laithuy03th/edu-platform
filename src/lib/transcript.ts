/**
 * M04: mốc thời gian video.
 * - parseChapters: transcript có dòng bắt đầu bằng "[m:ss]" (hoặc "[h:mm:ss]") → danh sách chương bấm để tua.
 * - validateVtt: phụ đề WebVTT do giảng viên cung cấp — kiểm tra tối thiểu (header, mốc thời gian hợp lệ, tăng dần).
 */
export type Chapter = { start: number; title: string };

const STAMP = /^\[(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)\]\s*(.*)$/;

export function parseChapters(transcript: string | null | undefined, durationSeconds = Infinity): Chapter[] {
  if (!transcript) return [];
  const out: Chapter[] = [];
  for (const raw of transcript.split(/\r?\n/)) {
    const m = raw.trim().match(STAMP);
    if (!m) continue;
    const start = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    const title = m[4]!.trim().replace(/[:：]\s*$/, "").slice(0, 120);
    if (!title || start > durationSeconds) continue;
    if (out.length && start <= out[out.length - 1]!.start) continue; // chỉ nhận mốc tăng dần
    out.push({ start, title });
  }
  return out.length >= 2 ? out.slice(0, 60) : []; // 1 mốc thì không gọi là "mục lục"
}

export function fmtClock(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

const VTT_TIME = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;
const toSec = (t: string) => {
  const m = t.match(VTT_TIME);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
};

/** Trả null nếu hợp lệ, ngược lại là thông báo lỗi (tiếng Việt, có số dòng). */
export function validateVtt(vtt: string): string | null {
  const text = vtt.replace(/^﻿/, "");
  if (!/^WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(text)) return "Phụ đề phải bắt đầu bằng dòng WEBVTT.";
  const lines = text.split(/\r?\n/);
  let cues = 0;
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes("-->")) continue;
    const [a, rest] = line.split("-->");
    const b = rest?.trim().split(/\s+/)[0] ?? "";
    const s = toSec(a!.trim());
    const e = toSec(b);
    if (s === null || e === null) return `Dòng ${i + 1}: mốc thời gian không đúng dạng 00:01.000 --> 00:04.000.`;
    if (e <= s) return `Dòng ${i + 1}: thời điểm kết thúc phải sau thời điểm bắt đầu.`;
    if (s < last) return `Dòng ${i + 1}: các đoạn phụ đề phải theo thứ tự thời gian.`;
    if (!(lines[i + 1] ?? "").trim()) return `Dòng ${i + 1}: đoạn phụ đề không có nội dung.`;
    last = s;
    cues++;
  }
  if (cues === 0) return "Không tìm thấy đoạn phụ đề nào (dạng 00:01.000 --> 00:04.000).";
  if (/<script|javascript:/i.test(text)) return "Phụ đề chứa nội dung không được phép.";
  return null;
}
