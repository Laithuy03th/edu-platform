# Quyết định kỹ thuật (ADR)

> Ngày kiểm chứng phiên bản: **2026-11-23**. Phiên bản lấy trực tiếp từ npm registry (`npm view <pkg> dist-tags`) và tài liệu chính thức. Trạng thái: **Đã áp dụng** (chủ dự án giao toàn quyền quyết định ngày 2026-11-23; các ADR ⚠️ chọn theo phương án đề xuất). Phiên bản đã khóa trong `pnpm-lock.yaml`.

## Bảng phiên bản dự kiến

Pin chính xác khi cài ở Phase 1 (commit `pnpm-lock.yaml`). Không nâng major ngoài phạm vi.

| Package | Phiên bản dự kiến | Ghi chú kiểm chứng |
|---|---|---|
| next | 16.4.6 | `latest` trên npm; `engines.node >=20.9.0` |
| react / react-dom | 19.3.x | peer của next: `^19.0.0` |
| typescript | **6.0.3** (không dùng 7.0.2) | `typescript-eslint@8.73.0` peer `typescript >=4.8.4 <6.1.0` → xem ADR-014 |
| next-auth | **5.0.0-beta.32** (pin exact) ⚠️ | dist-tag `beta`; `latest` vẫn là 4.24.15; peer `next ^14 \|\| ^15 \|\| ^16` |
| mongodb | 7.9.x | driver chính thức, v7 là "current" |
| zod | 4.6.x | |
| @node-rs/argon2 | 2.2.2 | binary dựng sẵn cho win32-x64, linux-x64-gnu/musl (không cần node-gyp) |
| cloudinary (Node SDK) | 2.11.0 | chỉ dùng phía server |
| nodemailer | 10.6.x | adapter SMTP |
| tailwindcss / @tailwindcss/turbopack | 4.3.3 | theo template create-next-app 16.4.6 |
| shadcn (CLI) | — (không dùng) | primitive tự viết theo phong cách shadcn — ADR-021 |
| react-hook-form | — (không dùng) | form dùng state cục bộ + Zod ở server là đủ; tránh dependency thừa |
| react-markdown / remark-gfm | 10.1.0 / 4.0.1 | không bật raw HTML |
| eslint / eslint-config-next | 10.x / 16.4.6 | eslint-config-next peer `eslint >=9` |
| prettier | 3.10.x | |
| vitest | 5.1.x | |
| @playwright/test | 1.65.x | next peer (optional) `^1.51.1` |
| mongodb-memory-server | 11.4.0 | chỉ devDependency, chạy replica set cho integration test |
| server-only | 0.0.1 | đánh dấu module chỉ chạy server |

Node.js: máy dev hiện có **v22.13.0**, pnpm **11.25.0**. Vercel hỗ trợ 22.x/24.x/26.x. Đặt `engines.node: ">=22.13 <27"` và cấu hình hosting dùng 22.x để giống môi trường dev (có thể nâng lên 24 LTS sau khi cả hai nơi cùng nâng).

---

## ADR-001 (sửa đổi Phase 1) — Next.js 16.4 App Router, KHÔNG bật Cache Components

- **Vấn đề:** Cần một ứng dụng duy nhất cho cả UI và backend, cache được catalog công khai mà không cache nhầm dữ liệu cá nhân.
- **Quyết định ban đầu (Phase 0):** bật `cacheComponents`. **Đã đổi khi triển khai:** tài liệu đi kèm Next 16.4 (`node_modules/next/dist/docs/.../authentication-with-cache-components.md`) yêu cầu mọi lần đọc session phải nằm sau `<Suspense>` và "reading cookies() outside a boundary is a build error". Ứng dụng này cá nhân hóa ở hầu hết trang (header đọc phiên ở mọi trang) và next-auth đọc cookie sâu bên trong thư viện → rủi ro lỗi build/regression cao, lợi ích prerender thấp.
- **Quyết định cuối:** `cacheComponents` tắt; mọi trang render động. Dữ liệu CÔNG KHAI duy nhất được cache bằng `unstable_cache` + tag (`catalog`, `paths`, `profile-handle:<handle>`, `admin-stats` 5 phút). Server Action làm thay đổi nội dung công khai gọi `updateTag(tag)` (hết hạn ngay, request sau chờ dữ liệu mới — đã sửa sau khi E2E phát hiện `revalidateTag(tag, "max")` phục vụ bản cũ một lần).
- **Quy tắc bắt buộc:** hàm đọc session/cookie không bao giờ nằm trong hàm được cache; cache key/tag không chứa dữ liệu nhạy cảm.
- Nguồn: https://nextjs.org/docs/app/getting-started/caching , tài liệu `updateTag`/`revalidateTag` trong `node_modules/next/dist/docs` (bản 16.4.6).

