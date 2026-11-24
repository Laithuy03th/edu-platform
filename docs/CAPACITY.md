# CAPACITY — sức chứa khi có người dùng thật

Đo ngày 2026-11-24. Không load-test Atlas/Cloudinary Free (quy định dự án): toàn bộ số đo chạy trên **build production + MongoDB cục bộ**, máy phát triển Windows 11, một tiến trình `next start`. Máy này đang chạy cả dev server khác, nên số đo có thể chênh nhiều giữa các lần.

## 1. Giới hạn chính thức của gói miễn phí

[Atlas Free Cluster Limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/):

- Tối đa **100 thao tác đọc/ghi mỗi giây**. Vượt mức thì Atlas điều tiết và xếp hàng, không từ chối thao tác.
- Tối đa **500 kết nối** (tính theo node).
- **512 MB** dung lượng lưu trữ.
- 10 GB dữ liệu vào và 10 GB ra mỗi chu kỳ 7 ngày.

**Nút thắt khi có nhiều người dùng là 100 thao tác/giây của Atlas Free**, không phải CPU server.

## 2. Số thao tác DB trên mỗi request (đo bằng `serverStatus.opcounters`)

| Trang | Khách | Đã đăng nhập |
|---|---|---|
| Trang chủ | 0 | 1 |
| `/courses` | 0 | — |
| Chi tiết khóa học | 3 | — |
| Bài hướng dẫn | 0 | — |
| Dashboard | — | 11 |
| Trang bài học | — | **18** (trước tối ưu: 24) |

Trang công khai đọc dữ liệu qua `unstable_cache`, nên gần như không chạm DB.

Các tối ưu đã làm cho trang bài học:
- Kiểm tra quyền dùng memo theo request, không lặp 3 lần.
- Cấu trúc chương/bài, thông tin quiz và tên dự án được cache theo `courseId + publishedVersion`. Khóa cache đổi khi khóa học được duyệt lại, nên không bao giờ trả dữ liệu cũ.

## 3. Thông lượng (autocannon, 50 kết nối đồng thời, 15 giây)

Kết quả: **0 lỗi, 0 timeout, 0 non-2xx**.

| Trang | Request/giây | p99 |
|---|---|---|
| Trang chủ (khách) | 67 | 1.033 ms |
| Chi tiết khóa học (khách) | 78 | 960 ms |
| Bài hướng dẫn (khách) | 30–35 | 1,8–2,5 s |
| Trang bài học (đã đăng nhập) | 29–44 | 1,3–2,0 s |

## 4. Ước lượng (giả định, không phải số đo)

**Lưu tiến độ video:** player lưu 30 giây/lần khi đang xem. Mỗi lần lưu khoảng 9 thao tác, ước tính từ code: viewer, quyền đọc bài, upsert tiến độ, cập nhật enrollment, rate limit.

**Kịch bản 2.000 tài khoản, khoảng 100 người học cùng lúc:**
- Mỗi người mở một bài khoảng 3 phút/lần: 0,55 lượt xem/giây × 18 thao tác ≈ **10 thao tác/giây**.
- 100 người đang xem video: 3,3 lần lưu/giây × 9 thao tác ≈ **30 thao tác/giây**.
- Tổng ≈ **40–50 thao tác/giây**, dưới giới hạn 100.

**Khoảng 200 người học cùng lúc trở lên** sẽ chạm giới hạn 100 thao tác/giây và trang bắt đầu chậm vì bị xếp hàng. Khi đó cần chủ dự án quyết định nâng gói Atlas (Flex/M10) theo số đo thực tế. Repo không tự nâng gói.

**Kết nối:** mỗi instance server có pool tối đa 5 kết nối (`MONGODB_MAX_POOL_SIZE`), nên tới khoảng 100 instance mới chạm giới hạn 500 kết nối.

**Media:** video bài học khoảng 0,5–0,8 MB mỗi lượt xem trọn. Gói Free có 25 credit/tháng, mỗi credit tương đương khoảng 1 GB băng thông. Với 13 video hiện có, khoảng 3.000 lượt xem trọn video mới tốn khoảng 2 GB.

## 5. Theo dõi khi chạy thật

- `/admin/media`: usage Cloudinary và MongoDB, có kill switch.
- Atlas → Metrics: Opcounters và Connections. Nên đặt cảnh báo khi vượt 70 thao tác/giây.
- `/api/health`: không truy vấn DB, dùng cho uptime check.
