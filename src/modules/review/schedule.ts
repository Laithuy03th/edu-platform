import { startOfLocalDayPlus } from "@/lib/time";

/**
 * Lịch ôn tập theo QUY TẮC cố định (không phải thuật toán AI cá nhân hóa — §12.1):
 * mốc 1 → 3 → 7 → 14 ngày khi trả lời đúng liên tiếp; sai thì quay về mốc 1 ngày.
 * Hoàn thành mốc 14 ngày → "mastered" (thôi nhắc).
 */
export const INTERVAL_DAYS = [1, 3, 7, 14] as const;

export type ScheduleState = { intervalStep: number; correctStreak: number };

export function nextSchedule(state: ScheduleState, correct: boolean, now: Date, tz: string) {
  if (!correct) {
    return { intervalStep: 0, correctStreak: 0, status: "active" as const, nextReviewAt: startOfLocalDayPlus(now, INTERVAL_DAYS[0], tz) };
  }
  const step = state.intervalStep + 1;
  if (step >= INTERVAL_DAYS.length) {
    return { intervalStep: INTERVAL_DAYS.length, correctStreak: state.correctStreak + 1, status: "mastered" as const, nextReviewAt: startOfLocalDayPlus(now, 3650, tz) };
  }
  return { intervalStep: step, correctStreak: state.correctStreak + 1, status: "active" as const, nextReviewAt: startOfLocalDayPlus(now, INTERVAL_DAYS[step]!, tz) };
}

/** Mốc "hết hôm nay" theo timezone người dùng: item đến hạn nếu nextReviewAt < 00:00 ngày mai (giờ địa phương). */
export function endOfTodayLocal(now: Date, tz: string): Date {
  return startOfLocalDayPlus(now, 1, tz);
}

/** Lần đầu trả lời sai: hẹn ôn sau 1 ngày. */
export function initialSchedule(now: Date, tz: string) {
  return nextSchedule({ intervalStep: 0, correctStreak: 0 }, false, now, tz);
}
