# Triển khai (chuẩn bị — chưa deploy)

> Chỉ deploy khi chủ dự án yêu cầu. Không bật tính năng trả phí, không công khai dữ liệu thật.

## Hosting đề xuất: Vercel Hobby (cần xác nhận điều khoản phi thương mại)

| Yêu cầu của app | Vercel Hobby (docs 2026-11-23) |
|---|---|
| Node.js runtime (Argon2 native, MongoDB driver) | Node 22/24/26; dùng 22.x cho khớp dev |
| Request body nhỏ (upload đi thẳng Cloudinary) | Giới hạn 4,5 MB, app dùng tối đa 200 KB cho Server Action |
| Không cần cron tần suất cao | Cron tối thiểu 1 lần/ngày; usage có thể đồng bộ thủ công |
| CPU thấp | 4 CPU-giờ active/tháng — đo lại Argon2 sau khi deploy |

Lựa chọn khác: bất kỳ hosting Node.js nào chạy được `pnpm build && pnpm start` (Docker/VPS). Không dùng Edge runtime.

## Checklist

1. Atlas: user `readWrite`, Network Access cho hosting (Vercel không có IP tĩnh trên Hobby → `0.0.0.0/0` kèm mật khẩu mạnh), chạy `pnpm db:indexes` từ máy có quyền.
2. Biến môi trường trên hosting (không đặt secret vào `NEXT_PUBLIC_*`):
   - `APP_ENV=production`, `APP_URL=https://<domain>`, `TRUST_PROXY=true`
   - `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_MAX_POOL_SIZE=5`
   - `AUTH_SECRET`, `RATE_LIMIT_SECRET` (mới, không dùng lại giá trị dev), `AUTH_TRUST_HOST=true` nếu không phải Vercel
   - `AUTH_GOOGLE_ID/SECRET` + redirect URI `https://<domain>/api/auth/callback/google`
   - `MAIL_TRANSPORT=smtp`, `SMTP_*`, `MAIL_FROM` (bắt buộc — production từ chối adapter file)
   - `CLOUDINARY_*`; webhook tự bật khi `APP_URL` là HTTPS (`/api/webhooks/cloudinary`)
3. Build: `pnpm install --frozen-lockfile && pnpm build`.
4. Sau deploy: tạo admin bằng `pnpm admin:create` (chạy từ máy có quyền DB), vào `/admin/media` bấm "Đồng bộ số liệu", kiểm tra CSP trên trình duyệt (console không có vi phạm), thử đăng nhập Google, thử gửi email.
5. Không chạy `db:seed` lên production trừ khi muốn nội dung mẫu (cần `--instructor-email`; không tạo tài khoản demo ở production).

## Bảo mật khi chạy production

- Cookie phiên tự thành `__Secure-` + `Secure` khi chạy HTTPS; HSTS bật trong `next.config.ts` khi `NODE_ENV=production`.
- `TRUST_PROXY=true` chỉ khi đứng sau proxy/hosting đã biết (rate limit dùng IP từ header của hosting).
- Log JSON ra stdout, đã che password/token/cookie/nội dung ghi chú.
