# Ngân sách gói miễn phí

> **Ngày kiểm tra tài liệu: 2026-11-23.** Đây là số liệu **từ tài liệu công khai**, chưa đối chiếu dashboard tài khoản thật (chưa có credentials). Phase 3 phải ghi thêm số liệu từ dashboard/API tài khoản và ngày đối chiếu. Không hardcode các con số này trong code — chúng nằm trong `appSettings`/env.
>
> Quy ước đơn vị: **MiB/GiB** = 2²⁰/2³⁰ byte; **MB/GB** = 10⁶/10⁹ byte. Tài liệu nhà cung cấp dùng "GB" mà không định nghĩa rõ ⇒ khi tính ngân sách ta dùng cách hiểu **bất lợi hơn** cho mình.

## 1. Hạn mức chính thức (theo tài liệu)

### 1.1 Cloudinary Free

| Mục | Giá trị | Nguồn |
|---|---|---|
| Credits | **25 credits/tháng**, dùng chung cho transformations, storage, bandwidth | https://cloudinary.com/documentation/billing_and_plans |
| 1 credit | 1.000 transformations **hoặc** 1 GB storage **hoặc** 1 GB image bandwidth **hoặc** video bandwidth **1 GB trên Free** (2 GB trên gói trả phí tự phục vụ) | như trên |
| Xử lý video | "counted per second of video processed, with the rate depending on resolution". FAQ trang so sánh gói ghi 1 credit = 500 giây SD hoặc 250 giây HD — **hai trang không thống nhất** ⇒ phải đo thật | billing_and_plans; https://cloudinary.com/pricing/compare-plans |
| Cửa sổ đo | Free: **rolling 30 ngày** cho transformations và bandwidth; storage là **snapshot hiện tại** | billing_and_plans |
| Kích thước tối đa | ảnh 10 MB, video 100 MB, raw 10 MB, 25 MP | compare-plans (ánh xạ cột suy ra từ bảng) |
| Admin API | 500 request/giờ | https://cloudinary.com/documentation/admin_api_overview |
| Vượt hạn mức | Soft limit: email cảnh báo → nhắc nâng gói → cuối cùng **tự động vô hiệu hóa tài khoản**. **Không có hard cap** tự dừng phục vụ đúng ngưỡng | billing_and_plans |
| Kiểm soát truy cập | Signed URL + `authenticated`: có; token/cookie-based: Advanced plan trở lên | https://cloudinary.com/documentation/control_access_to_media |

**Không** diễn giải thành ba hạn mức 25 GB độc lập: storage + transformations + bandwidth **cộng dồn** vào cùng 25 credits.

### 1.2 MongoDB Atlas Free (trước gọi là M0)

| Mục | Giá trị | Nguồn |
|---|---|---|
| Storage | **0,5 GB**, tính cả dữ liệu **và index** | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ |
| Kết nối | tối đa 500 | như trên |
| Thông lượng | 100 operations/giây; vượt → throttle + cooldown 1 giây | như trên |
| Truyền dữ liệu | 10 GB vào + 10 GB ra mỗi chu kỳ **rolling 7 ngày** | như trên |
| Giới hạn khác | 100 database, 500 collection; aggregation ≤ 50 stage; sort trong bộ nhớ 32 MB | như trên |
| Metrics | Chỉ Connections, Logical Size, Network, Opscounter; không Performance Advisor | như trên |
| Backup | Chỉ private preview ⇒ coi như **không có backup tự động** | như trên |
| Tạm dừng | Tự pause sau **30 ngày** không có kết nối | như trên |
| Transaction | Trang không nêu ⇒ **[KC Phase 1 bằng test thật]** | — |

### 1.3 Hosting — Vercel Hobby (ứng viên, chưa deploy)

| Mục | Giá trị | Nguồn |
|---|---|---|
| Function | tối đa 300 s, 2 GB / 1 vCPU | https://vercel.com/docs/limits , https://vercel.com/docs/functions/limitations |
| Body request/response | 4,5 MB | functions/limitations |
| Kèm theo/tháng | 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer, 1 triệu invocation, **4 CPU-giờ active**, 360 GB-giờ memory | https://vercel.com/docs/plans/hobby |
| Cron | tối đa 100 job, **tối thiểu 1 lần/ngày**, sai lệch ±59 phút | https://vercel.com/docs/cron-jobs/usage-and-pricing |
| Vượt mức | phải chờ 30 ngày để dùng lại tính năng | plans/hobby |
| Thương mại | Không thấy trên trang docs đã đọc ⇒ **chủ dự án xác nhận trong điều khoản** trước khi deploy | — |

### 1.4 Email — Resend Free (gợi ý)