## ADR-002 ⚠️ — Thư viện xác thực: next-auth 5.0.0-beta.32 (bọc sau lớp `server/auth`)

- **Bằng chứng hiện trạng (2026-11-23):**
  - Mọi trang authjs.dev hiển thị "The Auth.js project is now part of Better Auth"; trang cài đặt dùng `npm install next-auth@beta`.
  - Bài "Auth.js security update: July 2026" (better-auth.com): v5 "still in beta and ships on the `beta` tag"; bản vá 5.0.0-beta.32 / 4.24.15 / @auth/core 0.41.3. Nhịp phát hành beta: beta.30 (10/2025) → beta.31 (04/2026) → beta.32 (07/2026) — chế độ bảo trì bảo mật.
  - Better Auth 1.7.27 hoạt động tích cực, **nhưng** khi cấu hình database thì session được lưu trong DB ("By default, Better Auth already stores sessions in the database"). Chế độ stateless chỉ bật khi **không** có database. Không tìm thấy tùy chọn "user trong DB + session chỉ trong cookie". Mặc định account linking tự liên kết khi provider xác nhận email — phải tắt (`disableImplicitLinking`).
- **Phương án:**
  1. **(Đề xuất) next-auth 5.0.0-beta.32, strategy `jwt`** — đáp ứng đúng đặc tả: JWT session (JWE, cookie HttpOnly), Credentials + Google, không cần adapter, không tự liên kết theo email (mặc định trả `OAuthAccountNotLinked`). Nhược điểm: beta, chỉ nhận vá bảo mật, chưa có cam kết hỗ trợ Next 17.
  2. **Better Auth 1.7 + MongoDB adapter** — được bảo trì tích cực, có sẵn verify email/reset password/link account/revoke session. Nhưng là **database session (opaque token)** + cookie cache → trái mục 2.2/6 của đặc tả; chỉ chọn nếu chủ dự án chấp nhận thay đổi yêu cầu.
  3. **Tự quản session bằng `jose` (JWE) + `openid-client` cho Google** — Next.js docs có gợi ý dùng jose cho session; giao thức OAuth/OIDC vẫn do thư viện chứng nhận xử lý. Nhiều code tự sở hữu hơn (cookie, CSRF cho route auth, callback).
- **Quyết định đề xuất:** Phương án 1, với điều kiện:
  - Pin exact `5.0.0-beta.32`; theo dõi GitHub advisories của `nextauthjs/next-auth`.
  - Mã ứng dụng **không** import `next-auth` trực tiếp ngoài `src/server/auth/*`. Phần còn lại chỉ dùng `getViewer()`, `requireViewer()`, `signInWithPassword()`, ... ⇒ đổi sang phương án 3 hoặc 2 chỉ chạm một thư mục.
  - Mọi kiểm tra thu hồi (authVersion/status) do code của ta làm trong DAL, không phụ thuộc thư viện.
  - Điều kiện kích hoạt kế hoạch thoát: có lỗ hổng không được vá trong 30 ngày, hoặc Next 17 phá tương thích.
- Nguồn: https://authjs.dev/getting-started/installation , https://authjs.dev/concepts/session-strategies , https://better-auth.com/blog/security-update-july-2026 , https://better-auth.com/docs/concepts/session-management , https://better-auth.com/docs/concepts/users-accounts

## ADR-003 — JWT session + kiểm tra `authVersion` mỗi request

