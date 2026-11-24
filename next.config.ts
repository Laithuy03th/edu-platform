import type { NextConfig } from "next";

// ADR-001 (sửa đổi Phase 1): KHÔNG bật cacheComponents. Phần lớn trang đọc phiên đăng nhập;
// catalog công khai được cache bằng unstable_cache + revalidateTag (mô hình cache "previous model").
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
  experimental: {
    serverActions: {
      // Server Action body tối đa (form văn bản). Upload binary không đi qua Next.js.
      bodySizeLimit: "200kb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [
      { source: "/:path*", headers: security },
      // Trang chứa token trong URL: không gửi Referer ra ngoài.
      { source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/verify-email", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      // Runner của playground (P05) phải được nhúng bởi trang cùng site; header sau ghi đè X-Frame-Options DENY ở trên.
      { source: "/api/sandbox/runner", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
    ];
  },
};

export default nextConfig;
