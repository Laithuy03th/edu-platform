# Tiến độ

## Checkpoint (2026-11-24)

- **Nhánh:** `main` (git cục bộ, chưa có remote). Commit mới nhất: xem `git log --oneline`.
- **Trạng thái:** Phase 1–6 đã triển khai (LMS nền). **Đặc tả V2** (`PROMPT_CLAUDE_EDU_IT_V2.md`) đang thực hiện — trạng thái từng ID ở [FEATURE_AUDIT](FEATURE_AUDIT.md) (79 ID: 32 VERIFIED, 13 IMPLEMENTED_UNVERIFIED, 18 PARTIAL, 3 MOCK_ONLY, 5 BLOCKED, 7 MISSING, 1 DEFERRED); [MEDIA_AUDIT](MEDIA_AUDIT.md), [UI_AUDIT](UI_AUDIT.md), [SEO_AUDIT](SEO_AUDIT.md), [CONTENT_COVERAGE](CONTENT_COVERAGE.md). Việc tiếp: [REMAINING_WORK](REMAINING_WORK.md). Đã xong trong V2: soft-404/SEO kỹ thuật, SMTP Gmail, taxonomy + hub công nghệ, khối code tô màu, review chuyên môn.
- **Quyết định:** chủ dự án giao toàn quyền quyết định (2026-11-23) → 5 câu hỏi mở của Phase 0 chốt theo phương án đề xuất (ADR-002, ADR-010, ADR-016, ADR-018). Brief thiết kế đỏ nhạt + animation áp dụng toàn site (ADR-021); ô mật khẩu có nút hiện/ẩn (ADR-022).

## Ma trận feature (PRD §5) → màn hình / service / test

| # | Feature | Màn hình | Service | Test | Trạng thái |
|---|---|---|---|---|---|
| F01 | Đăng ký email/mật khẩu | `/register` | `auth/service.registerUser` | A1, A2, E2E-1 | ✅ |
| F02 | Đăng nhập/đăng xuất, chống open redirect | `/login` | `server/auth/nextauth`, `redirect.ts` | A4, A12, E2E | ✅ |
| F03 | Google OIDC + liên kết an toàn | `/login`, `/settings/security` | `server/auth/google-policy` | A11, A14 | ⚠️ policy đã test; OAuth thật chưa chạy (chưa có `AUTH_GOOGLE_*`) |
| F04 | Quên/đổi mật khẩu | `/forgot-password`, `/reset-password`, cài đặt | `auth/service` | A5, A6 | ✅ (email qua outbox file; SMTP thật chưa cấu hình) |
| F05 | JWT + thu hồi `authVersion` | — | `viewer-core` | A6, A7 | ✅ |
| F06 | Hồ sơ | `/settings/profile` | `users/service` | allowlist ở action | ✅ |
| F07 | RBAC/ownership, rate limit | — | `courses/policy`, `server/rate-limit` | A4, A9, A10, policy unit | ✅ |
| F08 | Soạn khóa/chương/bài | `/instructor/courses/[id]` | `courses/authoring` | C3, C4, A10, E2E-2 | ✅ |
| F09 | Duyệt & xuất bản | `/admin/courses/[id]` | `approveCourse` (transaction) | C1–C3, E2E-2 | ✅ |
| F10 | Catalog, tìm không dấu | `/courses`, `/courses/[slug]` | `courses/catalog` | C1, C17, C18 | ✅ |
| F11 | Enrollment idempotent | chi tiết khóa | `enrollments/service` | C6, C7 | ✅ |
| F12 | Seed 2 khóa | — | `scripts/db-seed.ts` | chạy lại không nhân đôi | ✅ |
| F13 | Upload signed + reservation + quota | `/instructor/courses/[id]/media` | `media/service` | M1–M4, M7, M11 (mock provider) | ⚠️ upload Cloudinary thật chưa chạy |
| F14 | Video lesson + delivery | trang học | `media/delivery` | C5 | ⚠️ signed URL chưa thử với tài khoản thật |
| F15 | Data saver | trang học, cài đặt | `video-player.tsx` | preload="none" (thủ công) | ✅ |
| F16 | Usage snapshot + kill switch | `/admin/media` | `media/usage`, `settings` | M8 | ✅ (Usage API thật đã gọi 1 lần) |
| F17 | Resume/progress/completion | trang học | `learning/progress` | C8–C10, E2E-1 | ✅ |
| F18 | Quiz | `/quiz/[id]` | `quizzes/service` | C11–C15 | ✅ |
| F19 | Ghi chú timestamp | trang học, `/notes` | `notes/service` | D1, XSS, E2E-1 | ✅ |
| F20 | Đánh giá đầu vào | `/courses/[slug]/placement` | `quizzes/grading` | D4 | ✅ |
| F21 | Ôn tập câu sai | `/review` | `review/*` | D3 | ✅ |
| F22 | Mức độ hiểu | trang học, dashboard | `setUnderstanding` | D5 | ✅ |
| F23 | Dashboard học viên | `/dashboard` | nhiều module | E2E-1 | ✅ |
| F24 | Learning paths | `/paths`, `/instructor/paths` | `learning-paths` | D8, D9 | ✅ |
| F25 | Dự án + rubric | `/projects/[id]`, `/instructor/submissions` | `projects/service` | D6 | ✅ |
| F26 | Hồ sơ thành quả | `/achievements`, `/u/[handle]` | `achievements/service` | D7 | ✅ |
| F27 | Hỏi đáp theo bài | trang học, `/instructor/questions` | `discussions/service` | D11 | ✅ |
| F28 | Review khóa học | chi tiết khóa | `reviews/service` | D10 | ✅ |
| F29 | Báo cáo & kiểm duyệt | `/admin/moderation` | `discussions.moderate` | báo cáo idempotent | ✅ |
| F30 | Admin: user/role, audit, thống kê | `/admin/*` | `admin/service` | A7 | ✅ |
| F31 | Orphan cleanup/reconcile | `/admin/media`, `pnpm media:*` | `media/service` | M4, reservation hết hạn | ⚠️ `findOrphans` cần Cloudinary thật |
| F32 | Xuất ghi chú Markdown | `/notes` | `exportNotesMarkdown` | thủ công | ✅ |
| F33 | Responsive/a11y/SEO/CI | toàn site, `robots.ts`, `sitemap.ts`, CI | — | E2E 375 px, screenshot 375/768/1440 | ✅ (CI chưa chạy vì chưa có remote) |

