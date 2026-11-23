export const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Ngày lịch (YYYY-MM-DD) của một thời điểm theo timezone. */
export function localDateParts(at: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

/** Độ lệch (ms) của timezone so với UTC tại thời điểm `at`. */
function tzOffsetMs(at: Date, tz: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, x) => ((acc[x.type] = x.value), acc), {});
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** 00:00 (giờ địa phương theo tz) của ngày (ngày-lịch-của-`from` + days), trả về instant UTC. */
export function startOfLocalDayPlus(from: Date, days: number, tz: string): Date {
  const { y, m, d } = localDateParts(from, tz);
  const guessUtc = Date.UTC(y, m - 1, d + days, 0, 0, 0);
  const offset = tzOffsetMs(new Date(guessUtc), tz);
  let result = guessUtc - offset;
  // Hiệu chỉnh nếu DST làm lệch (Asia/Ho_Chi_Minh không có DST, nhưng hỗ trợ timezone khác).
  const offset2 = tzOffsetMs(new Date(result), tz);
  if (offset2 !== offset) result = guessUtc - offset2;
  return new Date(result);
}

export function formatDateTime(at: Date | string, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(at));
}

export function formatDate(at: Date | string, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: tz, dateStyle: "medium" }).format(new Date(at));
}