3.000 email/tháng, **100 email/ngày**, có SMTP relay — https://resend.com/pricing . Brevo: trang giá không đọc được nội dung (render bằng JS) ⇒ chưa xác minh.

## 2. Ngân sách nội bộ (tách khỏi hạn mức chính thức)

| Tài nguyên | Hạn mức chính thức | **Ngân sách nội bộ** | 60% cảnh báo | 80% siết | 90% dừng upload |
|---|---|---|---|---|---|
| Cloudinary credits (rolling 30 ngày) | 25 | **18 credits** | 10,8 | 14,4 | 16,2 |
| Cloudinary managed storage | (trong credits) | **1 GiB** = 1.073.741.824 byte | 644 MiB | 819 MiB | 922 MiB |
| MongoDB data + index | 0,5 GB | **300 MiB** = 314.572.800 byte | 180 MiB | 240 MiB | 270 MiB |
| Email/ngày | 100 (Resend) | **80** | 48 | 64 | 72 (chỉ gửi email bảo mật) |

Hành động theo ngưỡng:

- **60%:** banner cho admin, ghi audit, email cho admin (nếu email còn ngân sách).
- **80%:** bật data saver mặc định cho người dùng mới, tắt eager transformation, yêu cầu admin xem dashboard; hiển thị dung lượng ước tính rõ hơn.
- **90%:** tự động dừng cấp upload reservation và transformation không thiết yếu (fail-closed). Bài đọc, ghi chú, quiz vẫn hoạt động.
- Admin **không** được bỏ qua quota global; thay đổi ngân sách là hành động riêng, có audit (`quota.update`).

## 3. Phép tính cho bộ demo

### 3.1 Storage Cloudinary

| Thành phần | Phép tính | Kết quả |
|---|---|---|
| Video demo dự kiến | 20 video × ~12 MiB | 240 MiB ≈ 0,252 GB |
| Trần theo policy | 2 khóa × 10 video × 20 MiB | 400 MiB ≈ 0,419 GB |
| Poster + ảnh | ~20 poster × 60 KB + ~30 ảnh × 200 KB | ≈ 7,2 MB |
| **Storage credit (trần)** | 0,419 + 0,007 GB | **≈ 0,43 credit** |

### 3.2 Transformations

| Thành phần | Phép tính | Kết quả |
|---|---|---|
| Ảnh (3 width cố định × ~30 ảnh) | 90 transformation | 0,09 credit |
| Poster eager (20 video) | 20 transformation | 0,02 credit |
| **Xử lý video khi upload** | **Chưa biết** — nếu (kịch bản xấu) upload 720p bị tính như HD processing: 20 × 240 s / 250 s ≈ **19 credits** | ⚠️ **Rủi ro lớn nhất — phải đo** |

**Thí nghiệm bắt buộc Phase 3 (trước khi upload hàng loạt):** upload 1 video ~5 MiB/60 s, không eager → chờ `last_updated` của Usage API thay đổi (có độ trễ) → so sánh transformations/credits trước-sau. Lặp lại với eager poster. Ghi kết quả thật vào đây. Nếu upload tiêu tốn processing đáng kể ⇒ giảm số video demo hoặc thời lượng, báo chủ dự án trước khi tiếp tục.

### 3.3 Bandwidth (phần còn lại)

- Ngân sách 18 − storage 0,43 − transformations ~0,2 − dự phòng 1,4 ≈ **16 credits** cho bandwidth ⇒ **16 GB** video bandwidth trên Free (1 GB/credit).
- Một lượt xem trọn video 12 MiB = 12,58 MB ⇒ **≈ 1.270 lượt xem trọn / 30 ngày cuộn** (~42/ngày). Video 20 MiB: ≈ 760 lượt.
- Đây là **ước tính**: người xem dừng giữa chừng tốn ít hơn; tua lại/xem nhiều lần, trình duyệt tải trước (range request) hoặc link bị chia sẻ tốn nhiều hơn. Dashboard hiển thị "ước tính, không phải cam kết".

### 3.4 MongoDB

- Nội dung 2 khóa: vài MB. Học viên hoạt động nhiều: ~100–250 KB (kể cả index ước tính) ⇒ 300 MiB đủ cho cỡ vài trăm học viên rất tích cực. **Đo thật** bằng `db.stats()` (`dataSize + indexSize`) ở Phase 4 **[KC: user `readWrite` có quyền `dbStats` không; nếu không, snapshot thủ công từ Atlas UI]**.
- Ops/s: autosave tiến độ 30 s/người xem + rate limit write ⇒ 100 ops/s ≈ trần cho khoảng **vài trăm người học đồng thời** (ước tính thô; không load-test Atlas Free).

