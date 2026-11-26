import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Ảnh Open Graph 1200×630 dựng từ DỮ LIỆU THẬT của trang (tiêu đề, mô tả, số khóa/bài) — không nhận chữ tùy ý
 * từ query string (không cho người ngoài "in" nội dung bất kỳ lên domain của site).
 * Font Be Vietnam Pro (OFL, src/assets/fonts) để dấu tiếng Việt hiển thị đúng.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type Font = { name: string; data: Buffer; weight: 700 | 800; style: "normal" };
let fonts: Promise<Font[]> | null = null;
function loadFonts(): Promise<Font[]> {
  const dir = join(process.cwd(), "src", "assets", "fonts");
  fonts ??= Promise.all([
    readFile(join(dir, "BeVietnamPro-Bold.ttf")).then((data): Font => ({ name: "Be Vietnam Pro", data, weight: 700, style: "normal" })),
    readFile(join(dir, "BeVietnamPro-ExtraBold.ttf")).then((data): Font => ({ name: "Be Vietnam Pro", data, weight: 800, style: "normal" })),
  ]);
  return fonts;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Biểu tượng trang sách mở — cùng hình với logo trên header. */
function BookMark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, backgroundImage: "linear-gradient(135deg, #fca5a5, #dc2626)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px -12px rgba(185,28,28,.6)" }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" />
        <path d="M12 6.5v13" />
      </svg>
    </div>
  );
}

export async function ogImage({ eyebrow, title, subtitle, chips = [] }: { eyebrow: string; title: string; subtitle?: string; chips?: string[] }) {
  const t = clip(title, 90);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", backgroundColor: "#fffaf9", backgroundImage: "radial-gradient(circle at 88% 12%, #fecaca 0, rgba(254,202,202,0) 42%), radial-gradient(circle at 0% 100%, #fee2e2 0, rgba(254,226,226,0) 45%)", fontFamily: "Be Vietnam Pro", color: "#18181b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <BookMark size={64} />
          <div style={{ display: "flex", fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>
            Tự<span style={{ marginLeft: 10, color: "#b91c1c" }}>Học</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 2 }}>{clip(eyebrow, 60)}</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: t.length > 55 ? 58 : 70, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>{t}</div>
          {subtitle ? <div style={{ display: "flex", marginTop: 22, fontSize: 28, fontWeight: 700, color: "#52525b", lineHeight: 1.4 }}>{clip(subtitle, 140)}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.slice(0, 4).map((c) => (
            <div key={c} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, backgroundColor: "#ffffff", border: "2px solid #fecaca", fontSize: 24, fontWeight: 700, color: "#991b1b" }}>
              {clip(c, 36)}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}

/** Biểu tượng vuông (favicon PNG, apple-touch-icon, manifest) — vẽ từ cùng logo. */
export function iconImage(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: "linear-gradient(135deg, #f87171, #b91c1c)", borderRadius: size >= 180 ? 0 : size * 0.22 }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" />
          <path d="M12 6.5v13" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
