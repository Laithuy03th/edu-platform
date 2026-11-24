# CONTENT_COVERAGE — kiến thức đã xuất bản, phiên bản và phần còn thiếu

Ngày kiểm tra: 2026-11-24. Nguồn: Atlas `tuhoc_dev` (đếm/đọc, không ghi) và [scripts/seed-content.ts](../scripts/seed-content.ts).

> Phải phân biệt **độ phủ taxonomy** (danh mục có thể tổ chức) với **độ phủ kiến thức đã được review**. Hiện **chưa có** nội dung nào đạt chuẩn "chuyên sâu đã review" theo §33.2. Website chưa đạt mục tiêu "nền tảng học lập trình chuyên sâu".

## 1. Nội dung đang xuất bản (Atlas)

| Khóa | Chương | Bài | Loại bài | Quiz | Dự án |
|---|---|---|---|---|---|
| Next.js cơ bản cho người mới (`nextjs-co-ban`) | 3 | 7 | 7 bài đọc | quiz chương + bài đầu vào | Blog cá nhân, rubric 4 tiêu chí |
| MongoDB cho web developer (`mongodb-cho-web-developer`) | 3 | 6 | 6 bài đọc | quiz chương | — |
| **Tổng** | 6 | **13** | 13 bài đọc, **0 video** | 6 (Atlas `quizzes`) | 1 |

Lộ trình: 1 (`full-stack-javascript-can-ban`). Categories: 3. Review/Q&A/bài nộp thật: 0.

## 2. Đánh giá độ sâu theo template bài học (§33.2)

Độ dài nội dung bài: **407–888 ký tự**, tức là khoảng 1–2 đoạn văn mỗi bài.

| Tiêu chí §33.2 | Hiện trạng |
|---|---|
| Mục tiêu, cấp độ, thời gian | Có (`objectives`, `durationSeconds`, level ở cấp khóa) |
| Technology/version đã kiểm thử, OS/shell | **Không có** field `testedVersion` hay environment |
| Mở bài bằng vấn đề cụ thể, giải thích từng bước | Một phần, nhưng rất ngắn |
| Ví dụ code có filename, output mong đợi, nút copy | Chỉ vài đoạn code ngắn; không có output hay filename (T07) |
| Lỗi thường gặp, cách debug | **Không có** |
| Bài thực hành có gợi ý nhiều mức và lời giải | **Không có** (chỉ có quiz trắc nghiệm) |
| Link tài liệu chính thức, nguồn | Không có |
| Author, reviewer, reviewedAt, changelog | **Không có**. Tác giả hiển thị là "Giảng viên Demo" (tài khoản seed) |

**Kết luận:** 13 bài hiện tại là **nội dung demo để chạy luồng sản phẩm**, không phải nội dung chuyên sâu đã review. Không được trình bày chúng như khóa học hoàn chỉnh.

## 3. Độ phủ taxonomy (§32.2)

| Mảng | Taxonomy trong hệ thống | Nội dung đã xuất bản | Đã review chuyên môn |
|---|---|---|---|
| Nền tảng web, JS/TS | Chưa có (chỉ có category) | Gián tiếp qua bài Next.js | 0 |
| Frontend: React/Next.js | category | 7 bài demo | 0 |
| Database: MongoDB | category | 6 bài demo | 0 |
| Mọi mảng khác (Python, Java, C#, Go, Rust, SQL, DevOps, QA, Security, Data/AI…) | Không có | 0 | 0 |

Hiện **không có trang placeholder rỗng nào** được public. Đây là điểm đúng theo §32.2 và phải giữ.

## 4. Kế hoạch nội dung đợt 1 (đề xuất, chưa phải cam kết đã có)

Theo §32.4/§38.2, cụm đầu tiên là: web foundations → JavaScript/TypeScript → React/Next.js → MongoDB → dự án full-stack. Mục tiêu đợt 1 là **12–20 bài chuyên sâu đã review**, 1 lộ trình và 1 dự án xuyên suốt.

| # | Bài đề xuất | Loại | Phiên bản cần ghi |
|---|---|---|---|
| 1 | Request đi qua frontend, backend và database như thế nào | foundation | HTTP/1.1, trình duyệt hiện hành |
| 2 | Cài Node.js, pnpm, biến môi trường (Windows/PowerShell và macOS/Linux) | environment recipe | Node 22 LTS, pnpm 10 |
| 3 | Kết nối Atlas từ Next.js ở server, quản lý connection | how-to | Next 16.4, driver mongodb 7.9 |
| 4 | Phân biệt lỗi DNS, IP allowlist, auth và TLS khi kết nối Atlas | troubleshooting | (dựa trên lỗi thật đã gặp trong dự án này: TLS alert 80) |
| 5 | Google login, JWT session, role/ownership | security | next-auth 5 beta.32 |
| 6 | Mô hình course/chapter/lesson/enrollment và index | data modeling | MongoDB 8 |
| 7 | Upload Cloudinary có reservation/finalize và ngân sách | media | cloudinary 2.11 |
| 8 | Kiểm thử enrollment, chấm quiz và quyền truy cập chéo | testing | Vitest 5.1, Playwright 1.65 |
| 9 | Dự án: mini LMS có repo hướng dẫn, rubric và checklist | project | — |

**Điều kiện xuất bản mỗi bài:**
- Đủ template §33.2.
- Code chạy được, có lệnh verify.
- Có author **và reviewer là người thật** (Claude chỉ hỗ trợ soạn thảo; theo §33.3, AI không thay thế review chuyên môn).
- Ghi rõ `testedVersion` và `reviewedAt`.

## 5. Phụ thuộc kỹ thuật trước khi viết nội dung

1. T01/T06: thêm `technologies`, `technologyVersions`, các field author/reviewer/testedVersion/reviewedAt.
2. T07: code block có highlight, copy, filename và output.
3. T05: loại nội dung tutorial/reference có URL public riêng, không bắt buộc ghi danh.
4. Quy trình review: người viết (giảng viên) → reviewer → admin xuất bản.

Danh sách task chi tiết nằm trong [REMAINING_WORK.md](REMAINING_WORK.md).
