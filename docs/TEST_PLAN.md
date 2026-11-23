# Kế hoạch kiểm thử

> Trạng thái: **chưa có test nào được chạy** (Phase 0 chỉ có tài liệu). Cột "Trạng thái" dùng: `not-run` / `pass` / `fail` / `blocked (lý do)`. Mỗi lần chạy ghi lệnh thực tế và kết quả vào [PROGRESS.md](PROGRESS.md).

## 1. Tầng kiểm thử

| Tầng | Công cụ | Phạm vi | Cần credentials? |
|---|---|---|---|
| Unit | Vitest | policy, validation (Zod), chuẩn hóa email/mật khẩu/tiếng Việt, lịch ôn tập, chấm quiz, tính tiến độ, rubric, DAG lộ trình, ký params Cloudinary, verify webhook signature (vector cố định) | Không |
| Integration | Vitest + `mongodb-memory-server` (replica set) | service + repo với DB thật: unique/race, transaction, rate limit, revoke, quota reservation song song | Không |
| E2E | Playwright trên `next build && next start` + memory DB + email adapter `file` | luồng trọng yếu (§4) | Không (Google/Cloudinary bị tắt hoặc stub **có nhãn**) |
| Provider (thủ công) | script `pnpm test:provider` | Google OIDC thật, Cloudinary upload/finalize/signed URL/usage thật, SMTP thật | Có — chạy tay, không trong CI |

Guard: `tests/setup` từ chối chạy nếu `MONGODB_URI` không phải memory server/localhost hoặc `APP_ENV !== 'test'`. Mỗi file integration dùng database tên ngẫu nhiên và drop khi xong.

Nguyên tắc: test hành vi qua API công khai của service (input → trạng thái DB/kết quả), không assert thứ tự gọi mock. Mock chỉ ở ranh giới provider (Cloudinary Admin API, SMTP), và test dùng mock **được ghi rõ** là không chứng minh provider thật.

## 2. Ma trận rủi ro → test

Mức rủi ro: **C** (critical — bảo mật/mất dữ liệu), **H**, **M**.

### 2.1 Authentication & authorization (Phase 1)

| ID | Rủi ro | Mức | Test | Tầng | Trạng thái |
|---|---|---|---|---|---|
| A1 | Lưu plaintext mật khẩu | C | đăng ký → `passwordHash` bắt đầu `$argon2id$`, không chứa mật khẩu | Int | not-run |
| A2 | Hai request đăng ký cùng email tạo 2 user | C | `Promise.all` 2 lần đăng ký → đúng 1 user | Int | not-run |
| A3 | Lộ email tồn tại qua login/forgot | H | thông báo giống nhau cho email không tồn tại vs sai mật khẩu | Int | not-run |
| A4 | Brute force login | H | 6 lần sai cùng email → 429 + Retry-After; không khóa vĩnh viễn | Int | not-run |
| A5 | Token reset dùng lại/hết hạn/đồng thời | C | dùng 2 lần → lần 2 fail; hết hạn → fail; 2 consume song song → đúng 1 thành công | Int | not-run |
| A6 | JWT cũ còn dùng được sau reset/đổi mật khẩu/logout-all | C | lấy token trước → thực hiện sự kiện → `getViewer` với token cũ trả null | Int | not-run |
| A7 | User bị khóa vẫn mutation | C | block → action bất kỳ trả 401/403 | Int | not-run |
| A8 | Student tự nâng role | C | `updateProfileAction` với `roles`, `status`, `emailVerifiedAt`, `authVersion` → bị bỏ qua | Int | not-run |
| A9 | Instructor A sửa khóa/media của B | C | mọi mutation course/chapter/lesson/media với khóa B → 403/404 | Int | not-run |
| A10 | Lesson mutation với chapterId của khóa khác | C | di chuyển lesson sang chapter của khóa khác → 404 | Int | not-run |
| A11 | Google chiếm tài khoản qua email trùng | C | policy `resolveGoogleSignIn`: email trùng, không link_intent → từ chối; có link_intent hợp lệ → link đúng user | Unit+Int (**OAuth thật cần test provider thủ công**) | not-run |
| A12 | Open redirect | H | `callbackUrl` = `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:` → `/dashboard` | Unit | not-run |
| A13 | Server Action thiếu Origin/khác Origin | H | gọi action với Origin lạ hoặc không có → 403 | Int | not-run |
| A14 | Hủy liên kết phương thức cuối cùng | H | user chỉ Google → unlink bị từ chối | Int | not-run |
| A15 | Mật khẩu Unicode NFC/NFD | M | đặt bằng NFC, đăng nhập bằng NFD → thành công; mật khẩu có khoảng trắng đầu/cuối giữ nguyên | Unit+Int | not-run |
| A16 | Secret lọt bundle client | C | build → grep `.next/static` không chứa giá trị secret test và tên biến server | Script | not-run |

