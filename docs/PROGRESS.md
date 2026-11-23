# Tiến độ

## Checkpoint hiện tại

- **Phase:** 0 — Khảo sát và chốt thiết kế. **Trạng thái: hoàn thành bản nháp, chờ chủ dự án duyệt.**
- **Ngày:** 2026-11-23
- **Git:** repo chưa được khởi tạo (sẽ `git init` ở P1.1).
- **Code:** chưa có. Không có test/build nào được chạy (chưa có gì để chạy).
- **Môi trường dev đã kiểm tra:** Node v22.13.0, pnpm 11.25.0, git 2.51.0, Windows 11.

### Khảo sát repo (2026-11-23)

Thư mục `d:\tuhoc` chỉ có `PROMPT_CLAUDE_LMS_NEXTJS.md` (đặc tả). Không có package manifest, không có git, không có hướng dẫn khác → repo trống, áp dụng nhánh "đề xuất cấu trúc, chưa cài package".

### File đã tạo ở Phase 0

| File | Nội dung |
|---|---|
| `docs/PRD.md` | phạm vi MVP/mở rộng/ngoài phạm vi, ma trận feature → phase, màn hình |
| `docs/ARCHITECTURE.md` | module, ranh giới server/client, caching, CSRF/origin, tradeoff |
| `docs/DATA_MODEL.md` | 31 collection, field, index, retention, dữ liệu nhạy cảm, state machine khóa học |
| `docs/AUTH_SECURITY.md` | Credentials/Google/JWT/cookie, revoke, linking, ma trận quyền, rate limit |
| `docs/MEDIA_PIPELINE.md` | reservation/upload/finalize/delivery/xóa/reconcile, kill switch |
| `docs/FREE_TIER_BUDGET.md` | hạn mức có nguồn + ngày kiểm tra, ngân sách nội bộ, phép tính |
| `docs/API_CONTRACTS.md` | ma trận action/endpoint, mã lỗi |
| `docs/TEST_PLAN.md` | ma trận rủi ro → test (tất cả `not-run`) |
| `docs/TECH_DECISIONS.md` | ADR-001…020, bảng phiên bản |
| `docs/IMPLEMENTATION_PLAN.md` | task theo phase, nghiệm thu, rủi ro |
| `CLAUDE.md`, `README.md` | hướng dẫn ngắn |
| `.env.example`, `.env` (giá trị trống), `.gitignore` | cấu hình mẫu |

Chưa tạo (đúng kế hoạch): `docs/DEPLOYMENT.md`, `docs/RUNBOOK.md` (Phase 6).

## Câu hỏi mở cho chủ dự án (ảnh hưởng thiết kế)

1. **Thư viện auth (ADR-002):** Auth.js/next-auth v5 vẫn beta và chỉ nhận vá bảo mật (đã nhập vào Better Auth). Đề xuất: **dùng next-auth 5.0.0-beta.32 (pin exact) bọc sau `src/server/auth`** để giữ đúng yêu cầu JWT session. Phương án khác: Better Auth (bảo trì tích cực nhưng session lưu DB — trái đặc tả mục 6), hoặc tự quản session bằng `jose` + `openid-client`. Anh/chị chọn phương án nào?
2. **Phát video (ADR-010):** Đề xuất video bài thường dùng `authenticated` + signed URL cấp theo quyền (URL không hết hạn, chia sẻ được — Free không có token/hết hạn). Hay chấp nhận tất cả video demo ở chế độ public cho đơn giản?
3. **Video demo:** Ai cung cấp ~20 video (≤ 20 MiB, ≤ 5 phút, có quyền sử dụng)? Tôi không thể quay video thật; tôi có thể viết nội dung bài đọc/quiz/rubric và kịch bản video. Nếu chưa có video, đề xuất bắt đầu với 2–4 video ngắn để kiểm chứng pipeline.
4. **Email:** Anh/chị có domain riêng để xác minh với nhà cung cấp email (vd Resend) không, hay dùng SMTP của một hộp thư có sẵn (vd Gmail + App Password)? Ảnh hưởng tới `MAIL_FROM` và khả năng gửi tới người nhận bất kỳ.
5. **Hosting khi deploy sau này:** Dự án có phải phi thương mại (cá nhân/học tập) không? Vercel Hobby là ứng viên mặc định nhưng có điều kiện sử dụng; quyết định chỉ cần trước Phase 6.

Phần không phụ thuộc các câu trả lời này có thể bắt đầu ngay khi thiết kế được duyệt (P1.1–P1.7, P1.9, P1.13).

## Việc tiếp theo

1. Chủ dự án review tài liệu Phase 0 và trả lời câu hỏi mở.
2. Sau khi duyệt: bắt đầu Phase 1 theo [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Blockers

- Không có blocker cho Phase 1 phần không cần credentials.
- Cần credentials (người dùng tự điền vào `.env`): Atlas URI (tùy chọn ở Phase 1), Google OAuth, SMTP, Cloudinary (Phase 3).

## Nhật ký kiểm tra (lệnh thực tế)

| Ngày | Lệnh | Kết quả |
|---|---|---|
| 2026-11-23 | `node -v; pnpm -v; git --version` | v22.13.0; 11.25.0; 2.51.0 |
| 2026-11-23 | `npm view <pkg> dist-tags` cho next, next-auth, better-auth, mongodb, zod, tailwindcss, vitest, @playwright/test, @node-rs/argon2, argon2, cloudinary, nodemailer, jose, typescript, eslint, prettier, react-hook-form | xem bảng phiên bản ở TECH_DECISIONS |
| 2026-11-23 | `npm view next-auth@5.0.0-beta.32 peerDependencies` | `next: ^14 \|\| ^15 \|\| ^16` |
| 2026-11-23 | `npm view typescript-eslint peerDependencies` | `typescript >=4.8.4 <6.1.0` |