- Phiên: idle timeout **8 giờ** rolling (`maxAge = 8h`, `updateAge = 1h`: token được phát lại khi dùng sau mỗi giờ) + **hạn tuyệt đối 7 ngày** tính từ lần đăng nhập (claim `lat` — login at; kiểm tra trong `jwt` callback và trong `getViewer()`).
- Claim tối thiểu: `sub` (userId), `av` (authVersion), `lat`, cùng `iat/exp/jti` do thư viện thêm. **Không** đưa role, email, tên, ảnh vào token.
- Mỗi request được bảo vệ: `getViewer()` (memo bằng React `cache()` trong phạm vi một request) đọc `users` theo `_id` với projection `{status, authVersion, roles, emailVerifiedAt}` → từ chối nếu user không tồn tại, `status !== 'active'` hoặc `authVersion !== token.av`.
- **Tradeoff:** Mỗi request bảo vệ tốn 1 truy vấn theo `_id` (index mặc định) → không stateless hoàn toàn; đổi lại thu hồi phiên có hiệu lực ngay request kế tiếp (độ trễ 0, không cache qua request).
- Proxy (`src/proxy.ts`) chỉ làm kiểm tra lạc quan: có cookie session hay không để redirect sớm. Không truy vấn DB, không phải lớp bảo vệ.

## ADR-004 — Argon2id với `@node-rs/argon2`

- **Lý do:** Có binary dựng sẵn cho Windows (dev) và linux-x64-gnu (Vercel), không cần toolchain build; API async không chặn event loop. `argon2` (node-gyp prebuild) là phương án thay thế.
- Tham số theo mức tối thiểu khuyến nghị của OWASP: `memoryCost = 19456 KiB (19 MiB)`, `timeCost = 2`, `parallelism = 1`, Argon2id, salt do thư viện sinh.
- **Đo thực tế (2026-11-24, `pnpm bench:argon2`, Windows 11 x64, Node 22.13, máy 16 nhân):** hash TB **17,2 ms**, verify TB **12,8 ms**. Giữ mức tối thiểu OWASP (không tăng) vì: (1) hosting serverless có CPU yếu hơn nhiều và Vercel Hobby giới hạn 4 CPU-giờ/tháng; (2) đăng nhập đã được rate limit trước khi hash. Cần đo lại trên hosting khi deploy; nếu < 50 ms có thể tăng `memoryCost` lên 46 MiB (`t=1`, cũng là mức OWASP).
- `@node-rs/argon2` nằm trong `serverExternalPackages` (đã build thành công).
- Cần thêm `@node-rs/argon2` vào `serverExternalPackages` nếu Next không tự xử lý (kiểm chứng khi build Phase 1).
- Nguồn: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## ADR-005 — Chuẩn hóa email và mật khẩu

- **Email:** `trim()` khoảng trắng hai đầu → Unicode NFC → `toLowerCase()` toàn bộ địa chỉ → lưu `emailNormalized` (unique index), giữ `email` hiển thị như người dùng nhập (đã trim). **Không** bỏ dấu chấm hay `+tag` của Gmail. Từ chối email có ký tự điều khiển, dài > 254 ký tự.
- **Mật khẩu:** không trim, không thay đổi ký tự. Áp dụng **Unicode NFC** nhất quán ở cả lúc đặt và lúc kiểm tra. Lý do: bộ gõ tiếng Việt (Telex/VNI trên macOS/iOS/Windows) có thể sinh dạng dựng sẵn (NFC) hoặc tổ hợp (NFD) cho cùng ký tự "ệ"; không chuẩn hóa sẽ khiến người dùng không đăng nhập được trên thiết bị khác. NIST SP 800-63B cũng khuyến nghị chuẩn hóa Unicode trước khi hash. Đây không phải "thay đổi âm thầm" vì hai chuỗi tương đương chính tắc được coi là một.
- Độ dài: 12–128 **code point** sau NFC, tối đa **1024 byte UTF-8** (chặn trước khi hash). Kiểm tra body size trước khi parse.

## ADR-006 — MongoDB driver chính thức + Zod, không dùng Mongoose

