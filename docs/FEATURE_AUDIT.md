# FEATURE_AUDIT — đối chiếu 79 nhóm tính năng (PROMPT V2 §40)

Ngày kiểm tra: **2026-11-24**. Mỗi dòng ghi bằng chứng thật và trạng thái theo §31.1. Một tính năng không được ghi VERIFIED chỉ vì đã có UI, mock, seed hoặc API key.

## Cách đọc bảng

**Nguồn bằng chứng**

| Ký hiệu | Nguồn | Kết quả lần chạy này |
|---|---|---|
| **INT** | Vitest + MongoDB in-memory replica set 8.2.6 (thật, không mock DB) | `pnpm test` **97/97 pass** (10 file, gồm 5 test mới cho SEO/mail) |
| **E2E** | Playwright trên build production + MongoDB **cục bộ** đã seed | `pnpm test:e2e` **10/10 pass** (21,2 s), chạy lại sau các sửa đổi hôm nay |
| **ATLAS** | Quan sát trực tiếp trên Atlas `tuhoc_dev` (đếm/đọc, không ghi) | |
| **LIVE** | HTTP thật tới dev :3000 (Atlas) hoặc build production :3100 (Atlas, chỉ đọc) | |
| **MOCK** | Test có provider giả (Cloudinary) | |

**Trạng thái**

- **VERIFIED:** đã chạy cả luồng với DB thật (local replica set hoặc Atlas), dữ liệu đọc/ghi đúng và có kiểm tra quyền.
- **Cột Atlas:** ✓ nghĩa là đã quan sát được trên Atlas. "—" nghĩa là luồng chưa được chạy trên Atlas, chỉ đã chạy với DB cục bộ. Theo §31.2, không suy ra "Atlas pass" từ kết quả DB cục bộ.

**Tổng hợp** (79 ID):

| Trạng thái | Số ID | Danh sách |
|---|---|---|
| VERIFIED | 29 | A01, A03, A04, A06, A09, C01, C03, C04, C05, C06, L02, L03, L04, L06, L07, L08, L09, P02, P03, D02, U01, U05, S01, S02, S03, O01, O04, O05, O06 |
| IMPLEMENTED_UNVERIFIED | 12 | A02, A05, A07, A08, L05, L11, P01, D01, D03, M06, M07, S04 |
| PARTIAL | 15 | C02, L01, L12, M03, M04, T03, T08, U02, U03, U04, U06, S06, S07, O03, O07 |
| MOCK_ONLY | 3 | M01, M02, M08 |
| BLOCKED | 6 | M05, M09, S05, S08, S10, O02 |
| MISSING | 13 | L10, P04, P05, P06, T01, T02, T04, T05, T06, T07, T09, U07, S09 |
| DEFERRED | 1 | O08 (deploy chỉ khi chủ dự án yêu cầu) |

> Không công bố "% hoàn thành". Theo §31.1, nếu tính phần trăm thì phải công bố trọng số; tài liệu này không đặt trọng số. Bảng tổng hợp chỉ đếm theo trạng thái. Số liệu chính xác cho từng dòng nằm trong các bảng chi tiết bên dưới.

## A — Tài khoản, xác thực, phân quyền

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| A01 | Đăng ký, validate, email unique, Argon2id | `/register`, `modules/auth/service.registerUser` | INT A1 (hash Argon2id, không plaintext), A2 (2 request đồng thời → 1 user), mật khẩu ngắn bị từ chối; E2E-1 | VERIFIED | — | Đăng ký 1 tài khoản qua UI trên Atlas khi có SMTP |
| A02 | Xác minh email, resend cooldown, token một lần | `/verify-email`, `auth/service` | INT: token một lần, consume đồng thời; E2E-1 xác minh qua outbox file | IMPLEMENTED_UNVERIFIED | — | Cooldown của nút gửi lại chưa có test riêng; email thật bị chặn ở O02 |
| A03 | Login/logout, JWT cookie, hết hạn | `/login`, `server/auth/nextauth` | E2E-1 đăng nhập; INT hạn tuyệt đối 7 ngày; chống open redirect (unit) | VERIFIED | — | — |
| A04 | Reset/đổi mật khẩu thu hồi phiên | `/forgot-password`, `/reset-password`, `/settings/security` | INT: reset → JWT cũ bị từ chối; đổi mật khẩu cần mật khẩu hiện tại; đăng xuất mọi thiết bị | VERIFIED | — | — |
| A05 | Google login, verified email, linking an toàn | `server/auth/google-policy`, `/settings/security` | INT A11/A14 (6 ca policy). LIVE: provider `google` có mặt, redirect tới Google hợp lệ. **ATLAS: 1 `authAccounts` provider=google, user active, emailVerified, tạo 05:21** → callback + tạo user đã chạy thật | IMPLEMENTED_UNVERIFIED | ✓ (đăng nhập mới) | Thử thật: liên kết Google vào tài khoản mật khẩu, hủy liên kết, user bị khóa đăng nhập Google |
| A06 | Role, ownership, enrollment, user bị khóa | `courses/policy`, `viewer-core` | INT A7 (khóa user → từ chối dù JWT còn hạn), C4/A9, A10, C5, D11 | VERIFIED | — | — |
| A07 | Hồ sơ, timezone, cài đặt Google | `/settings/profile`, `/settings/security` | Allowlist field ở action (không sửa roles/status) | IMPLEMENTED_UNVERIFIED | — | E2E sửa hồ sơ; test hiển thị theo timezone |
| A08 | Xin làm giảng viên, admin duyệt, bootstrap admin | `settings/profile/forms.tsx`, `/admin/instructor-applications`, `pnpm admin:create` | Code có; chưa có test | IMPLEMENTED_UNVERIFIED | — | Integration test: nộp đơn → duyệt → có quyền giảng viên |
| A09 | Rate limit, CSRF/origin, validation, secret hygiene | `server/rate-limit.ts`, `server/request.ts`, `proxy.ts` (CSP) | INT A4 (Retry-After, key HMAC); unit A13 origin; A16: 0 secret trong `.next/static` | VERIFIED | — | — |

