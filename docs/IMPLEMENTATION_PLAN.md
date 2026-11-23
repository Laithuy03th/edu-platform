# Kế hoạch triển khai

> Lập ở Phase 0 (2026-11-23). Mỗi phase: nêu phạm vi + tiêu chí nghiệm thu trước khi code, báo cáo kết quả/kiểm thử/giới hạn sau khi xong, cập nhật [PROGRESS.md](PROGRESS.md). Task nhỏ đủ để review; ID task dùng trong commit message (`P1.3: ...`).

## Phụ thuộc bên ngoài theo phase

| Phase | Cần từ chủ dự án | Nếu chưa có |
|---|---|---|
| 1 | `MONGODB_URI` (Atlas Free) — tùy chọn; Google OAuth Client ID/Secret; SMTP | Test dùng memory DB; email qua file outbox; nút Google ẩn + ghi "chưa xác minh" |
| 2 | — | |
| 3 | Cloudinary cloud name/API key/secret; vài video nhỏ có quyền sử dụng | Hoàn thành code + test mock (có nhãn), ghi "integration chưa xác minh" |
| 6 | Quyết định deploy (chỉ khi được yêu cầu) | Chuẩn bị DEPLOYMENT.md, không deploy |

---

## Phase 1 — Nền tảng và authentication

**Phạm vi:** scaffold, env validation, DB + indexes, UI shell, email/mật khẩu, xác minh/quên/đổi mật khẩu, Google + liên kết, JWT revoke, RBAC helper, rate limit, bootstrap admin, test auth.

| ID | Task | File/module chính |
|---|---|---|
| P1.1 | `git init`; scaffold Next 16.4.6 + TS 6.0.3 + Tailwind 4 + ESLint vào repo hiện có (tạo ở thư mục tạm rồi chép, **không ghi đè** `docs/`, `PROMPT_*.md`, `.env*`); pin version exact; `engines`; `.nvmrc` | `package.json`, `next.config.ts`, `tsconfig.json` |
| P1.2 | Prettier, Vitest (unit + integration project), cấu hình memory replica set + guard, script `lint/typecheck/test/build`, GitHub Actions CI (không secrets) | `vitest.config.ts`, `tests/setup/*`, `.github/workflows/ci.yml` |
| P1.3 | `lib/env.ts` (Zod, tách server/client, báo lỗi thiết lập rõ), `lib/db.ts` (client dùng lại, pool nhỏ, `withTransaction`), `lib/errors.ts`, `lib/logger.ts` (redaction), `lib/request.ts` (requestId, IP, Origin), `lib/ids.ts`, `lib/text.ts` | `src/lib/*` |
| P1.4 | `scripts/db-indexes.ts` cho users, authAccounts, authTokens, rateLimitBuckets, auditLogs, appSettings; **test transaction thật trên Atlas nếu có URI** | `scripts/`, `src/modules/*/repo.ts` |
| P1.5 | Mail adapter `smtp` + `file`; template email tiếng Việt (text + HTML đơn giản) | `src/server/mail/*` |
| P1.6 | Password: chuẩn hóa NFC, validate, hash/verify Argon2id; `scripts/bench-argon2.ts` → ghi kết quả thật vào ADR-004 | `src/server/auth/password.ts` |
| P1.7 | Rate limit MongoDB + HMAC key | `src/lib/rate-limit.ts` |
| P1.8 | Auth.js config: Credentials + Google, `jwt` strategy, maxAge/updateAge, claim `sub/av/lat`, callbacks; `getViewer/requireViewer/requireRole/requireVerifiedEmail`; `proxy.ts` (requestId + redirect lạc quan); **đọc source @auth/core để xác nhận JWE/cookie/checks** và ghi vào AUTH_SECURITY | `src/server/auth/*`, `src/proxy.ts`, `app/api/auth/[...nextauth]` |
| P1.9 | Wrapper `action()` (Origin, Zod, auth, rate limit, ActionResult) | `src/server/action.ts` |
| P1.10 | Luồng đăng ký, xác minh, gửi lại, đăng nhập, đăng xuất, đăng xuất tất cả, quên/đặt lại, đổi mật khẩu + trang UI (shadcn form, lỗi gắn field, pending state) | `modules/auth`, `app/(auth)/*`, `app/(student)/settings/security` |
| P1.11 | Google sign-in theo bảng quyết định A/B/C; liên kết (link_intent + xác thực gần đây), hủy liên kết, đặt mật khẩu cho tài khoản chỉ Google | `modules/auth`, `server/auth` |
| P1.12 | Hồ sơ: tên, bio, timezone, mục tiêu, data saver, phương thức đã liên kết (allowlist field) | `modules/users`, `app/(student)/settings/profile` |
| P1.13 | UI shell: header/nav theo role (từ `getViewer`), layout responsive, trang lỗi/403/404/loading, metadata + `noindex` cho trang riêng, security headers cơ bản | `app/layout.tsx`, `components/*` |
| P1.14 | `scripts/create-admin.ts`; `auditLogs` cho sự kiện auth/admin | `scripts/`, `modules/admin` |
| P1.15 | Test A1–A16 ([TEST_PLAN](TEST_PLAN.md)); cập nhật CLAUDE.md, README setup, PROGRESS | `tests/*` |

