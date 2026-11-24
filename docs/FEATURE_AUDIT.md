| DEFERRED | 1 | O08 (deploy chỉ khi chủ dự án yêu cầu) |

Ngày kiểm tra: **2026-11-24**. Mỗi dòng ghi bằng chứng thật và trạng thái theo §31.1. Một tính năng không được ghi VERIFIED chỉ vì đã có UI, mock, seed hoặc API key.

## Cách đọc bảng

**Nguồn bằng chứng**

| Ký hiệu | Nguồn | Kết quả lần chạy này |
|---|---|---|
| **INT** | Vitest + MongoDB in-memory replica set 8.2.6 (thật, không mock DB) | `pnpm test` **117/117 pass** (17 file; cập nhật 2026-11-24 tối) |
| **E2E** | Playwright trên build production + MongoDB **cục bộ** đã seed | `pnpm test:e2e` **13/13 pass** (36,2 s, 2026-11-24 tối) |
| **ATLAS** | Quan sát trực tiếp trên Atlas `tuhoc_dev` (đếm/đọc, không ghi) | |
| **LIVE** | HTTP thật tới dev :3000 (Atlas) hoặc build production :3100 (Atlas, chỉ đọc) | |
| **MOCK** | Test có provider giả (Cloudinary) | |

**Trạng thái**

- **VERIFIED:** đã chạy cả luồng với DB thật (local replica set hoặc Atlas), dữ liệu đọc/ghi đúng và có kiểm tra quyền.
- **Cột Atlas:** ✓ nghĩa là đã quan sát được trên Atlas. "—" nghĩa là luồng chưa được chạy trên Atlas, chỉ đã chạy với DB cục bộ. Theo §31.2, không suy ra "Atlas pass" từ kết quả DB cục bộ.

**Tổng hợp** (79 ID):

| Trạng thái | Số ID | Danh sách |
|---|---|---|
| VERIFIED | 67 | A01, A02, A03, A04, A06, A07, A08, A09, C01, C02, C03, C04, C05, C06, L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12, P01, P02, P03, P04, P05, D01, D02, D03, M01, M03, M04, M05, M06, M07, M08, M09, T01, T02, T03, T04, T05, T06, T07, T08, T09, U01, U02, U03, U05, U07, S01, S02, S03, S04, S06, O01, O03, O04, O05, O06, O07 |
| IMPLEMENTED_UNVERIFIED | 2 | A05, O02 |
| PARTIAL | 6 | P06, M02, U04, U06, S07, S09 |
| MOCK_ONLY | 0 | — |
| BLOCKED | 3 | S05, S08, S10 (cần URL public/Search Console/dữ liệu tìm kiếm thật) |
| MISSING | 0 | — |
| DEFERRED | 1 | O08 (deploy chỉ khi chủ dự án yêu cầu) |

> Không công bố "% hoàn thành". Theo §31.1, nếu tính phần trăm thì phải công bố trọng số; tài liệu này không đặt trọng số. Bảng tổng hợp chỉ đếm theo trạng thái. Số liệu chính xác cho từng dòng nằm trong các bảng chi tiết bên dưới.

