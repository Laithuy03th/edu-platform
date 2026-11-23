# Kiến trúc

> Trạng thái: **thiết kế Phase 0**, chưa có code. Sẽ cập nhật để phản ánh implementation thật.

## 1. Tổng quan

```text
Browser ──HTML/RSC/Server Actions──▶ Next.js 16 (Node runtime, một app)
   │                                   ├─ proxy.ts: requestId, redirect lạc quan, security headers
   │                                   ├─ app/: pages, layouts, actions & route handlers mỏng
   │                                   ├─ modules/*: service + policy + repo (server-only)
   │                                   └─ server/auth: next-auth (JWT/JWE cookie) + getViewer()
   │                                           │
   │                                           ├──▶ MongoDB Atlas (driver v7, pool nhỏ)
   │                                           ├──▶ Cloudinary Admin/Upload API (ký, xác minh, xóa, usage)
   │                                           └──▶ SMTP (nodemailer) / file outbox (dev)
   │
   ├──upload trực tiếp (signed params)──▶ Cloudinary  ──webhook (tùy chọn)──▶ /api/webhooks/cloudinary
   └──phát video/ảnh (CDN URL)─────────▶ Cloudinary CDN   (KHÔNG đi qua Next.js)
```

Nguyên tắc: **binary không đi qua Next.js** (upload và phát video đi thẳng Cloudinary); Next.js chỉ ký, xác minh và cấp URL theo quyền.

## 2. Cấu trúc thư mục dự kiến

Chỉ tạo thư mục khi có code thật cho nó (không tạo khung rỗng).

```text
src/
  proxy.ts                    # Next 16 (thay middleware): requestId, redirect lạc quan, headers
  app/
    (public)/                 # /, /courses, /paths, /u/[handle]
    (auth)/                   # /login, /register, /verify-email, ...
    (student)/                # /dashboard, /learn/..., /notes, /review, /settings/...
    instructor/               # layout gọi requireRole('instructor')
    admin/                    # layout gọi requireRole('admin')
    api/
      auth/[...nextauth]/route.ts
      progress/route.ts       # nhận sendBeacon khi tab ẩn/thoát
      webhooks/cloudinary/route.ts
      health/route.ts
      notes/export/route.ts   # Phase 6
  components/
    ui/                       # shadcn/ui sinh ra
    ...                       # component dùng chung (Markdown, Pagination, EmptyState...)
  modules/
    auth/        users/       courses/      enrollments/   learning/
    quizzes/     notes/       reviews/      learning-paths/ projects/
    discussions/ media/       admin/
      # mỗi module (chỉ những file cần):
      #   schemas.ts   – Zod input schemas + DTO types (có thể import ở client nếu không chứa secret)
      #   service.ts   – nghiệp vụ, gọi policy + repo ('server-only')
      #   policy.ts    – hàm thuần kiểm tra quyền (dễ unit test)
      #   repo.ts      – truy vấn Mongo, projection rõ ràng ('server-only')
      #   actions.ts   – 'use server' mỏng: parse → requireViewer → service → ActionResult
  lib/
    env.ts         # Zod validate env, tách server/client
    db.ts          # MongoClient dùng lại, getDb(), withTransaction()
    errors.ts      # AppError, ActionResult, mapping HTTP
    logger.ts      # JSON logger + redaction
    ids.ts         # parse ObjectId an toàn
    text.ts        # chuẩn hóa tiếng Việt (bỏ dấu), slug
    time.ts        # UTC <-> timezone hiển thị
    rate-limit.ts  # bucket MongoDB + HMAC key
    request.ts     # requestId, client IP theo cấu hình proxy tin cậy, kiểm tra Origin
  server/
    auth/          # next-auth config, getViewer/requireViewer/requireRole, password, tokens
    mail/          # adapter smtp | file
    cloudinary/    # client server-only, ký upload, verify webhook, signed delivery URL
tests/
  unit/  integration/  e2e/
scripts/
  db-indexes.ts  db-seed.ts  create-admin.ts  media-cleanup.ts  usage-sync.ts  bench-argon2.ts
docs/
```

## 3. Luồng request và lớp trách nhiệm

```text
UI (Server/Client Component)
  └─▶ Server Action / Route Handler     (mỏng: parse Zod, lấy viewer, gọi service, map lỗi)
        └─▶ service (modules/x/service.ts)   (nghiệp vụ + gọi policy với dữ liệu mới nhất từ DB)
              ├─▶ policy (hàm thuần)          (canEditCourse(viewer, course), canReadLesson(...))
              └─▶ repo / provider adapter     (Mongo, Cloudinary, SMTP)
```

- **Server Components** gọi service trực tiếp (không fetch HTTP vào chính app).
- **Authorization gắn vào truy vấn**: repo nhận `viewerId` và tự đưa vào filter cho dữ liệu cá nhân (`notes.find({ userId: viewer.id, ... })`), không lọc sau khi đã đọc.
- **Không tin dữ liệu client**: `userId`, `roles`, `score`, `duration`, `bytes`, `publicId` từ client đều bị bỏ qua hoặc chỉ dùng làm tham chiếu để tra lại server-side.
- **Mỗi Server Action là endpoint công khai**: luôn tự gọi `requireViewer()`/`requireRole()` bên trong, không dựa vào layout/page đã kiểm tra (Next docs: "A page-level authentication check does not extend to the Server Actions defined within it").
- `getViewer()` memo bằng React `cache()` → nhiều component trong một request chỉ tốn 1 truy vấn user.

## 4. Ranh giới server/client