## C — Khóa học

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| C01 | Catalog: tìm, lọc, sắp xếp, phân trang | `/courses`, `courses/catalog` | INT C17 (allowlist query), C18 (tìm không dấu). LIVE: 200; trang vượt phạm vi → **404** (sửa hôm nay) | VERIFIED | ✓ (đọc) | Lọc theo technology/version/content type thuộc T01 |
| C02 | Overview: outcome, prerequisite, giảng viên | `/courses/[slug]` | LIVE Atlas 200 kèm mục lục, mục tiêu, kiến thức đầu vào | PARTIAL | ✓ | Thiếu version/environment và reviewer (V2 §36.3) |
| C03 | CRUD course/chapter/lesson, reorder | `/instructor/courses/[id]`, `courses/authoring` | INT C3/C4/A10 (revision cũ bị từ chối); E2E-2 tạo nháp | VERIFIED | — | — |
| C04 | Draft → review → publish/reject, revision | `/admin/courses/[id]`, `approveCourse` | INT C1–C3; E2E-2 duyệt → khóa xuất hiện công khai | VERIFIED | — | — |
| C05 | Archived/suspended, quyền học viên cũ | `courses/authoring` | INT C7 + bị đình chỉ thì mất quyền đọc | VERIFIED | — | — |
| C06 | Enrollment idempotent, "Khóa học của tôi" | `enrollments/service`, `/my-courses` | INT C6 (đăng ký đồng thời → 1 bản ghi, đếm 1 lần); E2E-1 | VERIFIED | — | — |

## L — Học tập

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| L01 | Workspace đọc/video, sidebar, trước/sau, focus mode | `/learn/[slug]/[lessonId]`, `learn-shell.tsx` | E2E-1 học bài đọc; có focus mode | PARTIAL | — | Phần video chưa thể kiểm tra vì chưa có asset (M09) |
| L02 | Resume, autosave có throttle, concurrency | `/api/progress`, `learning/progress` | INT C8 (event cũ không ghi đè), C9; E2E-1 resume | VERIFIED | — | Kiểm tra lại với video thật |
| L03 | Hoàn thành/tiến độ theo curriculum version | `learning/progress` | INT C10 (bài tùy chọn không tính mẫu số; thêm bài không thu hồi trạng thái hoàn thành) | VERIFIED | — | — |
| L04 | Quiz chấm server, giấu đáp án, attempt version | `/quiz/[id]`, `quizzes/service` | INT C11–C15; E2E-1 làm quiz | VERIFIED | — | — |
| L05 | Kiểm tra đầu vào, gợi ý theo rule | `/courses/[slug]/placement`, `quizzes/grading` | Unit cho rule D4 | IMPLEMENTED_UNVERIFIED | — | E2E: làm bài đầu vào → thấy gợi ý chương |
| L06 | Ghi chú riêng, timestamp, tìm, seek | `/notes`, `notes/service` | INT D1 (chỉ chủ sở hữu; tìm không dấu, escape regex); E2E-1 tạo ghi chú | VERIFIED | — | Seek theo timestamp cần video thật |
| L07 | Ôn câu sai, lịch ôn, chống nộp đôi | `/review`, `review/*` | INT D3 | VERIFIED | — | — |
| L08 | Mức độ hiểu tách khỏi hoàn thành | trang học, dashboard | INT D5 | VERIFIED | — | — |
| L09 | Lộ trình, prerequisite, tiến độ | `/paths`, `learning-paths` | INT D8/D9 (không đếm trùng, phát hiện vòng lặp, mục bị gỡ); LIVE 200 | VERIFIED | ✓ (đọc) | Milestone/capstone theo nghề (§32.3) |
| L10 | Bookmark | — | Không có code | MISSING | — | Collection `bookmarks` unique(userId, target) |
| L11 | Xuất ghi chú Markdown | `/api/notes/export` | Chỉ thử thủ công | IMPLEMENTED_UNVERIFIED | — | Test scope theo user |
| L12 | Mục tiêu tuần/streak | dashboard (`WEEKLY_GOAL` là hằng số) | Có vòng tiến độ tuần | PARTIAL | — | P2: cho người học tự đặt mục tiêu; không gây áp lực |