**Nghiệm thu Phase 1:**
- Đăng ký → nhận email (file outbox hoặc SMTP thật) → xác minh → đăng nhập/đăng xuất chạy được với memory DB và với Atlas khi có URI.
- Test A1–A16 pass (trừ phần ghi rõ cần provider thật); lint, typecheck, build pass — kèm lệnh và output thật.
- Reset/đổi mật khẩu/logout-all/block làm phiên cũ bị từ chối ở request kế tiếp (test integration).
- Google: nếu có credentials → thử thật cả 3 nhánh A/C2/C3 + liên kết; nếu không → ghi "chưa xác minh".
- Không có secret trong source/bundle (A16).

## Phase 2 — Course authoring và catalog

| ID | Task |
|---|---|
| P2.1 | Repo + index: categories, courses, chapters, lessons, enrollments; seed categories |
| P2.2 | Policy course (`canEditCourse`, `canReadLesson`, ...) + unit test |
| P2.3 | Instructor application (đơn + admin duyệt → thêm role) |
| P2.4 | Course editor: metadata, chương, bài đọc (Markdown editor đơn giản + preview an toàn), reorder lên/xuống với `expectedRevision`, cảnh báo thay đổi chưa lưu |
| P2.5 | State machine: submit/withdraw/approve/reject/archive/suspend; điều kiện xuất bản; transaction draft→published; audit |
| P2.6 | Catalog: tìm không dấu (text index), lọc, sort enum, phân trang, debounce; chi tiết khóa; bài preview; `'use cache'` + tag + invalidation; SEO metadata/sitemap cho trang public |
| P2.7 | Enrollment idempotent; "Khóa học của tôi"; trang học bài đọc (sidebar, trước/sau) |
| P2.8 | Dashboard giảng viên (danh sách khóa, trạng thái duyệt) + admin hàng duyệt |
| P2.9 | Seed 2 khóa tự biên soạn (text, quiz placeholder chưa dùng), idempotent theo slug, nhãn "demo" |
| P2.10 | Test C1–C7, C16–C18 (phần bài đọc); E2E luồng 2 |

**Nghiệm thu:** instructor tạo khóa → admin duyệt → student enroll → đọc bài; draft/pending không lộ ở catalog/API/preview/cache (có test).

## Phase 3 — Cloudinary và kiểm soát tài nguyên