### 3.5 Vercel Hobby

- Video/ảnh đi thẳng CDN Cloudinary ⇒ không tốn Fast Data Transfer của Vercel cho media.
- **4 CPU-giờ active/tháng** là ràng buộc đáng chú ý: Argon2 (~0,2 s CPU/lần, đo thật ở Phase 1) + SSR. 10.000 lần đăng nhập ≈ 0,55 CPU-giờ. Theo dõi trên dashboard Vercel khi deploy.

## 4. Dữ liệu usage và độ tươi

| Nguồn | Cách lấy | Tần suất | Trạng thái |
|---|---|---|---|
| Cloudinary | Admin API Usage (server) | (1) admin bấm refresh, cooldown 15 phút; (2) tự refresh khi có yêu cầu upload và snapshot > 60 phút; (3) cron 1 lần/ngày nếu deploy Vercel | `authoritative` theo `last_updated` của Cloudinary (vẫn có độ trễ phía provider) |
| Quota nội bộ | `quotaCounters` | realtime | kiểm soát concurrency upload, **không phải** số băng thông thật |
| MongoDB | `db.stats()` qua script/admin action hoặc nhập tay từ Atlas UI | thủ công | `estimated` nếu nhập tay |

- Snapshot Cloudinary cũ hơn **24 giờ** hoặc lần refresh gần nhất lỗi ⇒ uploads **fail-closed**.
- Không gọi Admin API trong request của học viên.
- Không tạo cron trả phí; nếu hosting không có scheduler phù hợp ⇒ chạy `pnpm usage:sync` thủ công.

## 5. Giới hạn phải nói thật (cũng hiển thị trong admin)

1. Chặn upload **không** chặn băng thông từ video đã có.
2. Tắt cấp URL mới **không** thu hồi URL đã cấp hoặc URL public.
3. Usage có độ trễ; nhiều người xem đồng thời hoặc link bị chia sẻ có thể vượt ngân sách trước khi dashboard kịp thấy.
4. Cloudinary Free không có hard cap ⇒ ứng dụng **không bảo đảm tuyệt đối** không vượt hạn mức; chỉ giảm rủi ro bằng nội dung nhỏ, nhóm thử kiểm soát, ngưỡng nội bộ thấp hơn và kill switch.
5. Không tự nâng gói, bật add-on trả phí hoặc nhập thẻ.

## 6. Checklist đối chiếu khi có credentials (Phase 3)

- [ ] Ghi số credits/limit hiển thị trong Cloudinary Console + ngày.
- [ ] Gọi Usage API một lần, lưu cấu trúc response thật (đã loại thông tin nhạy cảm) vào test fixture.
- [ ] Kiểm tra `authenticated` + signed URL hoạt động trên Free, URL không ký bị từ chối.
- [ ] Kiểm tra Strict transformations có bật được trên Free.
- [ ] Thí nghiệm chi phí upload video (§3.2).
- [ ] Ghi Atlas Free cluster tier, region, storage hiện tại; thử transaction.

## 7. Đối chiếu tài khoản thật (2026-11-24)

| Mục | Kết quả | Cách lấy |
|---|---|---|
| Gói Cloudinary | **Free**, `credits.limit = 25`, `credits.usage = 0` (0%) | 1 lần gọi Admin API Usage (`last_updated` = 2026-11-23) |
| Storage hiện tại | 120.253 byte (~117 KiB) | như trên |
| Bandwidth / transformations | 0 / 0 | như trên |
| Giới hạn file của gói | ảnh 10.485.760 byte, video 104.857.600 byte, 25 MP | `media_limits` trong response |
| Cấu trúc response | **có** khối `credits` → ứng dụng dùng số liệu provider (authoritative), không cần ước tính | — |
| MongoDB Atlas | **chưa kiểm được** — kết nối từ máy dev bị từ chối ở TLS (IP chưa có trong Network Access) | script kiểm tra kết nối |

Checklist §6 cập nhật:

- [x] Ghi số credits/limit của tài khoản + ngày.
- [x] Gọi Usage API một lần, xác nhận cấu trúc response (mapping trong `modules/media/usage.ts`).
- [ ] Kiểm tra `authenticated` + signed URL trên tài khoản thật (cần upload 1 file nhỏ — làm khi chủ dự án sẵn sàng).
- [ ] Kiểm tra Strict transformations trên Free.
- [ ] Thí nghiệm chi phí upload video (§3.2) — **bắt buộc trước khi upload hàng loạt**.
- [ ] Atlas: thêm IP vào Network Access, chạy `pnpm db:indexes`, thử transaction, đo `dbStats`.
