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

Email ở development được ghi ra `.data/mail/*.json` (mở file để lấy link xác minh/đặt lại mật khẩu).

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

Atlas Free không có backup tự động. Định kỳ dùng `mongodump` để xuất database, rồi `mongorestore` thử vào một database riêng (ví dụ `tuhoc_restore_test`) để chắc bản sao dùng được. Không commit file backup vì chứa dữ liệu cá nhân.

## 9. Rollback release

`git revert <commit>` rồi deploy lại. Các thay đổi schema hiện tại đều tương thích ngược (chỉ thêm field, có schemaVersion).
