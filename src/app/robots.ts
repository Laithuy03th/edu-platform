import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Chỉ index trang công khai; chặn trang cá nhân/quản trị/API (§7.1). */
export default function robots(): MetadataRoute.Robots {
  const base = env().appUrl;
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses", "/technologies", "/paths", "/u/"],
        disallow: ["/api/", "/admin", "/instructor", "/dashboard", "/my-courses", "/learn/", "/notes", "/review", "/settings", "/projects", "/quiz/", "/my-paths", "/achievements", "/login", "/register", "/verify-email", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