### 2.2 Nội dung & học tập (Phase 2, 4)

| ID | Rủi ro | Mức | Test | Tầng | Trạng thái |
|---|---|---|---|---|---|
| C1 | Draft/pending lộ qua catalog/detail/preview/cache | C | khóa draft & pending với edits → không có trong list/search/detail; bản published cũ vẫn hiển thị nội dung cũ, không phải draft | Int+E2E | not-run |
| C2 | Instructor tự publish qua API | C | gọi `approveCourseAction` bằng instructor → 403 | Int | not-run |
| C3 | Admin duyệt bản khác bản đã nộp | H | sửa draft sau submit bị chặn; revision lệch → 409 | Int | not-run |
| C4 | Reorder mất/trùng ID, lost update | H | thiếu/trùng/ID khóa khác → 422; revision cũ → 409 | Int | not-run |
| C5 | Người chưa enroll đọc bài riêng | C | `getLearnPage`/`getPlaybackSourceAction` → 403; bài preview → ok | Int | not-run |
| C6 | Enrollment double submit | H | 2 enroll song song → 1 bản ghi, `enrollmentCount` +1 | Int | not-run |
| C7 | Enroll khóa archived/suspended/draft | H | → `INVALID_STATE` | Int | not-run |
| C8 | Progress regression do event cũ | H | event clientAt cũ hơn không ghi đè; `furthest` không giảm; `completedAt` không bị unset | Int | not-run |
| C9 | Vị trí không hợp lệ | M | NaN, Infinity, âm, > duration+2 → 422 | Unit | not-run |
| C10 | Mẫu số tiến độ sai | H | bài optional, bài bị gỡ, khóa thêm bài sau khi hoàn thành → đúng công thức ADR-007; `completedAt` cũ giữ | Unit+Int | not-run |
| C11 | Lộ đáp án trước khi nộp | C | DTO/RSC payload của quiz không chứa `correctOptionId`/`explanation` (kiểm tra cả HTML render) | Int+E2E | not-run |
| C12 | Client sửa điểm | C | gửi kèm `score`/`passed` → bị bỏ qua; điểm tính lại server | Int | not-run |
| C13 | Nộp quiz lặp | H | cùng submissionId 2 lần → 1 attempt, 1 lần cập nhật reviewItems | Int | not-run |
| C14 | Quiz đổi version | H | attempt cũ hiển thị theo quizVersion cũ; nộp với version cũ → `QUIZ_VERSION_CHANGED` | Int | not-run |
| C15 | Giữ quá 10 attempt | M | 12 lần nộp → còn 10, `attemptCount=12`, best/latest đúng | Int | not-run |
| C16 | Stored XSS (bài học, ghi chú, hỏi đáp, review) | C | payload `<script>`, `<img onerror>`, `[x](javascript:...)` render không thực thi | Unit (render) + E2E | not-run |
| C17 | Catalog nhận sort/filter tùy ý | H | `sort[$where]=...`, filter object → 422/bỏ qua | Unit | not-run |
| C18 | Tìm không dấu | M | "lap trinh" khớp "Lập trình"; "đ" ↔ "d" | Unit+Int | not-run |

### 2.3 Media & quota (Phase 3)

