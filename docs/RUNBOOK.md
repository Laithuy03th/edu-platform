# Runbook vận hành

> Dành cho người vận hành bản demo. Ứng dụng không tự nâng gói hay bật dịch vụ trả phí.

## 1. Khởi tạo database Atlas

1. Atlas → Security → Database Access: tạo user chỉ có `readWrite` trên database của app (vd `tuhoc_dev`).
2. Atlas → Security → Network Access: thêm IP máy đang chạy. Hosting không có IP tĩnh thì cân nhắc `0.0.0.0/0`, chỉ khi mật khẩu user mạnh và quyền tối thiểu.
3. Điền `MONGODB_URI`, `MONGODB_DB_NAME` trong `.env`.
4. `pnpm db:indexes` — tạo collection/index (idempotent, không xóa index thừa).
5. (Tùy chọn) `pnpm db:seed` — 2 khóa mẫu + 1 lộ trình. Khi `APP_ENV` khác production sẽ tạo 3 tài khoản demo (`admin@demo.local`, `giangvien@demo.local`, `hocvien@demo.local`), mật khẩu lấy từ `SEED_DEMO_PASSWORD` hoặc sinh ngẫu nhiên và in ra một lần.
6. Admin thật: đăng ký, xác minh email, chạy `ALLOW_ADMIN_BOOTSTRAP=true pnpm admin:create -- --email ban@example.com --yes`, rồi đặt lại `ALLOW_ADMIN_BOOTSTRAP=false`.

Lỗi TLS "SSL alert number 80" khi kết nối Atlas: gần như luôn do IP chưa có trong Network Access.

## 2. Phát triển cục bộ không cần Atlas

```bash
pnpm dev:db   # MongoDB replica set 127.0.0.1:27027, dữ liệu trong .data/mongo
MONGODB_URI="mongodb://127.0.0.1:27027/?replicaSet=rs0" SEED_DEMO_PASSWORD="mat-khau-demo-du-dai" pnpm db:seed
MONGODB_URI="mongodb://127.0.0.1:27027/?replicaSet=rs0" pnpm dev
```

Email ở development **khi chưa có `SMTP_HOST`** được ghi ra `.data/mail/*.json` (mở file để lấy link xác minh/đặt lại mật khẩu). Có `SMTP_HOST` thì gửi thật (xem §10).

**Đổi DB giữa các lần chạy build production** (Atlas ↔ cục bộ): xóa `.next/cache` trước khi `next start`. `unstable_cache` của catalog được lưu ở đó và tồn tại qua các lần build. Nếu không xóa, trang có thể hiển thị ID của DB cũ, khiến các action báo "Không tìm thấy". Dev server dùng `.next/dev`, không bị ảnh hưởng.

## 3. Sắp hết ngân sách Cloudinary

| Mức | Dấu hiệu | Hành động |
|---|---|---|
| ≥ 60% | Badge cảnh báo ở /admin/media | Xem bandwidth; nhắc nhóm thử dùng chế độ tiết kiệm dữ liệu |
| ≥ 80% | Eager poster tự tắt | Cân nhắc tắt "Cho phép cấp link phát video mới" |
| ≥ 90% | Upload tự dừng (fail-closed) | Tắt cấp link phát mới; nếu link bị chia sẻ rộng, đổi public_id video để vô hiệu link cũ |

Chặn upload/cấp link không chặn băng thông từ link đã cấp hoặc video học thử công khai. Không nâng gói khi chưa có quyết định của chủ dự án.

## 4. Upload mồ côi / reservation treo

1. /admin/media → "Đối soát (dry-run)": xem reservation hết hạn, finalizing treo, chênh lệch bộ đếm.
2. "Áp dụng đối soát" nếu kết quả hợp lý.
3. `pnpm media:cleanup` (dry-run) liệt kê file trên Cloudinary không có bản ghi, cũ hơn 24 giờ. Xem kỹ rồi mới chạy `pnpm media:cleanup -- --apply`.
4. "Xử lý hàng chờ xóa" để thử lại các lần xóa thất bại (tối đa 8 lần, có backoff).

