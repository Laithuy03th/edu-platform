# SEO_AUDIT — rendering, metadata, canonical, sitemap, hiệu năng

Ngày kiểm tra: 2026-11-24. Dữ liệu từ Atlas `tuhoc_dev`. Đo trên bản build production (`APP_ENV=production`, `APP_URL=http://localhost:3100`), User-Agent Googlebot, ngày 2026-11-24.

> SEO ở đây là checklist kỹ thuật cộng với kế hoạch đo lường. Tài liệu **không** hứa thứ hạng, top Google hay mốc thời gian. Site chưa public nên chưa có dữ liệu Search Console hay CrUX.

## 1. Lỗi tìm thấy và đã sửa trong lượt này

| # | Lỗi (trước khi sửa) | Mức | Sửa | Bằng chứng sau sửa |
|---|---|---|---|---|
| 1 | **Soft-404:** `/courses/khong-ton-tai`, `/paths/khong-co`, `/u/khong-co` trả **200**, kể cả với Googlebot. Nguyên nhân là `app/loading.tsx` ở root bọc mọi trang trong Suspense, nên status 200 đã gửi đi trước khi `notFound()` chạy | P0 | Chuyển `loading.tsx` vào các vùng riêng tư (`(student)`, `admin`, `instructor`); bỏ loading của catalog (bộ lọc đã có trạng thái chờ qua `useTransition`) | Cả 3 URL trên và `/learn/.../<id lạ>` đều trả **404**; `/courses?page=9` cũng trả **404** |
| 2 | Canonical **tương đối** (`/courses/x`) vì không có `metadataBase`. Trang chủ, `/courses`, `/paths`, `/paths/[slug]`, `/u/[handle]` không có canonical | P1 | `metadataBase = APP_URL` trong layout; thêm canonical cho mọi trang công khai | `<link rel="canonical" href="http://localhost:3100/courses/nextjs-co-ban">` |
| 3 | `openGraph` ở trang con thay toàn bộ OG của layout (Next gộp metadata nông), làm mất `site_name`, `locale`, `type` | P1 | Helper `pageOpenGraph()` | og:url, og:type, og:site_name, og:locale có mặt trên mọi trang |
| 4 | Catalog có filter (`?q=`, `?category=`…) có thể sinh vô hạn URL indexable | P1 | Có filter → `noindex, follow`; trang phân trang thuần → canonical về chính nó (không gom về trang 1) | `/courses?q=next` → noindex,follow; `/courses?page=2` → canonical `?page=2` |
| 5 | Không có structured data | P1 | JSON-LD: Organization + WebSite (trang chủ), Course + BreadcrumbList (khóa), BreadcrumbList (lộ trình). Escape `<`; không có rating/giá/ngày giả | 1–2 khối JSON-LD mỗi trang; unit test chống chèn `</script>` |
| 6 | `lastmod` của khóa học lấy `updatedAt`, vốn đổi cả khi chỉ sửa **bản nháp** | P1 | Dùng `published.publishedAt` | sitemap lấy theo lần duyệt gần nhất |
| 7 | Môi trường dev/preview có thể bị index như bản sao | P1 | `APP_ENV` khác `production` → `noindex, nofollow` toàn site (meta) | Dev :3000: noindex,nofollow; production: không có |

## 2. Ma trận URL (production build, Googlebot)

| URL | Status | Canonical | Robots | JSON-LD | Sitemap |
|---|---|---|---|---|---|
| `/` | 200 | `/` | index | Organization, WebSite | ✓ |
| `/courses` | 200 | `/courses` | index | — | ✓ |
| `/courses?page=2` | 200 | `/courses?page=2` | index | — | — |
| `/courses?q=next` | 200 | — | noindex, follow | — | — |
| `/courses/nextjs-co-ban` | 200 | chính nó | index | Course, BreadcrumbList | ✓ (lastmod = publishedAt) |
| `/courses/khong-ton-tai` | **404** | — | noindex | — | — |
| `/paths` | 200 | `/paths` | index | — | ✓ |
| `/paths/full-stack-javascript-can-ban` | 200 | chính nó | index | BreadcrumbList | ✓ |
| `/paths/khong-co`, `/u/khong-co` | **404** | — | noindex | — | — |
| `/learn/...` | 404 nếu không tồn tại; cần đăng nhập | — | Disallow trong robots.txt | — | — |
| `/dashboard`, `/admin` | 307 → login | — | Disallow | — | — |