- Một lớp `repo` mỏng mỗi module dùng `Collection<TDoc>` có type; Zod validate input ở boundary (action/route) và `$jsonSchema` validator tối thiểu ở DB cho collection quan trọng (users, enrollments, mediaAssets) do script `db:indexes` tạo.
- Một `MongoClient` dùng lại toàn process (`globalThis` cache ở dev để tránh HMR tạo nhiều client), `maxPoolSize` nhỏ (mặc định đề xuất 5) vì Atlas Free giới hạn 500 kết nối.
- Không nhận filter/sort/projection thô từ client; mọi filter đi qua allowlist trong service.

## ADR-007 — Phiên bản nội dung: draft/published hai trường + quiz version bất biến

- **Course/Chapter/Lesson/ProjectAssignment** có `draft` (biên tập) và `published` (bản đã duyệt, `null` nếu chưa từng xuất bản hoặc bị gỡ khỏi bản công khai). Public/học viên chỉ đọc `published`; giảng viên/admin đọc `draft`.
- Duyệt = sao chép `draft → published` cho toàn bộ document của khóa trong **một transaction** và tăng `course.publishedVersion`. Tối đa 2 bản (draft + published) cho mỗi document → không lưu vô hạn bản sao.
- **Quiz:** `quizzes.draft.questions` (biên tập); khi xuất bản sinh document bất biến `quizVersions {quizId, version, questions(+answers)}`. Attempt trỏ `(quizId, version)`. Giữ quizVersion cũ khi còn attempt/reviewItem tham chiếu; script dọn xóa version không còn tham chiếu.
- **Tiến độ khi curriculum đổi:** tiến độ tính trên tập bài `required` của `published` hiện hành. Bài bị gỡ không còn trong tử số lẫn mẫu số. `enrollment.completedAt` + `completedVersion` được giữ khi khóa thêm bài mới; UI hiện "Đã hoàn thành phiên bản N — khóa có bài mới". Không thu hồi thành quả cũ.
- **Thay thế:** collection `courseRevisions` chứa snapshot toàn khóa — dễ audit nhưng nhân bản nội dung theo số lần xuất bản; bị loại vì ngân sách 300 MiB.

## ADR-008 — Gộp/tách collection có chủ đích

- `lessonUnderstanding` **gộp vào** `lessonProgress` (cùng khóa `userId+lessonId`, cùng vòng đời) → bớt một collection và một unique index.
- `projectFeedback` **nhúng** vào `projectSubmissions.rounds[]` (giới hạn cứng 5 vòng nộp) → mỗi vòng có bản nộp + đánh giá rubric; không tăng vô hạn.
- `quizQuestions` **nhúng** trong quiz/quizVersions (tối đa 30 câu/quiz).
- Thêm `categories` (cần cho bộ lọc catalog và quản trị) và `quizVersions` (ADR-007).

## ADR-009 — Pipeline upload Cloudinary

- Upload trực tiếp từ browser lên Cloudinary bằng **signed upload**; server chỉ ký bộ tham số do server tự quyết (`public_id`, `type`, `allowed_formats`, `overwrite=false`, `timestamp`, `tags`, `notification_url`, `eager` cố định). Chữ ký hợp lệ 1 giờ kể từ `timestamp`.
- **Finalize chính:** client gọi action `finalizeUpload(reservationId)` → server gọi **Admin API** lấy metadata thật (bytes, duration, format, resource_type, width/height) → đối chiếu reservation → transaction (reservation `consumed` + insert `mediaAssets` + cập nhật `quotaCounters`).
- **Finalize phụ:** webhook `notification_url` (xác minh `X-Cld-Signature` + `X-Cld-Timestamp`, lệch tối đa 2 giờ) chạy cùng hàm finalize idempotent — để bắt trường hợp người dùng đóng tab. Webhook cần URL công khai nên không dùng được ở localhost; khi đó script reconcile xử lý.
- Lý do không dựa vào trường `signature` trong upload response: tài liệu chính thức hiện không mô tả cách xác minh trường đó ở trang authentication_signatures → coi là không đủ bằng chứng.
- Chi tiết: [MEDIA_PIPELINE.md](MEDIA_PIPELINE.md).

## ADR-010 ⚠️ — Chính sách phát video trên gói Free

