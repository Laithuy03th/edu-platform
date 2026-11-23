# Xác thực, phiên và bảo mật

> Trạng thái: **thiết kế Phase 0**. Thư viện đề xuất: `next-auth@5.0.0-beta.32` (⚠️ chờ duyệt — ADR-002). Mọi chi tiết đánh dấu **[KC]** phải được **kiểm chứng bằng code/test ở Phase 1** trên phiên bản đã cài, không coi là sự thật trước đó.

## 1. Ba khái niệm tách biệt

| Cơ chế | Bảo vệ cái gì | Ở dự án này |
|---|---|---|
| Password hashing | Mật khẩu trong DB nếu DB bị lộ | Argon2id (`@node-rs/argon2`), salt ngẫu nhiên, chuỗi PHC |
| JWT signing | Token không bị sửa | Thư viện ký/mã hóa; **ký không che nội dung** |
| JWT encryption (JWE) | Nội dung token không đọc được ở client | Auth.js v5 dùng JWE cho session cookie **[KC: thuật toán & cách dẫn xuất khóa từ `AUTH_SECRET` — đọc source `@auth/core/jwt` 0.41.3]** |

Dù token được mã hóa, nó vẫn chỉ chứa claim tối thiểu (§3).

## 2. Cookie

| Thuộc tính | Production (HTTPS) | Local (HTTP) |
|---|---|---|
| Tên | `__Secure-authjs.session-token` **[KC]** | `authjs.session-token` |
| HttpOnly | ✔ | ✔ |
| Secure | ✔ | ✘ (HTTP) |
| SameSite | Lax | Lax |
| Path | / | / |

- Không lưu token trong `localStorage`/`sessionStorage`/URL.
- `AUTH_SECRET` ≥ 32 byte ngẫu nhiên (`openssl rand -base64 32`), chỉ server, không tiền tố `NEXT_PUBLIC_`.
- **Rotation:** Auth.js hỗ trợ mảng secret (secret mới đứng đầu, secret cũ để giải mã) **[KC]**. Đổi secret không kèm secret cũ ⇒ mọi phiên hiện tại mất hiệu lực (người dùng phải đăng nhập lại) — đây cũng là "nút khẩn cấp" khi lộ secret.

## 3. Nội dung token và thời hạn

```ts
// claim do ứng dụng thêm vào JWT (callback `jwt`)
{ sub: string /* userId */, av: number /* authVersion */, lat: number /* login at, epoch s */ }
// + iat, exp, jti do thư viện thêm
```

- **Không** chứa: email, tên, ảnh, roles, password/hash, token Google.
- `session.maxAge = 8 * 3600`, `session.updateAge = 3600` → **idle timeout 8h rolling**: mỗi khi có request sau ≥ 1h kể từ lần phát gần nhất, cookie được phát lại với hạn mới = now + 8h **[KC hành vi rolling thực tế]**.
- **Hạn tuyệt đối 7 ngày**: `jwt` callback và `getViewer()` từ chối nếu `now - lat > 7 ngày`.
- Session object trả cho client (`useSession`/`auth()`) chỉ có `{ user: { id } }`; dữ liệu hiển thị (tên, avatar, roles) lấy qua `getViewer()` từ DB.

## 4. Kiểm tra phiên mỗi request (thu hồi)

```ts
// src/server/auth/viewer.ts  (server-only)
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();                       // giải mã JWE cookie
  if (!session?.sub) return null;
  if (Date.now()/1000 - session.lat > ABSOLUTE_MAX) return null;
  const u = await usersRepo.findAuthState(session.sub); // {status, authVersion, roles, emailVerifiedAt, ...}
  if (!u || u.status !== 'active' || u.authVersion !== session.av) return null;
  return toViewer(u);
});
export async function requireViewer() { /* throw AppError UNAUTHENTICATED (401) */ }
export async function requireRole(role) { /* 403 nếu không có role hiện hành trong DB */ }
export async function requireVerifiedEmail() { /* 403 EMAIL_NOT_VERIFIED */ }
```