## A — Tài khoản, xác thực, phân quyền

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| A01 | Đăng ký, validate, email unique, Argon2id | `/register`, `modules/auth/service.registerUser` | INT A1 (hash Argon2id, không plaintext), A2 (2 request đồng thời → 1 user), mật khẩu ngắn bị từ chối; E2E-1 | VERIFIED | — | Đăng ký 1 tài khoản qua UI trên Atlas khi có SMTP |
| A02 | Xác minh email, resend cooldown, token một lần | `/verify-email`, `auth/service` | INT: token một lần, consume đồng thời; E2E-1 xác minh qua outbox file | VERIFIED | — | Cooldown của nút gửi lại chưa có test riêng; email thật bị chặn ở O02 | INT 2026-11-24: gửi lại ngay sau đăng ký → RATE_LIMITED; đã xác minh → INVALID_STATE; token dùng lại bị từ chối. Thư thật: xem O02 |
| A03 | Login/logout, JWT cookie, hết hạn | `/login`, `server/auth/nextauth` | E2E-1 đăng nhập; INT hạn tuyệt đối 7 ngày; chống open redirect (unit) | VERIFIED | — | — |
| A04 | Reset/đổi mật khẩu thu hồi phiên | `/forgot-password`, `/reset-password`, `/settings/security` | INT: reset → JWT cũ bị từ chối; đổi mật khẩu cần mật khẩu hiện tại; đăng xuất mọi thiết bị | VERIFIED | — | — |
| A05 | Google login, verified email, linking an toàn | `server/auth/google-policy`, `/settings/security` | INT A11/A14 (6 ca policy). LIVE: provider `google` có mặt, redirect tới Google hợp lệ. **ATLAS: 1 `authAccounts` provider=google, user active, emailVerified, tạo 05:21** → callback + tạo user đã chạy thật | IMPLEMENTED_UNVERIFIED | ✓ (đăng nhập mới) | Thử thật: liên kết Google vào tài khoản mật khẩu, hủy liên kết, user bị khóa đăng nhập Google |
| A06 | Role, ownership, enrollment, user bị khóa | `courses/policy`, `viewer-core` | INT A7 (khóa user → từ chối dù JWT còn hạn), C4/A9, A10, C5, D11 | VERIFIED | — | — |
| A07 | Hồ sơ, timezone, cài đặt Google | `/settings/profile`, `/settings/security` | Allowlist field ở action (không sửa roles/status) | VERIFIED | — | E2E sửa hồ sơ; test hiển thị theo timezone | INT: múi giờ sai bị từ chối, hợp lệ được lưu, roles không đổi; tiết kiệm dữ liệu lưu qua UI thật (M06) |
| A08 | Xin làm giảng viên, admin duyệt, bootstrap admin | `settings/profile/forms.tsx`, `/admin/instructor-applications`, `pnpm admin:create` | Code có; chưa có test | VERIFIED | — | Integration test: nộp đơn → duyệt → có quyền giảng viên | INT `workflows.test.ts`: nộp trùng bị chặn, học viên không duyệt được, admin duyệt → có role instructor, không duyệt lại |
| A09 | Rate limit, CSRF/origin, validation, secret hygiene | `server/rate-limit.ts`, `server/request.ts`, `proxy.ts` (CSP) | INT A4 (Retry-After, key HMAC); unit A13 origin; A16: 0 secret trong `.next/static` | VERIFIED | — | — |

## C — Khóa học

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| C01 | Catalog: tìm, lọc, sắp xếp, phân trang | `/courses`, `courses/catalog` | INT C17 (allowlist query), C18 (tìm không dấu). LIVE: 200; trang vượt phạm vi → **404** (sửa hôm nay) | VERIFIED | ✓ (đọc) | Lọc theo technology/version/content type thuộc T01 |
| C02 | Overview: outcome, prerequisite, giảng viên | `/courses/[slug]` | LIVE Atlas 200 kèm mục lục, mục tiêu, kiến thức đầu vào | VERIFIED | ✓ | Trang khóa: mục tiêu, kiến thức đầu vào, công nghệ + phiên bản đã kiểm thử, "Cập nhật nội dung", trạng thái review chuyên môn, khối "Chuẩn bị môi trường" (bài recipe cùng công nghệ) — LIVE :3200 Atlas |
| C03 | CRUD course/chapter/lesson, reorder | `/instructor/courses/[id]`, `courses/authoring` | INT C3/C4/A10 (revision cũ bị từ chối); E2E-2 tạo nháp | VERIFIED | — | — |
| C04 | Draft → review → publish/reject, revision | `/admin/courses/[id]`, `approveCourse` | INT C1–C3; E2E-2 duyệt → khóa xuất hiện công khai | VERIFIED | — | — |
| C05 | Archived/suspended, quyền học viên cũ | `courses/authoring` | INT C7 + bị đình chỉ thì mất quyền đọc | VERIFIED | — | — |
| C06 | Enrollment idempotent, "Khóa học của tôi" | `enrollments/service`, `/my-courses` | INT C6 (đăng ký đồng thời → 1 bản ghi, đếm 1 lần); E2E-1 | VERIFIED | — | — |

