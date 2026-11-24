# CLAUDE.md

Nền tảng học trực tuyến — Next.js 16 App Router + MongoDB Atlas + Cloudinary + JWT (Auth.js). Đặc tả gốc: `PROMPT_CLAUDE_LMS_NEXTJS.md`.

## Bắt đầu mỗi phiên

1. Đọc `docs/PROGRESS.md` (checkpoint, câu hỏi mở, việc tiếp theo) rồi `git status`/`git diff`. Không scaffold lại.
2. Chỉ đọc tài liệu chi tiết liên quan tới task: `docs/DATA_MODEL.md`, `docs/AUTH_SECURITY.md`, `docs/MEDIA_PIPELINE.md`, `docs/API_CONTRACTS.md`, `docs/TECH_DECISIONS.md`.

## Lệnh xác minh

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm test:e2e` (cần `pnpm dev:db` + seed) · `pnpm db:indexes` · `pnpm db:seed`

Script ngoài Next chạy bằng `tsx --conditions=react-server` (đã cấu hình trong package.json). `.env` của chủ dự án chứa credentials thật: khi chạy thử cục bộ, truyền `MONGODB_URI` của DB cục bộ trên dòng lệnh, không tạo `.env.local`, không in giá trị secret.

Ghi lệnh đã chạy + kết quả thật vào `docs/PROGRESS.md`. Không báo pass nếu chưa chạy.

## Ràng buộc không suy ra được từ code

- Trao đổi/tài liệu tiếng Việt; identifier tiếng Anh.
- Không thay MongoDB/Cloudinary/Next.js; không thêm Mongoose, Redis, backend riêng.
- `next-auth` chỉ được import trong `src/server/auth/**`. Mọi chỗ khác dùng `getViewer()`/`requireViewer()`/`requireRole()`.
- Mỗi Server Action/Route Handler tự kiểm tra quyền; proxy chỉ là kiểm tra lạc quan.
- Không đọc cookie/session trong scope `'use cache'`.
- Không gửi `correctOptionId`/`explanation` trước khi nộp quiz; điểm chỉ tính server.
- Ghi chú (`notes`) chỉ chủ sở hữu đọc được — không có API cho giảng viên/admin.
- Binary media không đi qua Next.js; tham số upload Cloudinary do server quyết định; finalize luôn tra Admin API.

## Bảo mật & ngân sách

- Không commit `.env`; không log password/token/cookie/nội dung ghi chú; không đặt secret vào `NEXT_PUBLIC_*`.
- Không tự upload media thật trong seed/test/CI; không load-test Atlas/Cloudinary Free.
- Không nâng gói, bật add-on trả phí, deploy hay công khai dữ liệu khi chưa được yêu cầu.
- Cloudinary Free không có hard cap: không hứa "không vượt quota"; signed URL không hết hạn.