| ID | Task |
|---|---|
| P3.1 | Đối chiếu tài khoản Cloudinary thật theo checklist [FREE_TIER_BUDGET §6](FREE_TIER_BUDGET.md#6-checklist-đối-chiếu-khi-có-credentials-phase-3); **thí nghiệm chi phí upload video**; báo chủ dự án nếu khác giả định |
| P3.2 | `appSettings` (limits, budget, killSwitches) + admin UI tối thiểu |
| P3.3 | Reservation + quota atomic + release lười; `requestUploadAction` ký params allowlist |
| P3.4 | Uploader client (kiểm tra size/type/duration qua `<video>` metadata, tiến độ, hủy) |
| P3.5 | Finalize qua Admin API + transaction; webhook route + verify chữ ký |
| P3.6 | Media picker, gắn video/ảnh vào lesson/course (refs), điều kiện xuất bản về media |
| P3.7 | Delivery: signed URL `authenticated` theo quyền, preview public, poster; player (`preload="none"`, không autoplay, label điều khiển, tốc độ, transcript) |
| P3.8 | Data saver: preference, chỉ gắn nguồn khi bấm, hiển thị dung lượng ước tính; ảnh lazy + custom loader 3 width |
| P3.9 | Usage snapshot (refresh có cooldown, fail-closed), dashboard media/quota cơ bản |
| P3.10 | `media:cleanup` + `media:reconcile` dry-run mặc định; deletion retry |
| P3.11 | Test M1–M11; upload thật 1–2 file nhỏ, ghi kết quả |

**Nghiệm thu:** upload thật kích thước nhỏ, xem đúng policy, race quota có test, tài liệu không nhầm bảo vệ UI với bảo vệ CDN.

## Phase 4 — Học tập và điểm nhấn ban đầu

| ID | Task |
|---|---|
| P4.1 | lessonProgress: autosave 30 s khi thay đổi ≥ 5 s, pause/ended/visibilitychange + beacon; quy tắc event cũ |
| P4.2 | Hoàn thành: nút bài đọc, gợi ý 90% video (dựa `furthest`), quiz pass; tính tiến độ khóa; `enrollment.completedAt` |
| P4.3 | Quiz editor (single choice, ≤ 30 câu, version câu hỏi), xuất bản → quizVersions |
| P4.4 | Làm quiz: DTO không đáp án, submissionId, chấm server, kết quả từng câu, retry mạng an toàn, bàn phím |
| P4.5 | Đánh giá đầu vào: topicKey + rules, gợi ý chương, cho phép bỏ qua |
| P4.6 | Review items + màn "Hôm nay cần ôn" (lọc khóa/chủ đề, timezone) |
| P4.7 | Mức độ hiểu sau bài + danh sách cần ôn |
| P4.8 | Ghi chú timestamp: tạo ở thời điểm hiện tại, sửa timestamp, seek, tìm/lọc/phân trang, trạng thái lưu, giữ bản nháp khi lỗi |
| P4.9 | Dashboard học viên: tiếp tục học, tiến độ, quiz cần ôn, bài chưa hiểu, mục tiêu tuần (đơn giản) |
| P4.10 | Đo `db.stats()` thật, cập nhật ngân sách; Test C8–C15, D1–D5; E2E luồng 1, 3 |

**Nghiệm thu:** một luồng học đầy đủ chạy xuyên suốt; score server-side; note riêng tư; retry/double-submit không tạo dữ liệu sai.

## Phase 5 — Dự án, lộ trình và tương tác

| ID | Task |
|---|---|
| P5.1 | Learning paths: editor (admin/giảng viên được cấp), DAG check, trang public, tham gia/dừng, tiến độ hợp tập |
| P5.2 | Project assignment + rubric editor; nộp link; tự đánh giá; vòng nộp ≤ maxRounds; giảng viên chấm/yêu cầu sửa |
| P5.3 | Hồ sơ thành quả riêng tư + public opt-in theo từng mục; `/u/[handle]` cache theo tag |
| P5.4 | Hỏi đáp theo bài (phân trang, accept, helpful, sửa/xóa, rate limit) |
| P5.5 | Review khóa học + aggregate + reconcile |
| P5.6 | Báo cáo nội dung + hàng moderation admin |
| P5.7 | Test D6–D11 |

**Nghiệm thu:** các feature khác biệt chạy bằng dữ liệu thật; không lộ note/email/submission riêng.

## Phase 6 — Hoàn thiện và chuẩn bị vận hành

| ID | Task |
|---|---|
| P6.1 | Admin: user/role/status, categories, featured, paths, audit viewer (phân trang), thống kê aggregate |
| P6.2 | Quota/media dashboard đầy đủ, orphan UI có bản xem trước, retention scripts (quizVersions, auditLogs) |
| P6.3 | Xuất ghi chú Markdown |
| P6.4 | Accessibility pass (bàn phím, focus, tương phản, nhãn), responsive mobile/desktop |
| P6.5 | Review cache/query/index (`explain` các truy vấn chính), giới hạn ghi tiến độ |
| P6.6 | CSP kiểm chứng thật; security regression toàn bộ TEST_PLAN; E2E đầy đủ |
| P6.7 | README, DEPLOYMENT.md (hosting, Atlas network access, env), RUNBOOK.md (provider lỗi, gần quota, lộ secret, orphan, suspend, rollback), backup/restore thủ công |
| P6.8 | Đối chiếu ma trận feature (PRD §5) với màn hình/service/test; liệt kê giới hạn còn lại |

**Nghiệm thu:** feature matrix đối chiếu đủ; check chạy có bằng chứng; giới hạn còn lại nêu cụ thể. Deploy/public chỉ khi chủ dự án yêu cầu.

## Rủi ro chính và cách giảm

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| next-auth v5 beta chỉ bảo trì bảo mật | Lỗ hổng/không tương thích Next 17 | Pin exact, bọc trong `server/auth`, kế hoạch thoát (ADR-002) |
| Chi phí xử lý video Cloudinary chưa rõ | Hết credits sớm | Thí nghiệm P3.1 trước khi upload hàng loạt |
| Không có hard cap bandwidth | Tài khoản Cloudinary có thể bị khóa | Ngân sách 18/25, kill switch, nhóm thử kiểm soát |
| Atlas Free 100 ops/s, không backup | Throttle, mất dữ liệu | Autosave thưa, rate limit; export thủ công định kỳ (RUNBOOK) |
| Transaction trên Atlas Free chưa xác nhận | Publish/finalize không nguyên tử | Test thật ở P1.4; dự phòng state machine + reconcile |
| Cache Components + dữ liệu cá nhân | Lộ dữ liệu chéo user | Quy tắc "không đọc cookie trong `'use cache'`" + test C1 |
| Vercel Hobby giới hạn thương mại/CPU | Không được deploy hoặc bị chặn 30 ngày | Xác nhận điều khoản trước khi deploy; đo CPU |