| Sự kiện | Hành động | Hiệu lực |
|---|---|---|
| Đổi mật khẩu | `$inc authVersion` + phát lại cookie cho phiên hiện tại với `av` mới | Thiết bị khác bị đăng xuất ở request kế tiếp; thiết bị hiện tại **vẫn đăng nhập** |
| Reset mật khẩu qua email | `$inc authVersion` | Mọi phiên (kể cả hiện tại) bị từ chối; phải đăng nhập lại |
| Đăng xuất tất cả thiết bị | `$inc authVersion` + xóa cookie hiện tại | Tất cả phải đăng nhập lại |
| Admin khóa tài khoản | `status='blocked'` + `$inc authVersion` + audit | Request bảo vệ kế tiếp bị từ chối |
| Admin đổi role | không cần tăng `authVersion` | Role luôn đọc từ DB mỗi request |
| Đăng xuất | Xóa cookie phiên hiện tại | JWT đã sao chép ở nơi khác vẫn hợp lệ tới khi hết hạn — **trừ khi** dùng "đăng xuất tất cả" |

**Tradeoff được chấp nhận:** mỗi request bảo vệ tốn 1 truy vấn theo `_id` → không stateless; đổi lại thu hồi tức thời, không có độ trễ cache. Trang public không gọi `getViewer()` trừ phần header (đặt trong `<Suspense>`).

## 5. Luồng chi tiết

### 5.1 Đăng ký email/mật khẩu

1. Server Action `register` → kiểm tra Origin (ARCHITECTURE §6) → giới hạn body.
2. Rate limit: `register:ip` 5/giờ, `register:email` 3/giờ.
3. Zod: `displayName` 2–60; `email` hợp lệ ≤ 254; `password` NFC, 12–128 code point, ≤ 1024 byte; `confirmPassword` khớp.
4. Hash Argon2id → `insertOne(users)`; duplicate key `emailNormalized` → trả **thông báo trung tính** ("Nếu email hợp lệ, hãy kiểm tra hộp thư") để không lộ email đã tồn tại; đồng thời gửi email "có người thử đăng ký bằng email của bạn" cho chủ tài khoản (rate limit riêng).
5. Tạo `authTokens(email_verify)` + gửi email; tự đăng nhập với trạng thái chưa xác minh.
6. Chưa xác minh: xem catalog/hồ sơ được; **chặn** enrollment, hỏi đáp, nộp bài, review (`requireVerifiedEmail`).
7. Gửi lại xác minh: cooldown 60 giây (dựa trên `authTokens.createdAt` mới nhất), tối đa 5/giờ; token cũ cùng loại bị vô hiệu khi phát token mới.

### 5.2 Đăng nhập email/mật khẩu (Credentials provider)

- `authorize()`: rate limit **trước** khi hash — `login:ip` 20/15 phút, `login:email` 5/15 phút (cooldown, có `Retry-After`; không khóa vĩnh viễn).
- Không tìm thấy user/không có passwordHash → vẫn chạy `verify` với hash giả cố định để thời gian phản hồi tương đương.
- Sai → lỗi chung "Email hoặc mật khẩu không đúng".
- `status='blocked'` → cùng thông báo chung (không lộ trạng thái) và audit.
- Thành công → `lastLoginAt`, JWT với `av` hiện hành, `lat = now`.
- `callbackUrl`: chỉ chấp nhận đường dẫn bắt đầu bằng `/` nhưng không phải `//` hoặc `/\`, parse bằng `new URL(x, APP_URL)` và so origin == APP_URL; còn lại về `/dashboard`.

### 5.3 Đăng nhập Google (OIDC)

- Provider Google của Auth.js; scope `openid email profile`; **không** `access_type=offline`. Checks: `pkce`, `state`, `nonce` **[KC: cấu hình `checks` mặc định của provider Google trong @auth/core 0.41.3; thêm `nonce` nếu chưa có]**.
- Callback `signIn({ account, profile })`:

```text
A. Có authAccounts(provider='google', providerAccountId=profile.sub)?
   → user tồn tại & active → đăng nhập user đó.
B. Có cookie link_intent hợp lệ (xem 5.4)?
   → luồng liên kết.
C. Không có tài khoản liên kết:
   C1. profile.email_verified !== true → từ chối ("Email Google chưa được xác minh").
   C2. Đã có user với emailNormalized trùng → TỪ CHỐI, chuyển tới /login?error=account_exists
       với hướng dẫn: "Đăng nhập bằng mật khẩu, rồi liên kết Google trong Cài đặt > Bảo mật".
       (KHÔNG tự gộp; KHÔNG bật allowDangerousEmailAccountLinking.)
   C3. Chưa có → tạo user mới (passwordHash=null, emailVerifiedAt=now, avatar google)
       + authAccounts; xử lý race bằng unique index (duplicate → quay lại C2).