## Nhật ký kiểm tra (lệnh thực tế, kết quả thật)

| Ngày | Lệnh | Kết quả |
|---|---|---|
| 2026-11-24 | `pnpm typecheck` | pass |
| 2026-11-24 | `pnpm lint` | 0 lỗi, 0 cảnh báo (plugin jsx-a11y in 1 thông báo nội bộ, không phải lỗi) |
| 2026-11-24 | `pnpm test` (Vitest + MongoDB in-memory replica set 8.2.6) | **92/92 pass**, 9 file |
| 2026-11-24 | Quét `.next/static` tìm giá trị secret của `.env` (A16) | 0 lần xuất hiện trong 54 file |
| 2026-11-24 | `pnpm build` (Next 16.4.6) | pass, 51 route |
| 2026-11-24 | `pnpm test:e2e` (Playwright, build production + Mongo cục bộ đã seed) | **10/10 pass** |
| 2026-11-24 | `pnpm db:seed` chạy lại | idempotent |
| 2026-11-24 | `pnpm bench:argon2` | hash 17,2 ms, verify 12,8 ms (máy dev) |
| 2026-11-24 | Kết nối Atlas (script kiểm tra) | **thất bại: TLS alert 80** → IP chưa có trong Network Access |
| 2026-11-24 | Kết nối Atlas sau khi chủ dự án thêm IP | OK (sau ~1 phút); replica set, transaction hoạt động |
| 2026-11-24 | `pnpm db:indexes` (Atlas `tuhoc_dev`) | pass, 29 collection + index |
| 2026-11-24 | `pnpm db:seed` (Atlas) | 2 khóa (7 + 6 bài), 1 lộ trình, 3 tài khoản demo; dbStats 0,93 MiB |
| 2026-11-24 | `pnpm usage:sync` | OK (Cloudinary + MongoDB) |
| 2026-11-24 | `GET /courses` trên dev server của chủ dự án (:3000, Atlas) | HTTP 200, hiển thị 2 khóa |
| 2026-11-24 | Cloudinary Usage API (1 lần) | thành công: Free, 25 credits, usage 0% |
| 2026-11-24 | Screenshot QA 375/768/1440 | không tràn ngang sau khi sửa; không có lỗi JS |
| 2026-11-24 | `GET /api/auth/providers` + POST `/api/auth/signin/google` trên dev :3000, theo redirect tới Google | provider `google` có mặt; Google trả 302 tới trang chọn tài khoản (client_id + redirect_uri `http://localhost:3000/api/auth/callback/google` hợp lệ). Client secret chỉ xác minh được khi đăng nhập thật. |
| 2026-11-24 | Atlas: đếm `authAccounts` (chỉ đọc) | 1 tài khoản provider=google, user active + emailVerified (tạo 05:21) → callback Google + tạo user đã chạy thật |
| 2026-11-24 | **Audit V2** (đọc `.env` chỉ có/thiếu) | SMTP_HOST/PORT/SECURE/USER/PASSWORD, MAIL_FROM: **trống cả 6**; `MAIL_TRANSPORT` không có dòng. Lỗi thiết kế: dev luôn ghi file kể cả khi đã điền SMTP → đã sửa |
| 2026-11-24 | `pnpm mail:check` (cấu hình hiện tại) | exit 1: transport=file, thiếu SMTP — đúng thực trạng. Thử cấu hình giả: cổng đóng → ESOCKET có hướng dẫn; Gmail From≠User + mật khẩu có dấu cách → báo lỗi trước khi kết nối |
| 2026-11-24 | curl status trang public (dev :3000, trước sửa) | **soft-404**: `/courses/khong-ton-tai`, `/paths/khong-co`, `/u/khong-co` → 200 (cả UA Googlebot) |
| 2026-11-24 | Build production `APP_ENV=production` + `next start :3100` (Atlas, chỉ đọc), UA Googlebot | sau sửa: slug lạ → 404; canonical tuyệt đối; filter → noindex,follow; JSON-LD Course/Breadcrumb/Organization; sitemap lastmod = publishedAt |
| 2026-11-24 | Lab perf (Playwright, mobile 375 CPU 4× ~1,6 Mbps) | LCP 1,0–1,9 s, CLS ≤ 0,02; TBT~ `/courses` 660 ms (cần xử lý). Desktop LCP ≤ 0,56 s |
| 2026-11-24 | No-JS / reduced-motion / Tab (Playwright) | 0 phần tử chữ bị ẩn; 0 animation chạy khi reduce; focus ring ở mọi điểm dừng Tab |
| 2026-11-24 | `pnpm typecheck` · `pnpm lint` · `pnpm test` | pass · 0 lỗi · **97/97** (10 file; thêm 5 test SEO/mail) |
| 2026-11-24 | `pnpm build` + `pnpm test:e2e` (Mongo cục bộ) | build pass; lần 1: 9/10 (E2E-1 lỗi vì `.next/cache` còn dữ liệu Atlas từ lần chạy :3100 → ID khóa không khớp DB cục bộ); xóa `.next/cache` → **10/10 pass** |
| 2026-11-24 | `pnpm mail:check` sau khi chủ dự án điền SMTP (Gmail, 465) | đăng nhập SMTP **OK**; App Password có dấu cách → adapter bỏ dấu cách với Gmail |
| 2026-11-24 | `pnpm mail:check --self` | Gmail chấp nhận 1 thư thử tới địa chỉ MAIL_FROM (log `mail.sent`); chủ dự án cần xác nhận đã nhận trong hộp thư |
| 2026-11-24 | `pnpm test` (sau taxonomy + code block) | **103/103** (11 file; thêm `technologies.test.ts` 6 test) · typecheck pass · lint 0 lỗi |
| 2026-11-24 | `pnpm db:indexes` + `pnpm db:seed` (Atlas `tuhoc_dev`) | thêm 35 công nghệ; gắn công nghệ cho 2 khóa (migration v1→v2, chỉ thêm field, idempotent); user demo không bị tạo lại |
| 2026-11-24 | curl dev :3000 (Atlas) | `/technologies` 200 (5 hub); `/technologies/js` → 308 `/javascript`; `/technologies/python` (planned) 404; `/courses?tech=js` ra 2 khóa; sitemap có 5 hub; bài học thử: khung code shiki + nút sao chép |
| 2026-11-24 | Screenshot 375/1440 (/technologies, hub, khóa, bài học) | không tràn ngang; xem trực quan OK |
| 2026-11-24 | `pnpm build` + `pnpm test:e2e` (Mongo cục bộ đã seed taxonomy, đã xóa `.next/cache`) | build pass; **10/10 pass** |
| 2026-11-24 | `pnpm media:samples` (chỉ dựng, khóa Next.js) | Lần 1 dùng `recordVideo` của Playwright: VP8 ~0,6 Mbps, 3,8–5,8 MiB/video. Đổi sang CDP screencast + VP9 CRF 36 (ffmpeg đi kèm Playwright): **0,5–0,8 MiB/video**, chữ vẫn nét (kiểm bằng frame chụp khi phát) |
| 2026-11-24 | `pnpm media:samples --apply --submit` (Atlas + Cloudinary thật; chủ dự án yêu cầu) | Ảnh bìa đầu tiên OK; video đầu tiên bị finalize **từ chối: "Không đọc được thời lượng video"** → Admin API thiếu `duration` khi không có `media_metadata: true` (đã kiểm chứng thật) → sửa `fetchResource` + unit test. Chạy lại: **2 ảnh bìa + 13 video** `ready`; 2 khóa gửi duyệt |
| 2026-11-24 | Duyệt 2 khóa qua UI admin trên dev :3000 (Playwright) | Đã xuất bản; catalog và trang khóa hiện ảnh bìa mới |
| 2026-11-24 | Kiểm tra phát video qua UI (học viên demo, :3000) | Preview `upload` và bài thường `authenticated` + URL ký: phát OK, có poster, resume 5→10→15 s. Khách mở bài thường → `/login`, không có URL video trong HTML |
| 2026-11-24 | Sửa tổng thời lượng khóa (bài video có kèm bài đọc) | Tổng = độ dài video + thời gian đọc ước tính (`readingSeconds`, ~200 từ/phút); ngưỡng 90% video không đổi. Thẻ khóa bỏ dấu "~" vì font hiển thị giống dấu trừ. Duyệt lại: Next.js 14 phút, MongoDB 11 phút |
| 2026-11-24 | `pnpm usage:sync` · `pnpm media:cleanup` (dry-run) | credits 0,17 → 0,2/25; transformations 34; storage provider chưa cập nhật (theo ngày); orphan 0 |
| 2026-11-24 | `pnpm test` · typecheck · lint | **106/106** (12 file; thêm `cloudinary-adapter.test.ts`, `readingSeconds`) · pass · 0 lỗi |
| 2026-11-24 | Trang chủ mới + banner thông báo (admin) | Hero nhiều lớp, số liệu thật, tab mục tiêu, khóa editorial, showcase dự án; banner bật qua UI admin trên Atlas (link `javascript:` bị từ chối); screenshot 375/1440 |
| 2026-11-24 | Bookmark (L10), báo lỗi nội dung (T06) | Test tích hợp pass; `pnpm db:indexes` trên Atlas |
| 2026-11-24 | Bài hướng dẫn công khai (T05/T04/S06) | create-next-app thật (Next 16.4.6/React 19.3.0, 62 s), `npm run dev` HTTP 200, `npm run build` exit 0 trên Windows 11; tái hiện 4 lỗi kết nối bằng driver mongodb 7.9.1; seed 3 bài lên Atlas; `/huong-dan/*` 200, slug sai 404, sitemap có 3 bài |
| 2026-11-24 | Bài tập đọc code (P04) | 4 bài tập trên Atlas; qua UI: trước khi nộp HTML không chứa lời giải, sai → gợi ý → đúng → lời giải |
| 2026-11-24 | Đo tải cục bộ (build production + Mongo cục bộ, autocannon) | Trang bài học 24 → 18 thao tác DB/lượt; 0 lỗi ở 50 kết nối; chi tiết [CAPACITY](CAPACITY.md) |
| 2026-11-24 | `pnpm test` · typecheck · lint · `pnpm test:e2e` | **117/117** (17 file) · pass · 0 lỗi · **10/10** (lần đầu 9/10: chữ "Đã lưu" của menu mới trùng thông báo lưu ghi chú → đổi tên mục thành "Đánh dấu của tôi") |
| 2026-11-24 | Playground (P05) | UI thật: ví dụ chạy; code trong khung → cookie/localStorage/parent/top-nav `SecurityError`, fetch bị chặn; `while(true)` treo cả tab → thêm bảo vệ vòng lặp (unit) → tự dừng sau ~1,5 s |
| 2026-11-24 | Dark theme (U07) | Screenshot trang chủ/khóa/dashboard; sửa chữ hồng trên thẻ đỏ; header tràn ở 1024–1280 → 0 px |
| 2026-11-24 | Đổi slug khóa (S06), `pnpm content:check` (T07) | INT redirect; Atlas 16 khối code 0 lỗi cú pháp; bộ kiểm bắt đúng lỗi cố ý |
| 2026-11-24 | Trình phát (M04) | Mục lục video 7 chương, bấm chương 4 → tua 0:20; tốc độ 1,5×; phụ đề WebVTT validate (unit), chưa thử với file thật |
| 2026-11-24 | `pnpm db:backup` (O07) | Atlas 36 collection/181 document → khôi phục vào Mongo cục bộ 36/36 khớp; từ chối ghi đè DB có dữ liệu |
| 2026-11-24 | Dev server :3000 của chủ dự án đã dừng (không do trợ lý) | Kiểm tra trên dev server riêng :3200 (`APP_URL` ghi đè trên dòng lệnh, không sửa .env) |
| 2026-11-24 | Media thật qua UI (M03/M06/M07/M08/M09) | Upload 2 ảnh qua nút trên trình duyệt; alt/nguồn cho ảnh bìa; tiết kiệm dữ liệu: không tải video tới khi bấm; kill switch tắt → "Tạm dừng phát video", bật lại OK; xóa ảnh thử → Cloudinary 404 |
| 2026-11-24 | Quét tràn ngang 29 trang × 5 độ rộng (320–1440) | 3 lỗi (glow trang chủ, nút Lưu trang khóa, bảng admin do nhãn sr-only absolute) → đã sửa |
| 2026-11-24 | Đăng nhập admin bị chặn 15 phút sau nhiều lần đăng nhập tự động | Rate limit 5 lần/15 phút/email hoạt động đúng |