## L — Học tập

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| L01 | Workspace đọc/video, sidebar, trước/sau, focus mode | `/learn/[slug]/[lessonId]`, `learn-shell.tsx` | E2E-1 học bài đọc; có focus mode | VERIFIED | — | Workspace đọc + video thật (13 bài video): phát, resume, mục lục video, tốc độ, ghi chú, bài tập đọc code, báo lỗi; E2E-1 bài đọc |
| L02 | Resume, autosave có throttle, concurrency | `/api/progress`, `learning/progress` | INT C8 (event cũ không ghi đè), C9; E2E-1 resume | VERIFIED | — | Kiểm tra lại với video thật |
| L03 | Hoàn thành/tiến độ theo curriculum version | `learning/progress` | INT C10 (bài tùy chọn không tính mẫu số; thêm bài không thu hồi trạng thái hoàn thành) | VERIFIED | — | — |
| L04 | Quiz chấm server, giấu đáp án, attempt version | `/quiz/[id]`, `quizzes/service` | INT C11–C15; E2E-1 làm quiz | VERIFIED | — | — |
| L05 | Kiểm tra đầu vào, gợi ý theo rule | `/courses/[slug]/placement`, `quizzes/grading` | Unit cho rule D4 | VERIFIED | — | E2E: làm bài đầu vào → thấy gợi ý chương | INT: tạo → xuất bản → học viên làm; payload không có đáp án/giải thích; chủ đề dưới ngưỡng → học trước, đạt → ôn nhanh |
| L06 | Ghi chú riêng, timestamp, tìm, seek | `/notes`, `notes/service` | INT D1 (chỉ chủ sở hữu; tìm không dấu, escape regex); E2E-1 tạo ghi chú | VERIFIED | — | Seek theo timestamp cần video thật |
| L07 | Ôn câu sai, lịch ôn, chống nộp đôi | `/review`, `review/*` | INT D3 | VERIFIED | — | — |
| L08 | Mức độ hiểu tách khỏi hoàn thành | trang học, dashboard | INT D5 | VERIFIED | — | — |
| L09 | Lộ trình, prerequisite, tiến độ | `/paths`, `learning-paths` | INT D8/D9 (không đếm trùng, phát hiện vòng lặp, mục bị gỡ); LIVE 200 | VERIFIED | ✓ (đọc) | Milestone/capstone theo nghề (§32.3) |
| L10 | Bookmark | `modules/bookmarks`, `/saved`, nút Lưu ở khóa/bài | INT `bookmarks.test.ts`: lưu song song → 1 bản ghi, bỏ lưu idempotent, chỉ nội dung công khai, khóa bị đình chỉ → không khả dụng, riêng tư theo user | VERIFIED | ✓ index | — |
| L11 | Xuất ghi chú Markdown | `/api/notes/export` | Chỉ thử thủ công | VERIFIED | — | Test scope theo user | INT: chỉ ghi chú của chính người xem, lọc theo khóa |
| L12 | Mục tiêu tuần/streak | dashboard (`WEEKLY_GOAL` là hằng số) | Có vòng tiến độ tuần | VERIFIED | — | Người học tự đặt mục tiêu tuần (mặc định không đặt, chỉ đếm bài); UI thật: đặt 3 → "0/3 bài hoàn thành", trả về không đặt; không streak/nhắc nhở gây áp lực |

## P — Dự án và thực hành