## P — Dự án và thực hành

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| P01 | Đề dự án, starter, checklist, rubric | `/instructor/courses/[id]/projects/...` | Seed có 1 dự án kèm rubric 4 tiêu chí | IMPLEMENTED_UNVERIFIED | ✓ (seed) | Starter repo thật cho dự án |
| P02 | Nộp bài, tự đánh giá, nộp lại, phản hồi | `/projects/[id]`, `/instructor/submissions` | INT D6 (các vòng nộp, chấm rubric, người lạ không xem được) | VERIFIED | — | — |
| P03 | Hồ sơ thành quả opt-in | `/achievements`, `/u/[handle]` | INT D7; LIVE `/u/khong-co` → 404 | VERIFIED | — | — |
| P04 | Đọc code, tìm lỗi, hints, lời giải có version | — | Không có loại bài tập này | MISSING | — | Thêm loại exercise (§34.1) |
| P05 | Playground HTML/CSS/JS cách ly | — | — | MISSING | — | P2, sau khi có thiết kế sandbox |
| P06 | Python/SQL chạy trên trình duyệt | — | — | MISSING | — | Roadmap |

## D — Thảo luận và đánh giá

| ID | Yêu cầu | Bằng chứng | Trạng thái | Việc tiếp |
|---|---|---|---|---|
| D01 | Hỏi đáp theo bài, chấp nhận câu trả lời | INT D11 (chỉ quyền đọc/viết) | IMPLEMENTED_UNVERIFIED | Test chấp nhận/bỏ chấp nhận câu trả lời, sửa/xóa |
| D02 | Review: điều kiện, unique, aggregate | INT D10 (một user một review; không tự review; aggregate đúng khi sửa/ẩn) | VERIFIED | — |
| D03 | Báo cáo/kiểm duyệt | `/admin/moderation`; báo cáo idempotent | IMPLEMENTED_UNVERIFIED | Test kiểm duyệt; báo lỗi **nội dung bài** thuộc T06 |

## M — Media (chi tiết trong [MEDIA_AUDIT.md](MEDIA_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| M01 | Reservation, signed upload, quota đồng thời | MOCK_ONLY | INT M1/M2/M11 với provider giả |
| M02 | Finalize/webhook, idempotent | MOCK_ONLY | INT M3/M4; chưa nhận webhook thật |
| M03 | Ảnh bìa/nội dung, alt, license, rendition | PARTIAL | 0 ảnh thật; thiếu field alt/license |
| M04 | Player, poster, tốc độ, resume, caption, chương | PARTIAL | Dùng controls gốc của trình duyệt, có transcript; thiếu `<track>` và chương |
| M05 | Delivery policy đã kiểm chứng trên tài khoản | BLOCKED | Cần M09 |
| M06 | Data saver, preload/autoplay, UI lỗi media | IMPLEMENTED_UNVERIFIED | Code có `preload="none"`, không autoplay; chưa có video để thử |
| M07 | Usage dashboard, độ tươi, cảnh báo, kill switch | IMPLEMENTED_UNVERIFIED | Usage API **thật** OK (2 snapshot trên Atlas); fail-closed đã test với mock (M8); kill switch chưa thử thật |
| M08 | Orphan, theo dõi tham chiếu, cleanup dry-run | MOCK_ONLY | INT M7 |
| M09 | Ca thử nhỏ qua UI, có bằng chứng | BLOCKED | Cần chủ dự án cho phép và cung cấp 1 video nhỏ |

## T — Taxonomy và nội dung IT (chi tiết trong [CONTENT_COVERAGE.md](CONTENT_COVERAGE.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| T01 | Taxonomy domain/topic/technology/type/version | MISSING | Chỉ có `categories` (3 bản ghi, một chiều) |
| T02 | Technology hub, ánh xạ course/reference/project | MISSING | |
| T03 | Prerequisite/concept graph, alias tìm kiếm | PARTIAL | Có prerequisite và chống vòng lặp cho lộ trình; chưa có concept graph và alias |
| T04 | Environment recipe theo OS | MISSING | |
| T05 | Template article/reference/cheatsheet/troubleshooting | MISSING | Hiện chỉ có lesson trong course |
| T06 | Author/reviewer/testedVersion, báo lỗi nội dung | MISSING | |
| T07 | Code: copy, highlight, output, smoke check | MISSING | Code block hiện chỉ là `<pre>` thường |
| T08 | Bản đồ độ phủ published/reviewed/planned | PARTIAL | Đã có tài liệu thủ công [CONTENT_COVERAGE.md](CONTENT_COVERAGE.md); chưa có màn admin |
| T09 | Bản đồ nhiều mảng IT, không public placeholder | MISSING | Đúng là chưa có trang placeholder nào; nhưng cũng chưa có màn roadmap |

