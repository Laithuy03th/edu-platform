import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next 16, thay middleware): requestId, CSP có nonce, và redirect LẠC QUAN khi thiếu cookie phiên.
 * Không truy vấn DB, không phải lớp bảo vệ — mọi page/action/route tự kiểm tra quyền ở server.
 */
const PROTECTED = ["/dashboard", "/my-courses", "/notes", "/review", "/settings", "/instructor", "/admin", "/projects", "/my-paths", "/achievements"];

function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => /^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(c.name));
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const cloud = "https://res.cloudinary.com";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src cho phép inline vì React dùng thuộc tính style (thanh tiến độ); rủi ro thấp hơn script.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${cloud} https://lh3.googleusercontent.com`,
    `media-src 'self' ${cloud}`,
    `connect-src 'self' https://api.cloudinary.com${isDev ? " ws:" : ""}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const requestId = req.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  const { pathname, search } = req.nextUrl;

  if (!pathname.startsWith("/api/") && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const headers = new Headers(req.headers);
  headers.set("x-request-id", requestId);
  let csp: string | null = null;
  if (!pathname.startsWith("/api/")) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    csp = buildCsp(nonce);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
  }
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", requestId);
  if (csp) res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