| ID | Yêu cầu | Route / code | Bằng chứng | Trạng thái | Atlas | Việc tiếp |
|---|---|---|---|---|---|---|
| P01 | Đề dự án, starter, checklist, rubric | `/instructor/courses/[id]/projects/...` | Seed có 1 dự án kèm rubric 4 tiêu chí | VERIFIED | ✓ (seed) | Starter repo thật cho dự án | INT: chỉ chủ khóa soạn, id tiêu chí rubric ổn định, đề chỉ công khai khi gắn vào bài và khóa được duyệt |
| P02 | Nộp bài, tự đánh giá, nộp lại, phản hồi | `/projects/[id]`, `/instructor/submissions` | INT D6 (các vòng nộp, chấm rubric, người lạ không xem được) | VERIFIED | — | — |
| P03 | Hồ sơ thành quả opt-in | `/achievements`, `/u/[handle]` | INT D7; LIVE `/u/khong-co` → 404 | VERIFIED | — | — |
| P04 | Đọc code, tìm lỗi, hints, lời giải có version | `modules/exercises`, khối "Luyện đọc code" ở trang học, soạn trong trình soạn bài | INT `exercises.test.ts`: payload không chứa đáp án/giải thích trước khi giải, chấm server, gợi ý từng mức, sửa → version mới; **UI thật trên Atlas**: sai → gợi ý → đúng → lời giải (không lộ trước khi nộp) | VERIFIED | ✓ 4 bài tập | Thêm bài tập cho các bài còn lại |
| P05 | Playground HTML/CSS/JS cách ly | — | — | VERIFIED | — | P2, sau khi có thiết kế sandbox | `/playground` + runner sandbox (origin opaque, CSP riêng); E2E `playground-theme.spec.ts`: cookie/parent → SecurityError, fetch bị chặn, while(true) tự dừng; nút "Chạy thử" ở khối code |
| P06 | Python/SQL chạy trên trình duyệt | — | — | PARTIAL | — | SQL: `/playground/sql` — SQLite WASM (sql.js 1.17, ~750 KB, chỉ tải khi mở trang) trong Web Worker, dữ liệu mẫu trong bộ nhớ, truy vấn > 3 s bị hủy và tạo lại DB; UI thật + E2E. Python (Pyodide > 10 MB): roadmap, chưa làm |

## D — Thảo luận và đánh giá

| ID | Yêu cầu | Bằng chứng | Trạng thái | Việc tiếp |
|---|---|---|---|---|
| D01 | Hỏi đáp theo bài, chấp nhận câu trả lời | INT D11 (chỉ quyền đọc/viết) | VERIFIED | Test chấp nhận/bỏ chấp nhận câu trả lời, sửa/xóa | INT: chỉ người hỏi chấp nhận/bỏ chấp nhận; chỉ giảng viên của khóa đánh dấu hữu ích |
| D02 | Review: điều kiện, unique, aggregate | INT D10 (một user một review; không tự review; aggregate đúng khi sửa/ẩn) | VERIFIED | — |
| D03 | Báo cáo/kiểm duyệt | `/admin/moderation`; báo cáo idempotent | VERIFIED | Test kiểm duyệt; báo lỗi **nội dung bài** thuộc T06 | INT: báo cáo idempotent; chỉ admin xem hàng đợi; ẩn → đóng báo cáo + audit |