| Loại module | Quy tắc |
|---|---|
| `lib/db.ts`, `server/**`, `modules/*/service.ts`, `repo.ts` | `import 'server-only'` ở đầu file |
| `lib/env.ts` | Tách `serverEnv` (server-only) và `clientEnv` (chỉ `NEXT_PUBLIC_*` không nhạy cảm) |
| `modules/*/schemas.ts` | Được dùng ở client cho validate form; không chứa secret, không import repo |
| DTO trả về client | Hàm `toXDto()` tường minh; không spread document Mongo |
| Quiz trước khi nộp | DTO `QuizForAttempt` **không có** trường `correctOptionId`/`explanation` — được test bằng snapshot DTO |

Biến môi trường công khai dự kiến chỉ có: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (cloud name vốn xuất hiện trong mọi URL ảnh).

## 5. Caching

| Dữ liệu | Chiến lược |
|---|---|
| Catalog, chi tiết khóa published, lộ trình public, bài preview | `'use cache'` + `cacheLife('hours')` + `cacheTag('catalog')`/`cacheTag('course:<id>')`; invalidation khi duyệt/gỡ/suspend/archive/sửa review aggregate |
| Mọi dữ liệu theo user (dashboard, tiến độ, ghi chú, quiz attempt) | Render động, không `'use cache'`; không bao giờ đặt hàm đọc cookie trong scope cache |
| Hồ sơ public `/u/[handle]` | `'use cache'` + `cacheTag('profile:<userId>')`, invalidation khi user đổi tùy chọn public |
| Trạng thái thu hồi phiên | Không cache qua request (ADR-003) |
| Usage Cloudinary | Lưu snapshot trong DB, refresh thủ công có cooldown 15 phút |

Test bắt buộc: khóa draft/pending không xuất hiện trong trang đã cache (F09/F10).

## 6. Bảo vệ mutation (CSRF/origin)

- Server Actions: Next.js so `Origin` với `Host`/`X-Forwarded-Host`, nhưng **request không có Origin thì bỏ qua kiểm tra**. Vì vậy wrapper `action()` của ta kiểm tra thêm: bắt buộc có `Origin` và origin ∈ `{APP_URL}` (+ allowlist dev), nếu không → 403.
- Route Handlers dùng cookie (progress beacon, export): kiểm tra `Origin`/`Sec-Fetch-Site`, `Content-Type` cụ thể, cookie `SameSite=Lax`.
- Webhook Cloudinary: không dùng cookie; xác thực bằng chữ ký.
- Auth.js tự có CSRF token cho endpoint của nó (`/api/auth/*`).
- Không tin `X-Forwarded-*` trừ khi `TRUST_PROXY=true` (production sau hosting đã biết).

## 7. Security headers

Đặt trong `next.config.ts` (`headers()`) + proxy cho nonce nếu cần:

- `Content-Security-Policy`: `default-src 'self'`; `img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com`; `media-src https://res.cloudinary.com`; `connect-src 'self' https://api.cloudinary.com`; `frame-ancestors 'none'`; `form-action 'self' https://accounts.google.com`. Script dùng nonce nếu Next 16 + Cache Components cho phép; nếu không, ghi rõ giới hạn và dùng `'self'` + hash. **Kiểm chứng thực tế ở Phase 1/3, không tuyên bố trước.**
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` tối thiểu, HSTS ở production.

## 8. Mô hình dữ liệu & tính nhất quán

Chi tiết: [DATA_MODEL.md](DATA_MODEL.md). Nguyên tắc:

- Unique index cho mọi bất biến "một-cho-một" (email, provider account, enrollment, progress, review, attempt submissionId).
- Atomic update (`$inc`, `$max`, `$setOnInsert`, `findOneAndUpdate` có điều kiện) cho race thông thường.
- Transaction chỉ dùng khi **nhiều document phải đổi cùng nhau**: (1) xuất bản khóa học (draft→published nhiều doc), (2) finalize media (reservation + asset + quota), (3) reorder chương/bài kèm kiểm tra `revision`. Atlas Free là replica set; khả năng transaction sẽ được **kiểm chứng bằng test thật ở Phase 1** trước khi dựa vào.
- Thao tác chéo dịch vụ (Mongo ↔ Cloudinary ↔ email) không có transaction chung → state machine + idempotency key + reconcile script (xem [MEDIA_PIPELINE.md](MEDIA_PIPELINE.md)).

## 9. Tradeoff chính

| Quyết định | Được | Mất |
|---|---|---|
| JWT + kiểm tra DB mỗi request | Thu hồi phiên tức thời | Không stateless; +1 query/request bảo vệ |
| Modular monolith một app | Đơn giản deploy, refactor dễ | Phải tự kỷ luật ranh giới module (lint rule import) |
| Server Actions cho mutation nội bộ | Ít boilerplate, type-safe | Không có hợp đồng HTTP công khai; phải tự thêm kiểm tra Origin |
| Draft/published hai trường | Tối đa 2 bản, đọc nhanh | Xuất bản cần transaction nhiều doc |
| Signed URL `authenticated` cho video | Không dựng được URL từ publicId | URL đã cấp không hết hạn, chia sẻ được |
| Rate limit bằng Mongo | Không thêm Redis | Mỗi request bị giới hạn tốn thêm 1 write; tính vào 100 ops/s của Atlas Free |
| mongodb-memory-server cho test | Không cần credentials, CI chạy được | Tải binary mongod lần đầu (~100+ MB cache) |

## 10. Mở rộng không bị khóa

- Thanh toán: enrollment có `source: 'free'` → thêm `orders` riêng sau, không tái dùng enrollment làm đơn hàng.
- Nhiều dạng câu hỏi: `question.kind` (hiện chỉ `single_choice`).
- Đổi thư viện auth: chỉ chạm `src/server/auth/*` (ADR-002).
- Token-based delivery Cloudinary nếu nâng gói: chỉ đổi `server/cloudinary/delivery.ts`.
