# Tiến độ

## Checkpoint (2026-11-24)

- **Nhánh:** `main` (git cục bộ, chưa có remote). Commit mới nhất: xem `git log --oneline`.
- **Trạng thái:** Phase 1–6 đã triển khai. Build production thành công, chạy được với MongoDB cục bộ. Còn các mục **cần tài khoản/hạ tầng thật** (mục "Chưa kiểm chứng").
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
| 2026-11-24 | Cloudinary Usage API (1 lần) | thành công: Free, 25 credits, usage 0% |
| 2026-11-24 | Screenshot QA 375/768/1440 | không tràn ngang sau khi sửa; không có lỗi JS |

## Chưa kiểm chứng / cần chủ dự án

1. **Atlas Network Access:** thêm IP máy, rồi `pnpm db:indexes` và (tùy chọn) `pnpm db:seed` — [RUNBOOK §1](RUNBOOK.md).
2. **Xoay vòng secret:** một phần đầu của `AUTH_SECRET` và `RATE_LIMIT_SECRET` đã bị in ra log của trợ lý trong phiên 2026-11-24 → nên tạo giá trị mới (`openssl rand -base64 32`).
3. **Google OAuth:** điền `AUTH_GOOGLE_ID/SECRET`, redirect URI `<APP_URL>/api/auth/callback/google`, thử các nhánh đăng nhập/liên kết.
4. **SMTP:** điền `SMTP_*`, `MAIL_FROM` (bắt buộc khi production).
5. **Cloudinary thật:** upload 1 video nhỏ đo chi phí xử lý (FREE_TIER_BUDGET §3.2), thử signed URL, `pnpm media:cleanup` dry-run.
6. **Deploy:** chưa làm (chỉ khi được yêu cầu) — [DEPLOYMENT](DEPLOYMENT.md).

## Giới hạn đã biết

- Signed URL video không hết hạn, có thể bị chia sẻ (ADR-010).
- Cloudinary Free không có hard cap; chỉ giảm rủi ro bằng ngân sách nội bộ, fail-closed, kill switch.
- next-auth v5 vẫn beta (ADR-002), đã bọc trong `src/server/auth`.
- Catalog tìm theo từ; ghi chú tìm chuỗi con; không có semantic search.
- Đổi email, xóa tài khoản, 2FA: ngoài phạm vi hiện tại.
