import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";

// Font thiết kế cho tiếng Việt; next/font self-host lúc build → không request Google khi chạy.
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: { default: "Tự Học — học lập trình theo lộ trình", template: "%s · Tự Học" },
  description: "Nền tảng học trực tuyến: bài đọc, video ngắn, quiz, bài tập dự án có rubric, ghi chú theo thời điểm video và ôn tập câu sai.",
  applicationName: "Tự Học",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fffaf9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: chỉ cho thẻ <html> — tiện ích trình duyệt (vd dịch trang) hay chèn thuộc tính data-* vào đây.
    <html lang="vi" className={beVietnam.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        <a href="#main" className="sr-only z-[70] rounded-full bg-surface px-4 py-2 shadow-md focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Bỏ qua tới nội dung chính
        </a>
        <Providers>
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