## 5. Provider lỗi

- Cloudinary lỗi: đồng bộ usage thất bại thì upload tự dừng sau `USAGE_STALE_AFTER_MINUTES`; bài đọc, quiz, ghi chú vẫn chạy.
- SMTP lỗi: đăng ký/quên mật khẩu vẫn trả thông báo chung; log `mail.send_failed`. Người dùng bấm "Gửi lại email xác minh" sau khi khắc phục.
- Atlas throttle (100 ops/giây): kiểm tra traffic bất thường; ghi tiến độ đã giới hạn 240 lần/giờ/người.

## 6. Lộ secret

| Secret | Hành động | Ảnh hưởng |
|---|---|---|
| AUTH_SECRET | Tạo mới (`openssl rand -base64 32`), khởi động lại/deploy | Mọi phiên bị đăng xuất |
| RATE_LIMIT_SECRET | Tạo mới | Bộ đếm rate limit reset |
| MONGODB_URI | Đổi mật khẩu user trên Atlas, cập nhật .env | Ngắt kết nối tới khi cập nhật |
| CLOUDINARY_API_SECRET | Console → API Keys: tạo key mới, vô hiệu key cũ | Chữ ký upload cũ hết hiệu lực |
| Tài khoản người dùng bị chiếm | Admin khóa tài khoản (tăng authVersion) | Mọi phiên của user bị từ chối ngay |

## 7. Khóa học cần đình chỉ

/admin/courses → "Đình chỉ" (bắt buộc lý do, ghi audit). Học viên mất quyền ở request kế tiếp; trang chi tiết hiện "tạm ngưng". "Bỏ đình chỉ" trả về trạng thái published.

## 8. Sao lưu và khôi phục thủ công

Atlas Free không có backup tự động. Repo có lệnh sao lưu/khôi phục không cần mongodump (dùng driver, định dạng EJSON nén):

- Sao lưu: `pnpm db:backup` → `.data/backup/<db>-<thời gian>/` (mỗi collection một file `.ejson.gz` + `manifest.json` số document).
- Khôi phục: `pnpm db:backup --restore=<thư mục> --to-uri=<mongodb://…> --to-db=<tên DB mới>`. Chỉ ghi vào DB chưa có dữ liệu (muốn ghi đè phải thêm `--force`), sau đó tự tạo index và đối chiếu số document từng collection.
- Đã thử thật 2026-11-24: sao lưu Atlas `tuhoc_dev` (36 collection, 181 document) → khôi phục vào Mongo cục bộ: 36/36 khớp, ObjectId/Date giữ đúng kiểu, 10 index trên `courses`; khôi phục vào DB có dữ liệu bị từ chối.
- Bản sao chứa dữ liệu cá nhân (email, hash mật khẩu): không commit (`.data/` đã gitignore), lưu nơi an toàn, xóa bản cũ không cần.

## 9. Rollback release

`git revert <commit>` rồi deploy lại. Các thay đổi schema hiện tại đều tương thích ngược (chỉ thêm field, có schemaVersion).

## 10. Email thật bằng SMTP miễn phí

Không gửi mật khẩu hay giá trị `.env` qua chat. Điền trực tiếp vào `.env`, rồi khởi động lại `pnpm dev`.

**Cách A: Gmail (miễn phí, giới hạn gửi theo ngày của Google, hợp với demo)**

