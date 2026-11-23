import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "Tự Học — học lập trình theo lộ trình", template: "%s · Tự Học" },
  description:
    "Nền tảng học trực tuyến: bài đọc, video ngắn, quiz, bài tập dự án có rubric, ghi chú theo thời điểm video và ôn tập câu sai.",
  applicationName: "Tự Học",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Bỏ qua tới nội dung chính
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