## M — Media (chi tiết trong [MEDIA_AUDIT.md](MEDIA_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| M01 | Reservation, signed upload, quota đồng thời | VERIFIED | INT M1/M2/M11 (quota nguyên tử trên Mongo thật); **thật 2026-11-24: 16 upload có chữ ký lên Cloudinary qua `requestUpload`, quota nội bộ 7,97 MB, 7+6 video/khóa** ([MEDIA_AUDIT](MEDIA_AUDIT.md)) |
| M02 | Finalize/webhook, idempotent | PARTIAL | Finalize thật: tra Admin API, **phát hiện + sửa lỗi thiếu `duration`** (cần `media_metadata`), test hồi quy; webhook chưa nhận thật (cần URL công khai) |
| M03 | Ảnh bìa/nội dung, alt, license, rendition | VERIFIED | 2 ảnh bìa thật (1280×720, rendition cố định); thiếu field alt/caption/license cho ảnh trong bài | imageMeta (alt/chú thích/nguồn/giấy phép), chép Markdown có chú thích; khai báo thật cho 2 ảnh bìa qua UI; INT quyền + alt bắt buộc |
| M04 | Player, poster, tốc độ, resume, caption, chương | VERIFIED | Thật: poster eager, phát, resume (5→10→15 s), transcript. Thiếu `<track>` và chương | Thật: poster, phát, resume, mục lục video từ transcript (bấm → tua đúng mốc), tốc độ 0,75–2×; phụ đề WebVTT: build production + DB cục bộ với video Cloudinary thật → 1 track captions vi, 2 cue nạp đúng |
| M05 | Delivery policy đã kiểm chứng trên tài khoản | VERIFIED | Thật: bài thường `authenticated` + URL ký cho học viên đã đăng ký; khách → /login, không lộ URL; preview/ảnh `upload` công khai. URL ký không hết hạn (ADR-010) |
| M06 | Data saver, preload/autoplay, UI lỗi media | VERIFIED | Code có `preload="none"`, không autoplay; chưa có video để thử | UI thật trên Atlas: bật tiết kiệm dữ liệu → không có thẻ video tới khi bấm, hiện dung lượng ~0,5 MiB; tắt lại |
| M07 | Usage dashboard, độ tươi, cảnh báo, kill switch | VERIFIED | Usage API **thật** OK (2 snapshot trên Atlas); fail-closed đã test với mock (M8); kill switch chưa thử thật | UI thật: tắt cấp link phát → học viên thấy "Tạm dừng phát video", không có video, transcript vẫn đọc; bật lại → có video |
| M08 | Orphan, theo dõi tham chiếu, cleanup dry-run | VERIFIED | INT M7; thật: `pnpm media:cleanup` dry-run 0 orphan; asset bị từ chối đã bị xóa trên Cloudinary. Chưa thử xóa thật theo hàng đợi Thật: xóa ảnh thử qua UI giảng viên → Cloudinary không còn resource, DB `deleted`; `pnpm media:cleanup --apply` hàng đợi rỗng, orphan 0; INT M7 |
| M09 | Ca thử nhỏ qua UI, có bằng chứng | VERIFIED | Chủ dự án yêu cầu sinh media mẫu: 13 video + 2 ảnh lên Cloudinary thật; duyệt + phát qua UI. Upload đi qua hàm server trong script, **chưa qua nút upload trên trình duyệt** Thật qua **nút upload trên trình duyệt** (MediaUploader, giảng viên demo): 2 ảnh lên Cloudinary + finalize; trước đó 13 video + 2 ảnh qua cùng hàm server; phát/resume/kill switch/data saver qua UI |