- Bằng chứng: kiểu `authenticated` yêu cầu signed URL cho cả bản gốc và bản dẫn xuất, **không cho transformation on-the-fly** (phải dùng eager). Signed delivery URL **không ngăn chia sẻ link** và tài liệu không nêu thời hạn mặc định. Token-based/cookie-based access cần **Advanced plan trở lên**. Kiểu `private` để lộ bản dẫn xuất công khai theo mặc định.
- **Đề xuất:** video bài thường (không preview) upload kiểu `authenticated`; server chỉ cấp signed URL cho người có quyền tại thời điểm yêu cầu. Video preview và ảnh bìa dùng kiểu `upload` (public).
- **Giới hạn nói thật:** URL đã cấp có thể bị chia sẻ và **không tự hết hạn**; tắt cấp URL mới không thu hồi URL cũ. Lợi ích thực tế: người ngoài không đoán/dựng được URL từ `public_id`, và catalog/HTML công khai không chứa URL video riêng.
- Phương án thay thế: (a) tất cả `upload` public — đơn giản nhất, phù hợp nội dung demo không nhạy cảm; (b) proxy video qua Next.js — bị loại (đặc tả cấm, tốn băng thông hosting 100 GB/tháng của Vercel Hobby).

## ADR-011 — Ảnh: kích thước cố định của Cloudinary, không dùng Vercel Image Optimization

- Triển khai: thẻ `<img loading="lazy">` với URL Cloudinary dựng ở server (`modules/media/urls.ts`), width ánh xạ về tập cố định `[320, 640, 960]` + `c_limit,f_auto,q_auto` → không tạo transformation vô hạn, không tốn quota tối ưu ảnh của hosting. (Không dùng `next/image` loader để tránh lớp tối ưu trùng lặp; rule `no-img-element` tắt có chủ đích.)
- Ảnh bìa chưa có → hoa văn CSS sinh từ tên khóa (không request ảnh).
- Bật **Strict transformations** trong Cloudinary Console nếu gói Free cho phép (kiểm chứng ở Phase 3) và dùng named transformation/eager cho các size cố định.
- Avatar bản đầu: chữ cái đầu hoặc ảnh Google (`lh3.googleusercontent.com`, chỉ hiển thị, không lưu lại trên Cloudinary).

## ADR-012 — Rate limit dùng MongoDB

- Collection `rateLimitBuckets`: fixed window, `findOneAndUpdate({key, windowStart}, {$inc: {count: 1}}, {upsert: true})`; TTL index trên `expiresAt`, logic vẫn so sánh thời gian.
- `key = HMAC-SHA256(RATE_LIMIT_SECRET, action + ":" + subject)`; subject là IP (đã chuẩn hóa) hoặc accountId/emailNormalized → không lưu IP thô.
- IP lấy từ header của hạ tầng đã cấu hình (`x-forwarded-for` chỉ khi `TRUST_PROXY=true` và chỉ lấy phần do proxy tin cậy thêm vào; trên Vercel dùng `x-real-ip`/`x-vercel-forwarded-for` — kiểm chứng khi deploy).
- Không khóa tài khoản vĩnh viễn; chỉ cooldown có `Retry-After`.

## ADR-013 — Tìm kiếm catalog không dấu

- Trường `published.searchText` = title + shortDescription → NFD → bỏ dấu tổ hợp → `đ→d` → lowercase. Text index `{ "published.searchText": "text" }` với `default_language: "none"` (không stemming). Query được chuẩn hóa giống hệt.
- Hành vi: khớp theo **từ nguyên vẹn**, không khớp tiền tố ("next" khớp "Next.js"? — tokenizer tách dấu chấm; viết test cụ thể). Không hứa semantic search.
- Ghi chú (`notes`) tìm bằng regex đã escape trên `contentNormalized` **sau khi** lọc `userId` (index `userId` dẫn đầu); số ghi chú/user bị giới hạn → quét bị chặn trên.

## ADR-014 — TypeScript 6.0.x thay vì 7.0