1. Tài khoản Google → Bảo mật → bật **Xác minh 2 bước**.
2. Vào https://myaccount.google.com/apppasswords → tạo App Password tên "Tu Hoc" → Google hiện 16 ký tự.
3. Điền vào `.env`:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465` (để `SMTP_SECURE` trống: port 465 tự bật TLS)
   - `SMTP_USER=<địa chỉ Gmail của bạn>`
   - `SMTP_PASSWORD=<16 ký tự, viết liền, bỏ dấu cách>`
   - `MAIL_FROM=Tự Học <cùng địa chỉ Gmail>`. Gmail yêu cầu trùng `SMTP_USER`.

**Cách B: Brevo (gói Free; xem giới hạn hiện hành trên trang Brevo)**

- `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`.
- `SMTP_USER`/`SMTP_PASSWORD` lấy ở mục SMTP & API → SMTP.
- `MAIL_FROM` phải là sender/domain đã xác minh trong Brevo.

**Kiểm tra:**

```bash
pnpm mail:check                         # kiểm tra biến + kết nối/đăng nhập SMTP, KHÔNG gửi thư
pnpm mail:check --send-to=ban@example.com   # gửi đúng 1 thư thử
```

Lệnh chỉ in tên biến, có/thiếu, host/port. Không in mật khẩu. Một số lỗi thường gặp:

| Lỗi | Nguyên nhân và cách sửa |
|---|---|
| `EAUTH 535` | Sai user/password, hoặc dùng mật khẩu đăng nhập Gmail thay vì App Password |
| `ESOCKET` / `ETIMEDOUT` | Sai port/secure, hoặc mạng chặn cổng SMTP. Thử 587 (STARTTLS) thay 465 |
| Thư vào Spam | Bình thường với Gmail cá nhân khi gửi tự động. Domain riêng cần SPF/DKIM (làm khi deploy) |

Khi production: `APP_ENV=production` bắt buộc dùng SMTP. Thiếu cấu hình thì gửi mail ném lỗi thiết lập rõ ràng, không giả lập thành công.

## 11. Media mẫu (ảnh bìa + video minh họa)

`pnpm media:samples` dựng cho mọi khóa đã xuất bản: ảnh bìa JPEG 1280×720 và mỗi bài một video WebM VP9 không lời, dựng từ nội dung bài (tiêu đề, mục tiêu, từng mục, khối code). File nằm trong `.data/media-samples/` (đã gitignore).

- Không cờ: chỉ dựng file và in kích thước. Không cần mạng và không ghi DB.
- `--apply`: tải lên Cloudinary qua `requestUpload` → `finalizeReservation`, gắn vào **bản nháp**. Bài đọc chuyển thành bài video, phần chữ giữ nguyên dưới video, transcript là nội dung trên màn hình. Mọi quota, kill switch và ngân sách vẫn áp dụng.
- `--submit`: gửi duyệt. Admin duyệt ở `/admin/courses`. Duyệt qua UI để cache catalog của server đang chạy được làm mới.
- `--course=<slug>`: chỉ chạy một khóa. `--rerender`: dựng lại file dù đã có.
- Script idempotent: bỏ qua khóa đã có ảnh bìa và bài đã có video.
- Cần trình duyệt và ffmpeg của Playwright (`pnpm exec playwright install chromium ffmpeg`).
- Chi phí đo ngày 2026-11-24: 13 video + 2 ảnh ≈ 8 MB storage, +0,03 credits.
- Gỡ một video: giảng viên đổi loại bài về "Bài đọc" trong trình soạn bài, gửi duyệt, rồi xóa asset trong thư viện media.

## 12. Kiểm tra định kỳ nội dung và SEO

- `pnpm content:check`: phân tích cú pháp mọi khối code js/ts/tsx/json trong bài học và bài hướng dẫn đã xuất bản, chỉ đọc DB. Chạy sau mỗi đợt duyệt nội dung.
- `pnpm seo:check --base=<url>`: với mọi URL trong sitemap, kiểm tra:
  - status 200;
  - canonical tuyệt đối và khớp URL;
  - có title và description;
  - JSON-LD parse được, đủ trường bắt buộc, không có rating/giá giả;
  - URL không tồn tại trả 404 thật.

  Sau khi deploy, chạy thêm `--production` để bắt lỗi trang trong sitemap bị noindex. Lệnh này không thay cho Search Console.
- `/admin/coverage`: hàng đợi nội dung cần review hoặc cập nhật (chưa review, nội dung đổi sau review, quá 180 ngày, có báo lỗi mở).