**robots.txt** chặn `/api/`, `/admin`, `/instructor`, các trang cá nhân và trang auth, đồng thời khai báo `Sitemap:`. Các tài nguyên cần để render (`/_next/static`) **không** bị chặn. Trang riêng tư được bảo vệ bằng xác thực ở server; robots chỉ là lớp phụ.

**Bài học thử (preview)** nằm dưới `/learn/` nên đang bị Disallow, tức là chưa crawl được. Đây là quyết định xuất bản (§37.2). Nếu muốn mở bài thử để xây kho kiến thức, cần một route public riêng (ví dụ `/huong-dan/[slug]`) chứ không mở cả `/learn`.

## 3. Hiệu năng lab (Playwright + Chromium, build production, server cục bộ)

Phương pháp:
- **Mobile:** 375×812, DPR 2, CPU chậm 4×, mạng giả lập 1,6 Mbps / RTT 150 ms.
- **Desktop:** 1440×900, không throttle.
- LCP và CLS lấy từ PerformanceObserver. "TBT~" là tổng phần vượt 50 ms của các long task. Đây **không phải** điểm Lighthouse.
- Server cùng máy nên TTFB thấp hơn thực tế khi deploy.

| Route | Mobile LCP | CLS | TBT~ | JS (nén) | Desktop LCP |
|---|---|---|---|---|---|
| `/` | 1,91 s | 0,000 | 213 ms | 144 KiB | 0,17 s |
| `/courses` | 1,25 s | 0,020 | **660 ms** | 146 KiB | 0,22 s |
| `/courses/nextjs-co-ban` | 1,64 s | 0,000 | 262 ms | 147 KiB | 0,36 s |
| `/paths/full-stack-…` | 1,11 s | 0,000 | 312 ms | 145 KiB | 0,56 s |
| `/login` | 1,00 s | 0,000 | 144 ms | 147 KiB | 0,13 s |

- Ở điều kiện lab này, LCP ≤ 2,5 s và CLS ≤ 0,1 ở mọi route.
- **TBT của `/courses` trên mobile cao (660 ms).** Nghi do hydrate bộ lọc kết hợp `Reveal` stagger. Cần profile (REMAINING_WORK P1-SEO-3).
- INP chưa đo được: cần tương tác thật hoặc dữ liệu field.
- Dữ liệu field (CrUX): **không có**, vì site chưa public.

## 4. Còn thiếu (đưa vào REMAINING_WORK)

| Việc | Mức |
|---|---|
| OG image mặc định 1200×630 (tĩnh, không render theo query) | P1 |
| Breadcrumb hiển thị (HTML), không chỉ JSON-LD | P1 |
| Hub công nghệ/chủ đề có nội dung thật (`/cong-nghe/[slug]`) và liên kết nội bộ hub → bài → dự án | P1 (phụ thuộc T01/T02) |
| Lịch sử slug và redirect 308 khi đổi slug | P1 |
| Chạy Rich Results Test và Schema validator (cần URL public) | khi deploy |
| Search Console: xác minh domain, gửi sitemap, theo dõi index/CWV | khi có domain; chủ domain thực hiện |
| Chia sitemap theo nhóm khi số URL lớn | khi > vài nghìn URL |
| Không có VideoObject vì chưa có video public | P2 |

## 5. Kế hoạch đo lường (khi đã public)

1. Xác minh Search Console theo URL-prefix hoặc domain. Chủ domain tự thêm bản ghi DNS/TXT, không gửi giá trị đó qua chat.
2. Gửi `sitemap.xml`. Theo dõi Pages (indexed/excluded và lý do), canonical Google chọn, Core Web Vitals.
3. Mỗi 30/60/90 ngày xem impressions, clicks, CTR và query theo **landing page**, rồi cải thiện nội dung theo dữ liệu. Đây là lịch rà soát, không phải mốc cam kết thứ hạng.