- `typescript@latest` = 7.0.2 (trình biên dịch native). `typescript-eslint@8.73.0` khai báo peer `typescript <6.1.0` → dùng 7 sẽ làm lint không ổn định. Chọn **6.0.3**, `strict: true`, `noUncheckedIndexedAccess: true`. Đánh giá lại khi typescript-eslint hỗ trợ 7.

## ADR-015 — Kiểm thử

- Vitest 5 cho unit + integration. Integration dùng `mongodb-memory-server` ở chế độ **replica set** (cần cho transaction) — không cần credentials, chạy được trên CI. Có guard: test runner từ chối chạy nếu `MONGODB_URI` trỏ tới host không phải localhost/memory server.
- Playwright cho E2E trọng yếu, chạy trên build production local, email qua adapter file.
- Test với Atlas/Cloudinary thật: script thủ công riêng (`test:provider`), không chạy trong CI mặc định.

## ADR-016 — Email qua adapter SMTP nhỏ

- Interface `sendMail({to, subject, text, html})` với 2 hiện thực: `smtp` (nodemailer) và `file` (ghi JSON vào `.data/mail/`, chỉ cho phép khi `APP_ENV` ∈ {development, test}; build production từ chối khởi động nếu chọn `file`).
- Nhà cung cấp gợi ý: Resend (SMTP relay có ở gói Free; 100 email/ngày, 3.000/tháng — theo resend.com/pricing ngày 2026-11-23) hoặc SMTP khác chủ dự án có sẵn. Thiếu cấu hình SMTP ở production → lỗi thiết lập rõ ràng, không giả lập gửi thành công.

## ADR-017 — Markdown an toàn

- Render bằng `react-markdown` + `remark-gfm`, **không** dùng `rehype-raw` → HTML trong Markdown hiển thị như text. `urlTransform` chỉ cho `http:`, `https:`, `mailto:` và đường dẫn nội bộ; ảnh chỉ cho phép từ domain Cloudinary của dự án (bài học) và bị tắt hoàn toàn trong hỏi đáp/ghi chú. Test stored XSS bắt buộc.

## ADR-018 — Hosting (chuẩn bị, chưa deploy)

- Ứng viên: **Vercel Hobby** (Node runtime, function tối đa 300 s, body 4,5 MB, 1 triệu invocation, 4 CPU-giờ active/tháng, cron tối thiểu 1 lần/ngày, vượt mức thì bị chặn tới khi qua 30 ngày — theo vercel.com/docs ngày 2026-11-23).
- ⚠️ Điều khoản Hobby về sử dụng thương mại không có trên trang docs đã đọc; cần chủ dự án xác nhận dự án là phi thương mại (xem câu hỏi mở). Deploy chỉ khi được yêu cầu.

## ADR-019 — Log có cấu trúc, không thêm thư viện

- Logger JSON nhỏ tự viết (`lib/logger.ts`) với redaction theo danh sách khóa (`password`, `token`, `secret`, `authorization`, `cookie`, `content` của notes...). RequestId sinh ở proxy (header `x-request-id`), đọc lại trong action/route qua `headers()`.
- Không dùng SaaS observability trả phí.

## ADR-020 — Hợp đồng lỗi thống nhất

- `AppError { code, status, message (an toàn, tiếng Việt), fieldErrors?, cause? }`. Server Action trả `ActionResult<T> = { ok: true, data } | { ok: false, error: { code, message, fieldErrors?, requestId } }`; Route Handler trả JSON cùng shape với HTTP status tương ứng (401/403/404/409/422/429/5xx).
- Lỗi không xác định → log đầy đủ server-side (đã redact) + trả `INTERNAL_ERROR` kèm requestId; không lộ stack/query.

## ADR-021 — Design system "đỏ nhạt ấm" không thêm thư viện UI/animation