```

- `emailVerifiedAt` chỉ được set từ Google khi `email_verified === true` trong ID token đã được thư viện xác minh chữ ký/aud/iss/nonce **[KC]**.

### 5.4 Liên kết Google vào tài khoản hiện có

1. User đã đăng nhập vào `/settings/security` → bấm "Liên kết Google".
2. **Xác thực gần đây:** nhập lại mật khẩu (nếu có) — Server Action kiểm tra rate limit + verify Argon2.
3. Server tạo `authTokens(link_intent, userId, 10 phút)`, đặt cookie HttpOnly `link_intent=<token>` (SameSite=Lax, Path=/api/auth), rồi khởi động `signIn('google')`.
4. Trong `signIn` callback: đọc cookie, consume token nguyên tử → nếu `providerAccountId` chưa thuộc user khác → `insert authAccounts {userId}`; nếu đã thuộc user khác → từ chối "Tài khoản Google này đã liên kết với tài khoản khác". JWT giữ nguyên `sub` của user đang đăng nhập. **[KC: đọc được `cookies()` trong callback của Auth.js v5 khi chạy trong Route Handler; nếu không, phương án dự phòng: truyền `state` tùy chỉnh qua `authorizationParams` không được — sẽ dùng route trung gian `/api/link/google/complete`]**.
5. Email Google **không cần** trùng email tài khoản (liên kết dựa trên người dùng đã chứng minh sở hữu cả hai).
6. Audit `auth.link_google`.

Tài khoản chỉ có Google, không có mật khẩu, khi liên kết lại: bước 2 thay bằng "đăng nhập Google lại trong vòng 10 phút" (`lat` gần đây).

### 5.5 Hủy liên kết, đặt mật khẩu cho tài khoản chỉ có Google

- Hủy liên kết chỉ khi user còn **ít nhất một phương thức đã xác minh khác** (có `passwordHash` và `emailVerifiedAt`, hoặc provider khác).
- Tài khoản chỉ Google: mục "Đổi mật khẩu" hiển thị "Tài khoản của bạn chưa có mật khẩu" + nút "Đặt mật khẩu" → gửi email `set_password` (30 phút) tới email đã xác minh → đặt mật khẩu mới. Không giả định có mật khẩu cũ.

### 5.6 Quên mật khẩu / đặt lại

- Form email → luôn trả "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn". Để thời gian phản hồi không lộ email có tồn tại hay không, việc gửi email chạy sau response bằng `after()` của Next.js **[KC: `after()` hoạt động trên hosting đã chọn]**.
- Rate limit: `reset:ip` 5/giờ, `reset:email` 3/giờ.
- Token 32 byte (`crypto.randomBytes`) base64url; DB lưu SHA-256; hạn 30 phút; một lần; phát token mới vô hiệu token cũ.
- Đặt lại: consume nguyên tử (§2.3 DATA_MODEL) → đặt hash mới → `$inc authVersion` → chuyển tới `/login` với thông báo "Đăng nhập lại bằng mật khẩu mới". Hai request đồng thời: chỉ một `findOneAndUpdate` thắng.
- Link trong email dùng query `/reset-password?token=...` (không dùng fragment `#token` vì form sẽ phụ thuộc JS). Trang này đặt `Referrer-Policy: no-referrer`, chuyển token vào hidden field rồi `router.replace` để xóa khỏi thanh địa chỉ, và **không log query string** của route.

### 5.7 Đổi mật khẩu khi đang đăng nhập

- Cần mật khẩu hiện tại (rate limit `change_pw:user` 5/15 phút).
- Thành công → `$inc authVersion`, phát lại cookie phiên hiện tại; thông báo "Các thiết bị khác đã bị đăng xuất".

## 6. Ma trận quyền và policy

Hàm policy thuần (unit test đầy đủ), nhận dữ liệu **đã đọc từ DB** chứ không từ client:

| Policy | Quy tắc |
|---|---|
| `canViewCoursePublic(course)` | `status ∈ {published}` (archived: chỉ người đã enroll; suspended: không ai trừ admin/owner) |
| `canEnroll(viewer, course)` | viewer có email verified, `course.status = 'published'` |
| `canReadLesson(viewer, course, lesson, enrollment)` | lesson.published.isPreview && course public; HOẶC admin; HOẶC owner (đọc draft/published); HOẶC enrollment `active` && course `status ∈ {published, archived}` |
| `canEditCourse(viewer, course)` | admin, hoặc (`roles ∋ instructor` && `course.instructorId = viewer.id`) |
| `canUploadMedia(viewer, course)` | `canEditCourse` && killSwitch uploads bật && budget < 90% && usage còn mới |
| `canReviewCourse(viewer)` | `roles ∋ admin` |
| `canViewSubmission(viewer, sub, course)` | chủ bài nộp, owner khóa, admin |
| `canViewLearnerStats(viewer, course)` | owner (chỉ aggregate + danh sách bài nộp/câu hỏi của khóa), admin |
| Notes | **chỉ chủ sở hữu**; không có policy nào cho người khác |
| `canWriteCourseReview(viewer, course, enrollment, progress)` | enrollment active, ≥ 1 bài completed, viewer ≠ instructor của khóa |
| `canModerate(viewer)` | admin |

Truy cập chéo bắt buộc test: student nâng role; instructor A sửa khóa/media của B; user A đọc notes/submission của B; enrollment revoked; course suspended.

Kiểm tra quan hệ lesson→chapter→course: mọi mutation lesson nhận `(courseId, lessonId)` và truy vấn `lessons.findOne({_id: lessonId, courseId})` sau khi đã kiểm tra `canEditCourse` trên `courseId`; chapterId mới (khi di chuyển bài) cũng phải `chapters.findOne({_id, courseId})`.

## 7. Bootstrap admin

- Không có endpoint tự nâng quyền. Script `pnpm admin:create --email <email>`: yêu cầu user đã tồn tại và đã xác minh email, chạy với `ALLOW_ADMIN_BOOTSTRAP=true`, in xác nhận, ghi audit `actorId=null, action='admin.bootstrap'`.
- Không có tài khoản/mật khẩu mặc định trong mã nguồn. User demo chỉ tạo bằng script khi `APP_ENV ∈ {development, test}`, mật khẩu lấy từ env cục bộ.

## 8. Rate limit (mặc định, cấu hình được)

| Tác vụ | Giới hạn |
|---|---|
| login | 20/15 phút/IP; 5/15 phút/email |
| register | 5/giờ/IP; 3/giờ/email |
| resend verify | cooldown 60 s; 5/giờ/user |
| forgot password | 5/giờ/IP; 3/giờ/email |
| change/set password, link reauth | 5/15 phút/user |
| hỏi đáp (tạo câu hỏi/trả lời) | 10/giờ/user |
| review khóa học | 10/ngày/user |
| báo cáo nội dung | 20/ngày/user |
| xin upload reservation | 20/giờ/user |
| ghi chú | 60/giờ/user |
| progress save | 120/giờ/user (đủ cho autosave 30 s) |

Phản hồi vượt giới hạn: 429 `RATE_LIMITED` + `Retry-After` (Route Handler) hoặc `error.retryAfterSeconds` (Server Action).

## 9. Các biện pháp khác

- **Open redirect:** §5.2.
- **NoSQL injection:** Zod parse mọi input thành kiểu nguyên thủy; không spread object từ client vào filter/update; `ObjectId` parse an toàn; sort/filter qua enum.
- **XSS:** Markdown không raw HTML (ADR-017); React escape mặc định; không `dangerouslySetInnerHTML` ngoài component Markdown đã kiểm duyệt; test payload `<script>`, `javascript:` URL, `<img onerror>`.
- **SSRF:** server không fetch URL người dùng (bài nộp, sampleUrl, resource link).
- **CORS:** không bật; mặc định same-origin.
- **Log:** redact `password`, `confirmPassword`, `token`, `tokenHash`, `secret`, `authorization`, `cookie`, `content` (notes), query string của `/reset-password`, `/verify-email`.
- **MongoDB user:** user ứng dụng chỉ có `readWrite` trên DB của app; user riêng (quyền `dbAdmin`) cho `db:indexes`. Network access Atlas: ghi rõ trong DEPLOYMENT (Vercel không có IP tĩnh trên Hobby ⇒ có thể phải mở `0.0.0.0/0` — rủi ro được bù bằng mật khẩu mạnh + user quyền tối thiểu; chủ dự án quyết định khi deploy).
- **Dependency:** `pnpm audit` trong CI (báo cáo, không tự nâng major).
