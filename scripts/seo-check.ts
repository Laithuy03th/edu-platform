import { arg, flag } from "./_env";

/**
 * S03/S04/S10: kiểm tra SEO kỹ thuật trên một server đang chạy (dev, build cục bộ hoặc bản deploy).
 *   pnpm seo:check --base=http://localhost:3000            (môi trường không phải production: chấp nhận noindex)
 *   pnpm seo:check --base=https://ten-mien --production   (bắt buộc index được)
 * Với MỌI URL trong sitemap: status 200, canonical tuyệt đối = URL, có <title> và meta description,
 * không noindex (khi --production), JSON-LD parse được + đủ trường bắt buộc, không rating/giá giả.
 * Thêm: slug không tồn tại phải trả 404 thật (không soft-404). Không thay cho Search Console.
 */
const base = (arg("base") ?? "http://localhost:3000").replace(/\/$/, "");
const production = flag("production");
const REQ: Record<string, string[]> = {
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
  Course: ["name", "description", "provider"],
  TechArticle: ["headline", "datePublished", "dateModified", "author"],
  BreadcrumbList: ["itemListElement"],
};

const meta = (html: string, re: RegExp) => html.match(re)?.[1] ?? null;

async function main() {
  const sm = await fetch(`${base}/sitemap.xml`);
  if (!sm.ok) throw new Error(`sitemap.xml trả ${sm.status}`);
  const xml = await sm.text();
  // URL trong sitemap dùng APP_URL của server; kiểm tra theo path trên --base
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname + new URL(m[1]!).search);
  let problems = 0;
  const fail = (u: string, msg: string) => {
    problems++;
    console.log(`✗ ${u}: ${msg}`);
  };
  for (const p of paths) {
    const res = await fetch(base + p, { redirect: "manual", headers: { "user-agent": "TuHoc-SEO-Check" } });
    if (res.status !== 200) {
      fail(p, `status ${res.status}`);
      continue;
    }
    const html = await res.text();
    const canonical = meta(html, /<link rel="canonical" href="([^"]+)"/);
    if (!canonical) fail(p, "thiếu canonical");
    else if (!/^https?:\/\//.test(canonical)) fail(p, `canonical không tuyệt đối: ${canonical}`);
    else if (new URL(canonical).pathname + new URL(canonical).search !== p) fail(p, `canonical khác URL: ${canonical}`);
    const title = meta(html, /<title>([^<]*)<\/title>/);
    if (!title || title.length < 10) fail(p, "title thiếu/quá ngắn");
    const desc = meta(html, /<meta name="description" content="([^"]*)"/);
    if (!desc || desc.length < 50) fail(p, "meta description thiếu/quá ngắn");
    const robots = meta(html, /<meta name="robots" content="([^"]*)"/);
    if (production && robots && /noindex/.test(robots)) fail(p, `noindex trên trang trong sitemap (${robots})`);
    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      let data: unknown;
      try {
        data = JSON.parse(m[1]!);
      } catch {
        fail(p, "JSON-LD không parse được");
        continue;
      }
      for (const d of (Array.isArray(data) ? data : [data]) as Record<string, unknown>[]) {
        for (const k of REQ[String(d["@type"])] ?? []) if (d[k] === undefined || d[k] === "") fail(p, `${d["@type"]} thiếu ${k}`);
        if (/aggregateRating|"offers"/.test(JSON.stringify(d))) fail(p, "JSON-LD có rating/giá (không có dữ liệu thật)");
      }
    }
  }
  for (const p of ["/courses/khong-ton-tai-seo-check", "/huong-dan/khong-ton-tai-seo-check", "/technologies/khong-ton-tai-seo-check"]) {
    const r = await fetch(base + p, { redirect: "manual" });
    if (r.status !== 404) fail(p, `mong đợi 404, nhận ${r.status} (soft-404?)`);
  }
  console.log(`\nĐã kiểm ${paths.length} URL trong sitemap + 3 URL không tồn tại · ${problems ? `${problems} vấn đề` : "không có vấn đề"}${production ? "" : " (chế độ không-production: bỏ qua noindex)"}`);
  if (problems) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
