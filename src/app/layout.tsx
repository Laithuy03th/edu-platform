import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { cookies, headers } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/site-cookies";

// Font thiết kế cho tiếng Việt; next/font self-host lúc build → không request Google khi chạy.
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

// metadataBase từ APP_URL → canonical/OG là URL tuyệt đối đúng origin của môi trường (SEO_AUDIT S02).
// Môi trường không phải production: noindex toàn site để bản dev/preview không bị index như bản sao.
const appEnv = env();
export const metadata: Metadata = {
  metadataBase: new URL(appEnv.appUrl),
  title: { default: "Tự Học — học lập trình theo lộ trình", template: "%s · Tự Học" },
  description: "Nền tảng học trực tuyến: bài đọc, video ngắn, quiz, bài tập dự án có rubric, ghi chú theo thời điểm video và ôn tập câu sai.",
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "vi_VN", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image" },
  robots: appEnv.isProduction ? undefined : { index: false, follow: false },
  // S08: xác minh Google Search Console / Bing Webmaster bằng thẻ meta (đặt biến môi trường khi deploy)
  verification: {
    ...(appEnv.GOOGLE_SITE_VERIFICATION ? { google: appEnv.GOOGLE_SITE_VERIFICATION } : {}),
    ...(appEnv.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": appEnv.BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fffaf9" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // U07: theme từ cookie → render đúng ngay từ server (không nhấp nháy). "system" cần biết media query của
  // trình duyệt → một script inline rất nhỏ có nonce CSP chạy trước khi vẽ.
  const pref = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // suppressHydrationWarning: chỉ cho thẻ <html> — tiện ích trình duyệt (vd dịch trang) hay chèn thuộc tính data-* vào đây.
    <html lang="vi" className={beVietnam.variable} data-theme={pref === "dark" ? "dark" : "light"} suppressHydrationWarning>
      {pref === "system" ? (
        <head>
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'" }} />
        </head>
      ) : null}
      <body className="flex min-h-screen flex-col font-sans">
        <a href="#main" className="sr-only z-[70] rounded-full bg-surface px-4 py-2 shadow-md focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Bỏ qua tới nội dung chính
        </a>
        <Providers>
          <AnnouncementBar />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