## U — Giao diện (chi tiết trong [UI_AUDIT.md](UI_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| U01 | Token đỏ nhạt, font, spacing, component | VERIFIED | Token trùng bảng §36.2; tương phản đo hôm nay đạt AA cho chữ |
| U02 | Home, hero, nav, footer | PARTIAL | Thiếu điều hướng theo mảng IT và technology hub |
| U03 | Layout catalog/course/technology/tutorial/project | PARTIAL | Có catalog và course; chưa có technology/tutorial/reference |
| U04 | Learning, dashboard, instructor, admin | PARTIAL | Có đủ màn; chưa có screenshot audit cho admin/learning ở cả 3 viewport |
| U05 | Motion và reduced motion | VERIFIED | LIVE: tắt JS hoặc bật reduce → 0 phần tử chữ bị ẩn, 0 animation chạy |
| U06 | Mobile/tablet/desktop, bàn phím, focus, contrast, states | PARTIAL | Không tràn ngang ở 375/1440; thứ tự Tab đúng và có focus ring; chưa test zoom 200% và touch |
| U07 | Dark theme | MISSING | P2 |

## S — SEO (chi tiết trong [SEO_AUDIT.md](SEO_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| S01 | Rendering, status code, indexability | VERIFIED | **Sửa hôm nay:** slug không tồn tại trước trả 200, nay trả 404 (kể cả với Googlebot) |
| S02 | Title, description, OG, canonical | VERIFIED | Canonical tuyệt đối nhờ `metadataBase` (sửa hôm nay); vẫn thiếu OG image |
| S03 | Sitemap, robots, noindex, chính sách filter/pagination | VERIFIED | Trang có filter → `noindex,follow`; trang phân trang canonical về chính nó; lastmod = ngày xuất bản |
| S04 | Structured data | IMPLEMENTED_UNVERIFIED | Thêm hôm nay: Organization, WebSite, Course, BreadcrumbList. Chưa chạy Rich Results Test (cần URL public) |
| S05 | Trang xem video, image SEO | BLOCKED | Chưa có media |
| S06 | Internal link, breadcrumb, hub, redirect khi đổi slug | PARTIAL | Có breadcrumb JSON-LD; thiếu breadcrumb hiển thị, hub và lịch sử slug |
| S07 | Core Web Vitals | PARTIAL | Đã đo lab; chưa có dữ liệu field vì site chưa public |
| S08 | Search Console | BLOCKED | Chưa có domain/deploy |
| S09 | Cụm nội dung, tác giả, quy trình review | MISSING | |
| S10 | Đo lường organic | BLOCKED | Chưa public |

## O — Vận hành

| ID | Yêu cầu | Trạng thái | Atlas | Ghi chú |
|---|---|---|---|---|
| O01 | Schema, index, connection, seed | VERIFIED | ✓ | `db:indexes` (29 collection) và `db:seed` idempotent chạy trên Atlas; data+index 1,58 MiB |
| O02 | SMTP gửi thật | **BLOCKED** | — | `.env`: SMTP_HOST/PORT/SECURE/USER/PASSWORD và MAIL_FROM **trống cả 6**. Hôm nay đã sửa lỗi chọn transport và thêm `pnpm mail:check` (xem PROGRESS) |
| O03 | Admin: taxonomy, user, duyệt, quota, audit | PARTIAL | — | Taxonomy mới có categories |
| O04 | DTO riêng tư, tách cache, che log, retention | VERIFIED | — | INT C11 (DTO quiz), D1 (ghi chú), A16; `unstable_cache` chỉ dùng cho dữ liệu công khai |
| O05 | Unit/integration/E2E, CI | VERIFIED | — | 92 + 10 pass; workflow CI có nhưng **chưa chạy** vì repo chưa có remote |
| O06 | Docs, env, progress, runbook | VERIFIED | — | Cập nhật hôm nay |
| O07 | Tách dev/prod, backup/restore, cấu hình deploy | PARTIAL | — | Có hướng dẫn `mongodump`; **chưa thử restore**. Hôm nay thêm noindex khi không phải production |
| O08 | Deploy thật | DEFERRED | — | Chỉ làm khi chủ dự án yêu cầu |