- **Vấn đề:** Brief thiết kế yêu cầu nhận diện đỏ nhạt, nhiều animation tinh tế, component đầy đủ trạng thái, chỉnh màu toàn site từ một nơi, không biến cả app thành Client Components.
- **Quyết định:**
  - Token tập trung trong `src/app/globals.css` (`@theme` Tailwind 4): màu thương hiệu `brand-50…900` (`#FFF1F2` → `#FCA5A5` → CTA `#B91C1C`/hover `#991B1B`), nền `canvas #FFFAF9`, `surface #FFF`, chữ `ink #18181B`/`ink-soft #52525B`, viền `line #EADDDD`; màu ngữ nghĩa success/warning/danger/info **tách khỏi** màu thương hiệu; 3–4 mức radius; bóng ấm phân lớp; thang chữ `text-display/h1/h2/h3/caption`; token motion (`--duration-micro 160ms`, `--duration-ui 240ms`, `--duration-reveal 520ms`, easing `ease-out-soft`).
  - Font **Be Vietnam Pro** (thiết kế cho tiếng Việt) qua `next/font/google` → self-host lúc build, không request Google khi chạy.
  - Primitive tự viết theo phong cách shadcn/ui trong `src/components/ui.tsx` (server-safe, không hook) thay vì CLI shadcn + Radix: ít dependency, API đơn giản. Overlay client tối thiểu trong `overlays.tsx`: `Dialog`/`Drawer` dùng `<dialog>` native (focus trap + Escape có sẵn) với animation vào/ra bằng `@starting-style`; `ConfirmProvider/useConfirm` thay `window.confirm`; `ToastProvider`; `Tabs` có indicator chuyển động + điều hướng phím mũi tên.
  - Motion bằng CSS (opacity/transform). Hai component client rất nhỏ: `Reveal` (IntersectionObserver, reveal **một lần**, phần tử đã trong viewport không bị ẩn → không nhấp nháy, không JS vẫn hiển thị) và `PauseOffscreen` (dừng animation trang trí khi ngoài viewport/tab ẩn). `prefers-reduced-motion` tắt animation, nội dung vẫn đầy đủ (có E2E kiểm).
  - Hành động nguy hiểm: nút viền đỏ + icon cảnh báo + dialog xác nhận (nền `danger-700`), khác nút CTA thương hiệu (nền đặc `brand-700`).
- **Thay thế:** framer-motion/motion (≈ 30–50 KB, cần client component) — không cần cho các chuyển động hiện có; shadcn CLI + Radix — nhiều dependency cho số component nhỏ.
- **Tương phản đã kiểm:** trắng trên `brand-700` ≈ 6,5:1; `ink-soft` trên `canvas` ≈ 7,4:1; `ink-faint #6B6B73` trên `canvas` ≈ 4,7:1.

## ADR-022 — Ô mật khẩu

- `PasswordInput` (client): nút con mắt hiện/ẩn có `aria-label`/`aria-pressed`, cảnh báo Caps Lock, thước đo **độ dài** cho mật khẩu mới (≥ 12, khuyến khích cụm từ dài — theo NIST, không ép ký tự đặc biệt). Không trim/đổi giá trị. Áp dụng cho mọi ô mật khẩu (đăng nhập, đăng ký, đặt lại, đổi mật khẩu, xác thực lại khi liên kết Google).

## Kiểm chứng sau triển khai (2026-11-24)

| Mục [KC] | Kết quả |
|---|---|
| JWE của Auth.js | `@auth/core@0.41.3/jwt.js`: `alg: "dir"`, `enc: "A256CBC-HS512"`, khóa dẫn xuất HKDF-SHA256 từ `AUTH_SECRET` với salt = tên cookie; giải mã thử mọi secret trong mảng → hỗ trợ xoay vòng. |
| Cookie phiên | `__Secure-authjs.session-token` khi HTTPS, `authjs.session-token` khi HTTP; HttpOnly, SameSite=Lax. |
| Checks Google | Mặc định chỉ `["pkce"]` (+`state`) → cấu hình thêm `nonce` trong `server/auth/nextauth.ts`. |
| Cloudinary Usage API (tài khoản thật, 1 lần gọi) | Gói **Free**, có khối `credits {usage, limit: 25, used_percent}` → snapshot được đánh dấu `authoritative`; `media_limits`: video 104.857.600 byte (100 MB), ảnh 10.485.760 byte. |
| Transaction trên Atlas | **Chưa kiểm được**: kết nối bị từ chối ở TLS (IP chưa được thêm vào Atlas Network Access). Transaction đã chạy thành công trên replica set cục bộ (mongodb 8.2.6) trong integration test. |
