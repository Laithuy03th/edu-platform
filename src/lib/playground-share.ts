/**
 * Link chia sẻ playground: code nằm trong #hash (KHÔNG gửi lên server, không lưu ở đâu) → không thể dùng
 * domain của trang để "host" nội dung người khác. Dùng chung client/server (không import gì của server).
 */
export type WebFiles = { html: string; css: string; js: string };
export const MAX_CHARS = 50_000;

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(payload: Record<string, string>) {
  return toBase64Url(JSON.stringify(payload));
}

/** Giải mã an toàn: chỉ nhận các khóa chuỗi được phép, cắt độ dài. */
export function decodeShare<K extends string>(s: string, keys: readonly K[]): Record<K, string> | null {
  try {
    const raw = JSON.parse(fromBase64Url(s)) as Record<string, unknown>;
    const out = {} as Record<K, string>;
    for (const k of keys) {
      const v = raw?.[k];
      if (v !== undefined && typeof v !== "string") return null;
      out[k] = String(v ?? "").slice(0, MAX_CHARS);
    }
    return out;
  } catch {
    return null;
  }
}

/** Link mở playground web với code cho sẵn (nút "Chạy thử" ở khối code bài học). */
export function playgroundHref(f: Partial<WebFiles>) {
  return `/playground#code=${encodeShare({ html: f.html ?? "", css: f.css ?? "", js: f.js ?? "" })}`;
}
export function sqlPlaygroundHref(sql: string) {
  return `/playground/sql#code=${encodeShare({ sql })}`;
}
export function pythonPlaygroundHref(code: string) {
  return `/playground/python#code=${encodeShare({ py: code })}`;
}