## T — Taxonomy và nội dung IT (chi tiết trong [CONTENT_COVERAGE.md](CONTENT_COVERAGE.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| T01 | Taxonomy domain/topic/technology/type/version | VERIFIED | `technologies` (type × domain × alias, active/planned), admin `/admin/technologies`; INT `technologies.test.ts` (slug/alias không trùng, chỉ admin); Atlas: 35 công nghệ (8 active) |
| T02 | Technology hub, ánh xạ course/reference/project | VERIFIED | `/technologies`, `/technologies/[slug]`: chỉ tồn tại khi có khóa đã xuất bản; alias → 308; LIVE: 5 hub 200, `python` (planned) 404, `js` → `javascript`; INT hub biến mất khi khóa bị lưu trữ. Chưa có reference/project riêng (T05) |
| T03 | Prerequisite/concept graph, alias tìm kiếm | VERIFIED | Alias tìm kiếm **xong** (`?q=js`, `?tech=js`, INT); prerequisite + chống vòng lặp ở lộ trình; còn thiếu concept graph Alias tìm kiếm (INT) + đồ thị kiến thức nền giữa công nghệ (chặn tự tham chiếu/vòng lặp, INT); hub hiện Nên biết trước/Học tiếp — LIVE (Next.js ← React; JavaScript → React, Node.js…) |
| T04 | Environment recipe theo OS | VERIFIED | Loại bài `recipe` bắt buộc `testedOn` mới xuất bản; bài "Cài Node.js và tạo dự án Next.js trên Windows": đã chạy thật create-next-app (Next 16.4.6/React 19.3.0), dev (HTTP 200), build (exit 0) trên Windows 11; lệnh macOS/Linux ghi rõ **chưa chạy thử** |
| T05 | Template article/reference/cheatsheet/troubleshooting | VERIFIED | `articles` (draft/published + duyệt admin), `/huong-dan`, `/huong-dan/[slug]` (mục lục, anchor, code copy, breadcrumb, khóa/bài liên quan, TechArticle JSON-LD); INT `articles.test.ts`; 3 bài thật trên Atlas, cả 3 **chưa review chuyên môn** |
| T06 | Author/reviewer/testedVersion, báo lỗi nội dung | VERIFIED | `testedVersion` theo công nghệ của khóa (qua duyệt), **review chuyên môn** do admin ghi tên người thật, tự báo "đã đổi sau review"; `contentUpdatedAt` thật (INT). Thiếu: nút báo lỗi nội dung, reviewer theo từng bài | **Báo lỗi nội dung** → hộp thư `/instructor/issues` (INT `content-issues.test.ts`: chỉ giảng viên của khóa/admin, không lộ email, người báo thấy trạng thái). |
| T07 | Code: copy, highlight, output, smoke check | VERIFIED | shiki tô màu **ở server** (0 KB highlighter xuống client), nút sao chép, `title="file"`, khối ` ```output `; LIVE trên bài học thử. Thiếu smoke-check tự động cho snippet | `pnpm content:check`: phân tích cú pháp mọi khối js/ts/tsx/json đã xuất bản — Atlas 16 khối, 0 lỗi; bộ kiểm tra bắt đúng lỗi cố ý |
| T08 | Bản đồ độ phủ published/reviewed/planned | VERIFIED | Đã có tài liệu thủ công [CONTENT_COVERAGE.md](CONTENT_COVERAGE.md); chưa có màn admin | `/admin/coverage`: số liệu thật theo công nghệ + hàng đợi cần review/cập nhật; INT |
| T09 | Bản đồ nhiều mảng IT, không public placeholder | VERIFIED | Mục "Lộ trình nội dung" ở `/technologies` liệt kê công nghệ planned theo mảng, **không có link/trang riêng**, không vào sitemap (INT + LIVE) |

## U — Giao diện (chi tiết trong [UI_AUDIT.md](UI_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| U01 | Token đỏ nhạt, font, spacing, component | VERIFIED | Token trùng bảng §36.2; tương phản đo hôm nay đạt AA cho chữ |
| U02 | Home, hero, nav, footer | VERIFIED | Hero nhiều lớp (code tô màu ở server, thẻ quiz/ghi chú/rubric, chuỗi 5 bước), số liệu thật từ DB, dải công nghệ, tab mục tiêu (WAI-ARIA), khóa editorial, showcase dự án thật, banner thông báo do admin quản lý; screenshot 375/1440 |
| U03 | Layout catalog/course/technology/tutorial/project | VERIFIED | Catalog, trang khóa, hub công nghệ, hướng dẫn/tham khảo, playground, trang dự án của người học (đề, yêu cầu, rubric đạt/chưa đạt, checklist, nộp + tự đánh giá) — screenshot 1440; quét tràn ngang 320–1440 |
| U04 | Learning, dashboard, instructor, admin | PARTIAL | Có đủ màn; chưa có screenshot audit cho admin/learning ở cả 3 viewport |
| U05 | Motion và reduced motion | VERIFIED | LIVE: tắt JS hoặc bật reduce → 0 phần tử chữ bị ẩn, 0 animation chạy |
| U06 | Mobile/tablet/desktop, bàn phím, focus, contrast, states | PARTIAL | Không tràn ngang ở 375/1440; thứ tự Tab đúng và có focus ring; chưa test zoom 200% và touch |
| U07 | Dark theme | VERIFIED | P2 | Sáng/Tối/Theo hệ thống, cookie + render server; E2E: chuyển và nhớ sau reload; screenshot trang chủ/khóa/dashboard ở chế độ tối |

## S — SEO (chi tiết trong [SEO_AUDIT.md](SEO_AUDIT.md))

| ID | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| S01 | Rendering, status code, indexability | VERIFIED | **Sửa hôm nay:** slug không tồn tại trước trả 200, nay trả 404 (kể cả với Googlebot) |
| S02 | Title, description, OG, canonical | VERIFIED | Canonical tuyệt đối; OG image: bìa khóa học cho trang khóa, `og-default.jpg` 1200×630 tĩnh cho trang khác; `summary_large_image` |
| S03 | Sitemap, robots, noindex, chính sách filter/pagination | VERIFIED | Trang có filter → `noindex,follow`; trang phân trang canonical về chính nó; lastmod = ngày xuất bản |
| S04 | Structured data | VERIFIED | Organization, WebSite, Course, TechArticle, BreadcrumbList; `pnpm seo:check` trên :3200: 17 URL sitemap đạt (JSON-LD parse + trường bắt buộc + không rating/giá giả + canonical tuyệt đối), 3 URL lạ → 404. Google Rich Results Test cần URL public (sau deploy) |
| S05 | Trang xem video, image SEO | BLOCKED | Chưa có media |
| S06 | Internal link, breadcrumb, hub, redirect khi đổi slug | VERIFIED | Breadcrumb hiển thị + JSON-LD ở bài viết/hub; hub ↔ khóa ↔ bài viết; **slugHistory + 308** cho bài viết (INT); khóa học chưa có lịch sử slug | slugHistory + 308 cho khóa học (trang khóa + trang học) và bài viết; INT chặn trùng slug/slug cũ; breadcrumb hiển thị + JSON-LD |
| S07 | Core Web Vitals | PARTIAL | Đã đo lab; chưa có dữ liệu field vì site chưa public |
| S08 | Search Console | BLOCKED | Chưa có domain/deploy |
| S09 | Cụm nội dung, tác giả, quy trình review | PARTIAL | Có công cụ: review chuyên môn theo phiên bản, hàng đợi cần review/cập nhật (/admin/coverage), báo lỗi nội dung. Còn: cần reviewer thật và cụm nội dung lớn hơn |
| S10 | Đo lường organic | BLOCKED | Chưa public |

## O — Vận hành

| ID | Yêu cầu | Trạng thái | Atlas | Ghi chú |
|---|---|---|---|---|
| O01 | Schema, index, connection, seed | VERIFIED | ✓ | `db:indexes` (29 collection) và `db:seed` idempotent chạy trên Atlas; data+index 1,58 MiB |
| O02 | SMTP gửi thật | IMPLEMENTED_UNVERIFIED | — | Gmail SMTP: đăng nhập OK, gửi 1 thư thử được chấp nhận (2026-11-24). Còn chạy luồng xác minh/reset bằng email thật |
| O03 | Admin: taxonomy, user, duyệt, quota, audit | VERIFIED | — | Admin: taxonomy + kiến thức nền, độ phủ nội dung, người dùng, đơn giảng viên (INT), duyệt khóa/bài viết qua UI, banner, media/quota + kill switch (UI thật), audit log |
| O04 | DTO riêng tư, tách cache, che log, retention | VERIFIED | — | INT C11 (DTO quiz), D1 (ghi chú), A16; `unstable_cache` chỉ dùng cho dữ liệu công khai |
| O05 | Unit/integration/E2E, CI | VERIFIED | — | 92 + 10 pass; workflow CI có nhưng **chưa chạy** vì repo chưa có remote |
| O06 | Docs, env, progress, runbook | VERIFIED | — | Cập nhật hôm nay |
| O07 | Tách dev/prod, backup/restore, cấu hình deploy | VERIFIED | — | Có hướng dẫn `mongodump`; **chưa thử restore**. Hôm nay thêm noindex khi không phải production | `pnpm db:backup` sao lưu Atlas (36 collection) → khôi phục vào Mongo cục bộ 36/36 khớp, kiểu dữ liệu đúng; DEPLOYMENT.md cho cấu hình deploy (chưa deploy — O08) |
| O08 | Deploy thật | DEFERRED | — | Chỉ làm khi chủ dự án yêu cầu |
