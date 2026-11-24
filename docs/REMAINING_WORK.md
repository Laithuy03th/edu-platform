# REMAINING_WORK — việc còn lại theo ưu tiên (PROMPT V2 §41)

Cập nhật: 2026-11-24, sau đợt audit (FEATURE/MEDIA/UI/SEO/CONTENT).

- **P0:** chặn tính đúng, an toàn hoặc khả năng chạy thật.
- **P1:** phạm vi sản phẩm chính.
- **P2:** mở rộng.
- **Người làm:** **Chủ** là việc chủ dự án phải tự làm hoặc quyết định (tài khoản ngoài, chi phí, quyền); **Repo** là việc Claude làm được trong repository.

## Đã đóng trong lượt này

| Việc | Bằng chứng |
|---|---|
| Soft-404 ở trang public (status 200 cho slug không tồn tại) | Production build, Googlebot: 404 (SEO_AUDIT #1) |
| Canonical tuyệt đối, OG đầy đủ, chính sách index cho filter/phân trang, JSON-LD, lastmod đúng, noindex khi không phải production | SEO_AUDIT #2–#7; unit test `seo-mail.test.tsx` |
| Email: có `SMTP_HOST` thì gửi thật kể cả khi dev (trước đây dev luôn ghi file kể cả khi đã điền SMTP); port 465 tự bật TLS; validate `MAIL_FROM`; lệnh `pnpm mail:check` | unit test `mailSettings`; chạy `mail:check` với cấu hình hiện tại và cấu hình giả |
| Email giao dịch đổi sang màu brand | `templates.ts` |

## P0

| ID | Việc | Người | Phụ thuộc | Tiêu chí đóng |
|---|---|---|---|---|
| P0-1 (O02) | **Cấu hình SMTP miễn phí** (Gmail App Password hoặc Brevo) vào `.env` | **Chủ** | — | `pnpm mail:check` báo "OK"; `pnpm mail:check --send-to=<email của bạn>` nhận được thư |
| P0-2 (A01/A02) | Sau P0-1: đăng ký 1 tài khoản thật qua UI trên Atlas → nhận mail xác minh → xác minh → quên mật khẩu → đặt lại → phiên cũ bị đăng xuất | Chủ + Repo | P0-1 | Ghi vào PROGRESS: thời gian và kết quả (không ghi token/link) |
| P0-3 (M09) | **Một ca thử media thật qua UI:** 1 video ≤ 20 MiB, ≤ 5 phút, do chủ dự án có quyền dùng; usage trước/sau; phát, resume, transcript; cleanup chạy thử trước khi xóa thật | **Chủ** cho phép và cung cấp file; Repo ghi bằng chứng | — | MEDIA_AUDIT §4 điền đủ; M01/M02/M05/M08 chuyển khỏi MOCK_ONLY/BLOCKED |
| P0-4 (A05) | Thử thật: liên kết Google vào tài khoản mật khẩu, hủy liên kết, tài khoản bị khóa đăng nhập bằng Google | Chủ + Repo | — | 3 ca có kết quả ghi trong PROGRESS |
| P0-5 | **Xoay vòng `AUTH_SECRET`, `RATE_LIMIT_SECRET`** (một phần đầu của chúng từng bị in ra log ngày 2026-11-24) | **Chủ** | — | Hai giá trị mới; đăng nhập lại được |
| P0-6 | Đổi mật khẩu hoặc xóa 3 tài khoản demo trên Atlas trước khi public | Chủ | — | Không còn mật khẩu demo đã biết |

## P1: nền tảng nội dung IT (Giai đoạn C–D của V2)

| ID | Việc | Phụ thuộc | Tiêu chí đóng |
|---|---|---|---|
| ~~P1-T1 (T01)~~ ✅ 2026-11-24 | Taxonomy nhiều chiều: `technologies` (type: language/framework/library/runtime/database/tool…), `domains`, `technologyVersions` (status, testedRange, reviewedAt), alias; admin CRUD; không public trang rỗng | — | Integration test: alias js→javascript; slug unique; vòng lặp prerequisite bị chặn |
| P1-T2 (T06) | ✅ một phần: testedVersion theo công nghệ, review chuyên môn cấp khóa, contentUpdatedAt. Còn: reviewer theo bài, changelog | P1-T1 | Hiển thị trên trang khóa/bài; chỉ cập nhật `updatedAt` công khai khi nội dung đổi thật |
| ~~P1-T3 (T07)~~ ✅ (còn smoke-check snippet) | Code block: highlight ở server (không tăng JS client), nút sao chép, filename, output mong đợi | — | Unit test XSS vẫn pass; Lighthouse/TBT không xấu đi |
| P1-T4 (T05/S06) | Loại nội dung **tutorial/reference** public (`/huong-dan/[slug]`), có mục lục, anchor, breadcrumb hiển thị; JSON-LD Article chỉ với dữ liệu thật | P1-T2, P1-T3 | Status, canonical, sitemap của URL mới đúng (cập nhật SEO_AUDIT) |
| ~~P1-T5 (T02)~~ ✅ | Technology hub `/cong-nghe/[slug]`: **chỉ** sinh trang khi có ≥ N nội dung đã review; liên kết hub → bài → dự án | P1-T1, P1-T4 | Không có hub rỗng trong sitemap |
| P1-T6 (T04) | Environment recipe (Windows/PowerShell và macOS/Linux): setup/verify/run/test/expected output | P1-T1 | Tối thiểu 1 recipe có lệnh đã chạy thật |
| P1-C1 | **Nội dung đợt 1:** 12–20 bài theo CONTENT_COVERAGE §4, đủ template §33.2 | P1-T2…T4 | Mỗi bài có reviewer là người thật và code đã chạy. Claude soạn nháp; **chủ dự án/reviewer duyệt** |
| P1-T7 (T06) | Nút "Báo lỗi nội dung" (version + vị trí) → inbox giảng viên | P1-T2 | Test quyền: chỉ giảng viên của khóa/admin xem được |

## P1: UI/SEO/media

| ID | Việc | Tiêu chí đóng |
|---|---|---|
| P1-U1 | Hệ bìa khóa học theo technology/cấp độ (SVG xác định, 16:9) thay cho gradient theo hash | Screenshot 375/1440 |
| P1-U2 | Profile và giảm TBT của `/courses` trên mobile (660 ms trong lab) | TBT~ < 300 ms ở cùng phương pháp đo |
| P1-U3 | Screenshot audit learning workspace và admin ở 375/768/1440; zoom 200% | UI_AUDIT cập nhật |
| P1-S1 | OG image mặc định 1200×630 (tĩnh) | Thẻ `og:image` có mặt |
| P1-S2 | Lịch sử slug và redirect 308 khi đổi slug | Integration test |
| P1-M1 (M03) | Media: alt/caption/license/source cho ảnh; ảnh bìa từ Cloudinary với rendition cố định | Sau P0-3 |
| P1-M2 (M04) | Caption `<track>` (WebVTT do giảng viên cung cấp), chương/mốc thời gian | Sau P0-3 |
| P1-L1 (L10) | Bookmark course/lesson/reference, unique theo user+target | Integration test |
| P1-P1 (P04) | Bài tập đọc code / tìm lỗi / sửa code có hints nhiều mức và lời giải mở chủ động | Chấm ở server; đáp án không nằm trong payload trước khi nộp |
| P1-A1 | Test còn thiếu: A08 (đơn giảng viên), D01 (chấp nhận câu trả lời), L05 E2E, L11 export | Test pass |

## P2

| ID | Việc |
|---|---|
| P2-1 (P05) | Playground HTML/CSS/JS cách ly: sandbox iframe với origin riêng, CSP, không có cookie; có nút stop/reset. Chỉ làm sau khi có thiết kế |
| P2-2 (P06) | Python/SQL WASM (roadmap; chỉ tải khi người học mở) |
| P2-3 (U07) | Dark theme |
| P2-4 (L12) | Mục tiêu tuần do người học tự đặt, không gây áp lực |
| P2-5 (S05) | Trang xem video public và VideoObject, khi có video thật và đã tính ngân sách băng thông |

## Cần chủ dự án quyết định

1. **Có mở bài đọc chọn lọc ra public** (route `/huong-dan/...`) để xây kho kiến thức và SEO không? Mặc định hiện tại: không. Bài preview đang nằm dưới `/learn` và bị Disallow.
2. **Reviewer chuyên môn** cho nội dung đợt 1 là ai? Không có reviewer thì bài chỉ được để ở trạng thái nháp.
3. **Ca thử video (P0-3):** có cho phép không, và file video nào được dùng?
4. **Deploy/domain:** chưa làm. Chỉ chuẩn bị khi có yêu cầu (DEPLOYMENT.md).
