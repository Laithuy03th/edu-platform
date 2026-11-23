# PRD — Nền tảng học trực tuyến (tên tạm: **Tự Học**)

> Nguồn gốc: [PROMPT_CLAUDE_LMS_NEXTJS.md](../PROMPT_CLAUDE_LMS_NEXTJS.md) (đặc tả chính thức). Tài liệu này tóm tắt và chốt phạm vi; khi có mâu thuẫn, đặc tả gốc thắng trừ khi chủ dự án đã duyệt thay đổi.
> Trạng thái: **Phase 0 — chờ duyệt** (2026-11-23).

## 1. Tóm tắt sản phẩm

Nền tảng học theo khóa học và lộ trình, kết hợp bài đọc, video ngắn, quiz và bài tập dự án có rubric. Chạy ở **quy mô demo có kiểm soát** trên gói miễn phí (MongoDB Atlas Free, Cloudinary Free, hosting free), đo usage thật thay vì hứa miễn phí không giới hạn.

Điểm khác biệt:

1. Ghi chú theo bài và **timestamp video** (click để seek).
2. **Ôn tập câu sai** theo lịch quy tắc 1–3–7–14 ngày + **tự đánh giá mức độ hiểu** (tách khỏi "đã hoàn thành").
3. **Bài tập dự án có rubric** + **hồ sơ thành quả** opt-in.
4. **Đánh giá đầu vào** gợi ý chương cần học theo rule minh bạch.
5. **Lộ trình theo mục tiêu**.
6. **Chế độ tiết kiệm dữ liệu** (không preload/autoplay, hiển thị dung lượng trước khi phát).

## 2. Ràng buộc đã xác nhận

| Ràng buộc | Giá trị |
|---|---|
| Framework | Next.js 16.4 App Router, một repo, modular monolith, TypeScript strict |
| Dữ liệu có cấu trúc | MongoDB Atlas (driver chính thức + Zod) |
| Ảnh/video | Cloudinary (upload trực tiếp từ browser, signed) |
| Phiên đăng nhập | JWT session (JWE trong cookie HttpOnly), có thu hồi bằng `authVersion` |
| Đăng nhập | Email/mật khẩu (Argon2id) + Google OIDC |
| Ngôn ngữ UI | Tiếng Việt; timezone mặc định Asia/Ho_Chi_Minh; lưu UTC |
| Quy mô demo | 2 khóa học, ~20 video ≤ 20 MiB/≤ 5 phút, bài đọc + quiz |
| Chi phí | Không dùng dịch vụ trả phí, không nhập thẻ, không tự nâng gói |

## 3. Người dùng và vai trò

Vai trò là **tập quyền** (`roles: ('student' | 'instructor' | 'admin')[]`), mọi tài khoản luôn có `student`. Giảng viên vẫn học khóa khác bình thường.

| Persona | Mục tiêu chính |
|---|---|
| Khách | Xem catalog, chi tiết khóa, bài học thử, lộ trình; đăng ký tài khoản |
| Học viên | Đăng ký khóa, học/resume, ghi chú, quiz, ôn tập, lộ trình, nộp dự án, hỏi đáp, đánh giá, hồ sơ thành quả |
| Giảng viên (được duyệt) | Soạn khóa, upload media trong quota, quiz/rubric, phản hồi hỏi đáp & bài nộp, xem thống kê tổng hợp |
| Admin | Duyệt khóa, quản lý user/role/quota, kiểm duyệt nội dung, media/usage, audit |