## Chưa kiểm chứng / cần chủ dự án

1. ~~**Atlas Network Access**~~ — đã xong 2026-11-24 (index + seed trên `tuhoc_dev`). Đổi mạng/IP thì phải thêm lại IP — [RUNBOOK §1](RUNBOOK.md). Tài khoản demo do seed tạo: đổi mật khẩu hoặc xóa trước khi công khai.
2. **Xoay vòng secret:** một phần đầu của `AUTH_SECRET` và `RATE_LIMIT_SECRET` đã bị in ra log của trợ lý trong phiên 2026-11-24 → nên tạo giá trị mới (`openssl rand -base64 32`).
3. **Google OAuth:** đã điền; đăng nhập mới qua Google chạy thật trên Atlas. Còn thử: liên kết/hủy liên kết, user bị khóa (REMAINING_WORK P0-4).
4. **SMTP:** đã cấu hình Gmail; đăng nhập + gửi thử OK (2026-11-24). Còn: chạy luồng đăng ký → xác minh → quên mật khẩu bằng email thật (REMAINING_WORK P0-2).
5. ~~**Cloudinary thật**~~ — đã có 13 video + 2 ảnh bìa thật (2026-11-24, [MEDIA_AUDIT](MEDIA_AUDIT.md)). Còn: thử nút upload trên trình duyệt với 1 file thật, data saver, webhook (cần URL công khai).
6. **Deploy:** chưa làm (chỉ khi được yêu cầu) — [DEPLOYMENT](DEPLOYMENT.md).

## Giới hạn đã biết

- Signed URL video không hết hạn, có thể bị chia sẻ (ADR-010).
- Cloudinary Free không có hard cap; chỉ giảm rủi ro bằng ngân sách nội bộ, fail-closed, kill switch.
- next-auth v5 vẫn beta (ADR-002), đã bọc trong `src/server/auth`.
- Catalog tìm theo từ; ghi chú tìm chuỗi con; không có semantic search.
- Đổi email, xóa tài khoản, 2FA: ngoài phạm vi hiện tại.