| ID | Rủi ro | Mức | Test | Tầng | Trạng thái |
|---|---|---|---|---|---|
| M1 | Xin upload cho khóa không có quyền | C | → 403 | Int | not-run |
| M2 | 2 reservation đồng thời vượt quota | C | quota còn 1 slot, 2 request song song → đúng 1 thành công | Int | not-run |
| M3 | Client sửa bytes/publicId/duration/resourceType | C | finalize chỉ dùng dữ liệu Admin API (mock có nhãn) → asset vi phạm bị reject + xóa | Int (mock) + Provider | not-run |
| M4 | Webhook/finalize lặp hoặc đến muộn | C | 2 finalize + 1 webhook → 1 asset, quota cộng 1 lần; reservation hết hạn → reject | Int | not-run |
| M5 | Webhook giả | C | chữ ký sai/timestamp > 2h → 401 | Unit (vector cố định) | not-run |
| M6 | Reservation treo | H | reconcile dry-run liệt kê; `--apply` hoàn quota đúng | Int | not-run |
| M7 | Xóa asset còn tham chiếu | C | `refs` có lesson_published → `MEDIA_IN_USE` | Int | not-run |
| M8 | Usage cũ/lỗi vẫn cấp chữ ký | H | snapshot > 24h hoặc lỗi → `USAGE_STALE` | Int | not-run |
| M9 | Video autoplay/preload hàng loạt | H | DOM: `preload="none"`, không `autoplay`; catalog không có `<video>`/URL video | E2E | not-run |
| M10 | Nhầm upload signature với delivery access | H | signed URL chỉ cấp sau `canReadLesson`; URL không ký của asset `authenticated` bị Cloudinary từ chối | Int + Provider | not-run |
| M11 | Ký tham số do client chọn | C | `requestUploadAction` với `public_id`/`folder`/`type` tùy ý trong input → bị bỏ qua, params ký đúng mẫu | Unit | not-run |

### 2.4 Điểm khác biệt (Phase 4–5)

| ID | Rủi ro | Mức | Test | Tầng | Trạng thái |
|---|---|---|---|---|---|
| D1 | Ghi chú sai chủ | C | user B list/search/update/delete note của A → không thấy/404 | Int | not-run |
| D2 | Timestamp ghi chú → seek | M | click timestamp → `currentTime` ≈ giá trị; data saver không tự tải video | E2E | not-run |
| D3 | Lịch ôn sai | H | đúng/sai liên tiếp → mốc 1/3/7/14; qua timezone (UTC+7 lúc 23:30) ngày tính đúng; double submit theo revision | Unit+Int | not-run |
| D4 | Gợi ý đầu vào sai/tự hoàn thành bài | H | điểm chủ đề < 60% → study_first đúng chương; không tạo `completedAt` | Unit+Int | not-run |
| D5 | Understanding ghi đè completion | M | đặt "Chưa hiểu" sau khi hoàn thành → completedAt giữ | Int | not-run |
| D6 | Rubric tổng sai / người lạ xem submission | C | tổng = Σ điểm, không vượt max; user khác/instructor khóa khác → 404 | Unit+Int | not-run |
| D7 | Public profile lộ dữ liệu riêng | C | DTO public không có email, điểm chi tiết, ghi chú, enrollment, submission chưa opt-in | Int | not-run |
| D8 | Path đếm trùng / mục bị gỡ | H | course + lesson của course đó trong cùng path → đếm 1 lần; mục unpublished → loại khỏi mẫu số + cảnh báo | Unit | not-run |
| D9 | Chu trình phụ thuộc path | M | A→B→A → 422 | Unit | not-run |
| D10 | Review khóa học | H | 1 user/khóa; giảng viên tự review → 403; ẩn/sửa → `ratingAvg` đúng | Int | not-run |
| D11 | Q&A lộ nội dung bài riêng | H | người không có quyền học không đọc được câu hỏi/answer của bài không preview | Int | not-run |

## 3. Kiểm tra tĩnh & build (mỗi phase)

| Lệnh | Mục đích |
|---|---|
| `pnpm lint` | ESLint (eslint-config-next + rule cấm import `next-auth` ngoài `src/server/auth`, cấm import `server/**` từ client component) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | unit + integration |
| `pnpm build` | build production |
| `pnpm test:e2e` | Playwright (Phase 2 trở đi) |

## 4. E2E trọng yếu

1. Đăng ký → xác minh qua file outbox → enroll → học bài đọc → ghi chú → làm quiz → thoát → quay lại resume đúng bài/vị trí.
2. Instructor tạo nháp → gửi duyệt → admin duyệt → khóa xuất hiện ở catalog (và trước khi duyệt không xuất hiện).
3. Đổi mật khẩu ở context A → context B (đăng nhập trước đó) bị đăng xuất.
4. Mobile viewport (390×844) + desktop (1280×800) cho trang học và catalog; điều hướng bàn phím quiz.

## 5. Không làm

- Không load-test Atlas Free/Cloudinary Free; không tải lặp video thật trong test.
- CI mặc định không dùng credentials provider và không tiêu quota media.