Ma trận quyền chi tiết: [AUTH_SECURITY.md §6](AUTH_SECURITY.md#6-ma-trận-quyền-và-policy).

## 4. Phạm vi: MVP / Mở rộng / Ngoài phạm vi

"MVP" = đủ để chạy một luồng học xuyên suốt (hết Phase 4). "Mở rộng" **vẫn thuộc backlog bắt buộc** của dự án (Phase 5–6), không bị bỏ.

| Nhóm | MVP (Phase 1–4) | Mở rộng — vẫn làm (Phase 5–6) | Ngoài phạm vi hiện tại |
|---|---|---|---|
| Tài khoản | Đăng ký/đăng nhập email, xác minh email, quên/đổi mật khẩu, Google, liên kết Google, đăng xuất tất cả, hồ sơ cơ bản | Hủy liên kết Google, đặt mật khẩu cho tài khoản chỉ có Google, tùy chọn public profile | Đổi email, 2FA/passkey, upload avatar tùy ý |
| Khám phá | Trang chủ, catalog (tìm/lọc/sắp xếp/phân trang), chi tiết khóa, bài preview, SEO cơ bản | Lộ trình nổi bật trên trang chủ, sắp xếp theo đánh giá | Semantic search, Atlas Search |
| Enrollment | Đăng ký miễn phí idempotent, Khóa học của tôi | Admin thu hồi enrollment có lý do | Thanh toán, coupon, subscription |
| Authoring | Course/chapter/reading lesson CRUD, reorder nút lên/xuống, draft → pending → published/rejected, admin duyệt | Archived/Suspended đầy đủ UI, cảnh báo xóa nội dung có học viên | Đồng tác giả nhiều giảng viên |
| Media | Signed upload, reservation + quota, finalize, video lesson, data saver, usage snapshot thủ công, kill switch | Orphan cleanup UI, reconcile tự động, runbook | DRM, HLS nhiều rendition, transcode nặng |
| Học tập | Trang học, resume, tiến độ, hoàn thành, dashboard tiếp tục học | Mục tiêu tuần | Offline download, PWA |
| Quiz | Single-choice, chấm server, attempts có giới hạn, version | — | Nhiều dạng câu hỏi, AI sinh quiz |
| Khác biệt | Ghi chú timestamp, đánh giá đầu vào, ôn tập câu sai, mức độ hiểu | Xuất ghi chú Markdown | AI tutor, thuật toán ôn tập cá nhân hóa |
| Lộ trình | — | Learning path, tham gia/dừng, tiến độ tổng hợp, prerequisite rule | Cam kết việc làm |
| Dự án | — | Assignment + rubric, nộp link, tự đánh giá, phản hồi/yêu cầu sửa | Upload zip, chạy/chấm code |
| Tương tác | — | Hỏi đáp theo bài, review khóa học, báo cáo nội dung, moderation | Chat realtime, livestream |
| Thành quả | — | Hồ sơ thành quả riêng tư + public opt-in từng mục | Chứng chỉ kiểm định, leaderboard |
| Admin | Duyệt khóa, cấp quyền giảng viên, kill switch upload | Dashboard user/category/path/featured, moderation, quota/media, audit | Giả danh người dùng |
| Vận hành | Env validation, index script, seed text, CI lint/typecheck/test/build | E2E, runbook, deployment checklist, backup thủ công | Kubernetes, Redis, worker riêng |

## 5. Ma trận feature → phase → bằng chứng nghiệm thu

Cột "Màn hình", "Service" và "Test" sẽ được cập nhật dần ở [PROGRESS.md](PROGRESS.md) khi làm (Definition of Done mục 29).

| # | Feature (mục đặc tả) | Phase | Tiêu chí nghiệm thu chính |
|---|---|---|---|
| F01 | Đăng ký email/mật khẩu (§5.1) | 1 | Hash Argon2id, unique email chống race, xác minh email trước enrollment |
| F02 | Đăng nhập/đăng xuất, chặn open redirect (§5.2) | 1 | Lỗi chung, rate limit, `callbackUrl` chỉ nội bộ |
| F03 | Google OIDC + liên kết an toàn (§5.3) | 1 | Không tự gộp theo email; link cần đăng nhập + xác thực gần đây |
| F04 | Quên/đổi mật khẩu (§5.4) | 1 | Token hash, 30 phút, consume nguyên tử, thu hồi phiên |
| F05 | JWT + revoke `authVersion` (§6) | 1 | JWT cũ bị từ chối sau reset/đổi mật khẩu/đăng xuất tất cả/khóa tài khoản |
| F06 | Hồ sơ cơ bản (§5.5) | 1 | Không sửa được roles/status/emailVerified/authVersion |
| F07 | RBAC/ownership helper, rate limit (§4, §22) | 1 | Test truy cập chéo |
| F08 | Course/chapter/reading lesson authoring (§8.1) | 2 | Ownership theo chuỗi lesson→chapter→course |
| F09 | Duyệt & xuất bản (§8.2) | 2 | Instructor không tự publish qua API; draft không lộ |
| F10 | Catalog, tìm không dấu, lọc, chi tiết (§7.1) | 2 | Chỉ published; cache + invalidation khi duyệt |
| F11 | Enrollment idempotent (§7.2) | 2 | Double click không tạo trùng; khóa không published không mở enrollment |
| F12 | Seed text 2 khóa (§24.1) | 2 | Chạy lại không nhân đôi |
| F13 | Upload signed + reservation + quota (§16.2, §17) | 3 | Race reservation không vượt quota; client sửa metadata không qua finalize |
| F14 | Video lesson + delivery policy (§16.4) | 3 | Bài không preview cần enrollment trước khi cấp URL ký |
| F15 | Data saver (§16.5) | 3 | Không preload/autoplay; hiển thị dung lượng ước tính |
| F16 | Usage snapshot + kill switch (§17.3–17.4) | 3 | Usage cũ/lỗi → dừng cấp upload mới (fail-closed) |
| F17 | Resume/progress/completion (§9) | 4 | Không regression do event cũ; mẫu số đúng |
| F18 | Quiz cơ bản (§10.1) | 4 | Không lộ đáp án; chấm server; idempotent theo submissionId |
| F19 | Ghi chú timestamp (§11) | 4 | Riêng tư, seek đúng, XSS không thực thi |
| F20 | Đánh giá đầu vào (§10.2) | 4 | Gợi ý theo rule, không tự hoàn thành bài |
| F21 | Ôn tập câu sai (§12.1) | 4 | Lịch 1/3/7/14, phát hiện câu đã đổi version |
| F22 | Mức độ hiểu (§12.2) | 4 | Tách khỏi completion |
| F23 | Dashboard học viên (§9.3) | 4 | Tiếp tục học, quiz cần ôn, bài chưa hiểu |
| F24 | Learning paths (§13) | 5 | Không đếm trùng, xử lý mục bị gỡ |
| F25 | Project + rubric + feedback (§14.1) | 5 | Tổng điểm đúng; chỉ chủ/giảng viên/admin xem |
| F26 | Hồ sơ thành quả (§14.2) | 5 | Public chỉ lộ mục được chọn |
| F27 | Hỏi đáp theo bài (§15.1) | 5 | Không lấy nội dung bài riêng qua Q&A |
| F28 | Review khóa học (§15.2) | 5 | One-per-user, aggregate đúng khi sửa/ẩn |
| F29 | Báo cáo & moderation (§15, §18) | 5–6 | Admin ẩn có lý do + audit |
| F30 | Admin dashboard đầy đủ, quota/media, audit (§18) | 6 | Aggregate, không quét toàn bộ mỗi lần tải |
| F31 | Orphan cleanup/reconcile (§17.5) | 3 (dry-run) / 6 (UI) | Mặc định dry-run; không xóa asset còn tham chiếu |
| F32 | Xuất ghi chú Markdown (§11) | 6 | Chỉ ghi chú của chính user |
| F33 | Accessibility/responsive/security regression/E2E/CI/docs (§21–25) | 6 (+ liên tục) | Check có bằng chứng thực chạy |

## 6. Màn hình (theo §21.1)

Route dự kiến (tiếng Anh trong URL cho ổn định, nhãn UI tiếng Việt):

| Nhóm | Route |
|---|---|
| Public | `/`, `/courses`, `/courses/[slug]`, `/courses/[slug]/preview/[lessonId]`, `/paths`, `/paths/[slug]`, `/u/[handle]` (hồ sơ public) |
| Auth | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Học viên | `/dashboard`, `/my-courses`, `/learn/[courseSlug]/[lessonId]`, `/notes`, `/review` (ôn tập hôm nay), `/my-paths`, `/projects`, `/settings/profile`, `/settings/security`, `/settings/data` |
| Giảng viên | `/instructor`, `/instructor/courses`, `/instructor/courses/[id]` (editor), `/instructor/courses/[id]/lessons/[lessonId]`, `/instructor/courses/[id]/quizzes/[quizId]`, `/instructor/courses/[id]/projects/[assignmentId]`, `/instructor/submissions`, `/instructor/questions` |
| Admin | `/admin`, `/admin/users`, `/admin/instructor-applications`, `/admin/courses` (hàng duyệt), `/admin/categories`, `/admin/paths`, `/admin/moderation`, `/admin/media`, `/admin/audit` |

Trang cá nhân/admin: `robots: noindex`.

## 7. Nguyên tắc sản phẩm (không thương lượng)

- Không hứa chống gian lận, DRM, hay "video không thể bị sao chép".
- Không gọi lịch ôn tập là "AI cá nhân hóa"; không gọi kỹ năng là "chứng nhận".
- Không hiển thị ước tính (lượt xem còn lại, thời gian học) như cam kết chính xác.
- Nội dung/đánh giá demo được ghi rõ "demo".
- Người học không phải thấy thuật ngữ JWT/collection/credit.
