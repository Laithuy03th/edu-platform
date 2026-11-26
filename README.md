# Tự Học — nền tảng học trực tuyến (demo)

Học theo khóa học và lộ trình: bài đọc, video ngắn, quiz chấm ngay, bài tập dự án có rubric. Điểm khác biệt: ghi chú theo thời điểm video, ôn tập câu sai theo lịch 1–3–7–14 ngày, tự đánh giá mức độ hiểu, đánh giá đầu vào, lộ trình theo mục tiêu, chế độ tiết kiệm dữ liệu, hồ sơ thành quả opt-in. Playground chạy code ngay trên trình duyệt (HTML/CSS/JS, SQL với SQLite, Python với Pyodide) có thử thách chấm tự động — code chạy trong khung cách ly, không chạy trên server.

Trạng thái: Phase 1–6 đã triển khai — xem [docs/PROGRESS.md](docs/PROGRESS.md).

## Stack

Next.js 16.4 (App Router, TypeScript 6 strict) · MongoDB (driver chính thức + Zod) · Cloudinary (upload ký số trực tiếp từ trình duyệt) · next-auth 5 beta (JWT/JWE, email/mật khẩu + Google) · Argon2id · Tailwind CSS 4 (design token đỏ nhạt, font Be Vietnam Pro) · Vitest + Playwright · pnpm.

## Chạy thử nhanh (không cần Atlas)

Yêu cầu: Node.js ≥ 22.13, pnpm.

```bash
pnpm install
pnpm dev:db                                  # terminal 1: MongoDB cục bộ 127.0.0.1:27027
MONGODB_URI="mongodb://127.0.0.1:27027/?replicaSet=rs0" SEED_DEMO_PASSWORD="mat-khau-demo-du-dai" pnpm db:seed
MONGODB_URI="mongodb://127.0.0.1:27027/?replicaSet=rs0" pnpm dev
```

Đăng nhập: `hocvien@demo.local`, `giangvien@demo.local`, `admin@demo.local` với mật khẩu `SEED_DEMO_PASSWORD`. Email (xác minh, đặt lại mật khẩu) nằm trong `.data/mail/`.

## Chạy với Atlas/Cloudinary thật

Điền `.env` theo `.env.example`, thêm IP vào Atlas Network Access, rồi `pnpm db:indexes` (và tùy chọn `pnpm db:seed`). Chi tiết: [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Lệnh

| Lệnh | Mục đích |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Phát triển / build / chạy production |
| `pnpm lint` · `pnpm typecheck` | Kiểm tra tĩnh |
| `pnpm test` | Unit + integration (MongoDB in-memory, không cần credentials) |
| `pnpm test:e2e` | Playwright trên build production (cần DB cục bộ đã seed) |
| `pnpm db:indexes` · `pnpm db:seed` | Tạo index · dữ liệu mẫu (idempotent) |
| `pnpm admin:create -- --email … --yes` | Cấp quyền admin (cần `ALLOW_ADMIN_BOOTSTRAP=true`) |
| `pnpm media:cleanup` · `pnpm media:reconcile` | Dọn file mồ côi · đối soát quota (mặc định dry-run) |
| `pnpm usage:sync` | Đồng bộ usage Cloudinary/MongoDB thủ công |
| `pnpm dev:db` · `pnpm bench:argon2` | MongoDB cục bộ · đo thời gian hash |

## Luồng demo

1. Khách: trang chủ → catalog (tìm không dấu) → chi tiết khóa (xem video học thử) → học thử bài preview → `/playground`, `/playground/sql`, `/playground/python`.
2. Học viên: đăng ký → xác minh email → đăng ký khóa → học, ghi chú theo timestamp, đánh dấu hoàn thành, tự đánh giá → quiz → ôn tập câu sai ở `/review` → nộp dự án → hồ sơ thành quả → lưu code playground vào tài khoản → Cài đặt → Bảo mật: tải dữ liệu của tôi / xóa tài khoản.
3. Giảng viên: `/instructor` → tạo khóa, chương, bài, quiz, rubric, media → gửi duyệt → chấm bài nộp, trả lời hỏi đáp → **Phân tích** khóa (số liệu tổng hợp: phễu, tỉ lệ hoàn thành từng bài, câu quiz khó).
4. Admin: `/admin` → duyệt khóa, quản lý người dùng/đơn giảng viên, kiểm duyệt, media & quota, audit, **Kiểm tra SEO** (`/admin/seo`).

## Tài liệu

[PRD](docs/PRD.md) · [Kiến trúc](docs/ARCHITECTURE.md) · [Dữ liệu](docs/DATA_MODEL.md) · [Bảo mật](docs/AUTH_SECURITY.md) · [Media](docs/MEDIA_PIPELINE.md) · [Ngân sách free tier](docs/FREE_TIER_BUDGET.md) · [API](docs/API_CONTRACTS.md) · [Kiểm thử](docs/TEST_PLAN.md) · [Quyết định kỹ thuật](docs/TECH_DECISIONS.md) · [Triển khai](docs/DEPLOYMENT.md) · [Runbook](docs/RUNBOOK.md) · [Search Console](docs/SEARCH_CONSOLE.md) · [Tiến độ](docs/PROGRESS.md)
