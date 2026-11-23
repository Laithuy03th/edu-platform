/** Chống open redirect (A12): chỉ chấp nhận đường dẫn nội bộ cùng origin. */
export function safeCallbackUrl(raw: unknown, appOrigin: string, fallback = "/dashboard"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, appOrigin);
    if (url.origin !== appOrigin) return fallback;
    if (url.pathname.startsWith("/api/")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
