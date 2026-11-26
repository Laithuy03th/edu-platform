import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/** Web App Manifest: tên, màu, icon — trình duyệt hiển thị khi "Thêm vào màn hình chính". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — học lập trình theo lộ trình`,
    short_name: SITE_NAME,
    description: "Học lập trình tiếng Việt: bài đọc, video ngắn, quiz, dự án có rubric, playground chạy code ngay trên trình duyệt.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "vi",
    dir: "ltr",
    background_color: "#fffaf9",
    theme_color: "#b91c1c",
    categories: ["education", "developer"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
