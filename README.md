# Tự Học — nền tảng học trực tuyến (demo)

Học theo khóa học và lộ trình: bài đọc, video ngắn, quiz, bài tập dự án có rubric. Điểm khác biệt: ghi chú theo timestamp video, ôn tập câu sai, tự đánh giá mức độ hiểu, đánh giá đầu vào, lộ trình theo mục tiêu, chế độ tiết kiệm dữ liệu, hồ sơ thành quả.

> **Trạng thái:** Phase 0 — tài liệu thiết kế, **chưa có mã nguồn**. Xem [docs/PROGRESS.md](docs/PROGRESS.md).

## Stack dự kiến

Next.js 16.4 (App Router, TypeScript 6 strict) · MongoDB Atlas (driver chính thức + Zod) · Cloudinary · Auth.js v5 (JWT session, Credentials + Google) · Argon2id · Tailwind CSS 4 + shadcn/ui · Vitest + Playwright · pnpm.

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [PRD](docs/PRD.md) | phạm vi, ma trận feature → phase |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | kiến trúc, ranh giới server/client, caching |
| [DATA_MODEL](docs/DATA_MODEL.md) | collections, index, retention |
| [AUTH_SECURITY](docs/AUTH_SECURITY.md) | đăng nhập, JWT, thu hồi phiên, phân quyền |
| [MEDIA_PIPELINE](docs/MEDIA_PIPELINE.md) | upload/finalize/phát/xóa media |
| [FREE_TIER_BUDGET](docs/FREE_TIER_BUDGET.md) | hạn mức miễn phí và ngân sách nội bộ |
| [API_CONTRACTS](docs/API_CONTRACTS.md) | actions/endpoints |
| [TEST_PLAN](docs/TEST_PLAN.md) | ma trận rủi ro → test |
| [TECH_DECISIONS](docs/TECH_DECISIONS.md) | ADR + phiên bản |
| [IMPLEMENTATION_PLAN](docs/IMPLEMENTATION_PLAN.md) | kế hoạch theo phase |

## Thiết lập (sẽ hoàn thiện ở Phase 1)

1. Node.js ≥ 22.13, pnpm.
2. Điền `.env` theo hướng dẫn trong `.env.example` (giá trị trống ⇒ dùng mặc định cho biến không bí mật; thiếu secret bắt buộc ⇒ app báo lỗi thiết lập rõ ràng).
