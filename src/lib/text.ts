/** Bỏ dấu tiếng Việt + lowercase để tìm kiếm không dấu (ADR-013). */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape ký tự đặc biệt regex (dùng cho tìm kiếm ghi chú đã scope theo user). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(input: string): string {
  return normalizeForSearch(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Loại ký tự điều khiển (trừ xuống dòng/tab) khỏi văn bản người dùng nhập. */
export function stripControlChars(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KiB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MiB`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} GiB`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Thời gian đọc ước tính của phần chữ (markdown) — ~200 từ/phút, bỏ khối code (người học đọc code chậm hơn nhưng không đếm từ được).
 * Dùng cho tổng thời lượng khóa khi bài video còn có bài đọc kèm; KHÔNG dùng cho ngưỡng hoàn thành video.
 */
export function readingSeconds(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return words ? Math.max(60, Math.round((words / 200) * 60)) : 0;
}

export function formatMinutes(totalSeconds: number): string {
  const min = Math.round(totalSeconds / 60);
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}
