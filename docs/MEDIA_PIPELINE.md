# Media pipeline (Cloudinary)

> Trạng thái: **thiết kế Phase 0**, kiểm chứng tài liệu ngày 2026-11-23. Mục **[KC]** phải thử thật bằng tài khoản Free ở Phase 3 với file nhỏ trước khi coi là đúng.

## 1. Sự thật từ tài liệu chính thức

| Chủ đề | Sự thật | Nguồn |
|---|---|---|
| Chữ ký upload | Ký mọi tham số gửi lên **trừ** `file`, `cloud_name`, `resource_type`, `api_key`; chữ ký hợp lệ **1 giờ** kể từ `timestamp` | cloudinary.com/documentation/authentication_signatures |
| `resource_type` | Nằm trong URL endpoint, **không được ký** ⇒ client có thể đổi image↔video | như trên |
| Giới hạn dung lượng | **Không** có tham số upload/preset để giới hạn kích thước file ("Upload presets don't support a per-preset file size limit") — chỉ giới hạn của gói: Free ảnh 10 MB, video 100 MB | upload_presets; pricing/compare-plans |
| Định dạng | `allowed_formats` (được ký) → Cloudinary từ chối định dạng khác | image_upload_api_reference |
| Thời lượng video | Không có tham số chặn; chỉ có incoming transformation cắt video (tốn xử lý) | upload_parameters |
| Delivery `upload` | Public CDN | control_access_to_media |
| Delivery `private` | Bản gốc cần signed URL nhưng **bản dẫn xuất public mặc định** | như trên |
| Delivery `authenticated` | Bản gốc + dẫn xuất chỉ truy cập qua signed URL; **không cho transformation on-the-fly** (phải eager) | như trên |
| Signed delivery URL | "Doesn't prevent link sharing"; tài liệu không nêu thời hạn mặc định ⇒ coi như **không hết hạn** | như trên |
| Token/cookie-based access | Cần **Advanced plan trở lên** (cookie còn cần CNAME tính phí) | như trên |
| Webhook | `notification_url`; header `X-Cld-Signature` + `X-Cld-Timestamp`; SHA-1/SHA-256 của `body + timestamp + api_secret`; khuyến nghị so timestamp (ví dụ trong 2 giờ) | notification_signatures |
| Admin API | Free: **500 request/giờ**; Upload API không bị rate limit | admin_api_overview |
| Usage API | Trả `plan`, `last_updated`, `transformations/bandwidth/storage {usage, limit, used_percent}`, `media_limits`...; mẫu tài liệu **không có trường credits** **[KC trên tài khoản thật]** | admin_api_usage |
| Admin API `resource()` cho video **[KC 2026-11-24]** | Chỉ trả `duration` (và metadata video) khi có `media_metadata: true`; phản hồi upload thì luôn có | Thử thật trên tài khoản Free |
| Vượt hạn mức Free | Không cắt ngay: email cảnh báo → nhắc nâng gói → "your account will eventually be automatically disabled" | billing_and_plans |

Hệ quả thiết kế:

1. Không thể chặn file quá lớn **trước khi** Cloudinary nhận dữ liệu (ngoài trần 100 MB của gói). Ta kiểm tra ở browser (UX) và **xác minh sau upload**; file vi phạm bị xóa và không được tính là thành công.
2. Signed URL cho video `authenticated` giảm khả năng người ngoài tự dựng URL, **không** chống chia sẻ link.
3. Không có hard cap băng thông ⇒ ngân sách được bảo vệ bằng nội dung nhỏ, nhóm người thử kiểm soát, theo dõi usage và kill switch (xem [FREE_TIER_BUDGET.md](FREE_TIER_BUDGET.md)).

## 2. Chính sách mặc định (appSettings `limits`, cấu hình được)

| Mục | Giá trị |
|---|---|
| Video | ≤ 20 MiB (20.971.520 byte), ≤ 300 giây, `mp4`/`webm`, khuyến nghị 720p H.264 ~ 400–500 kbps cho màn hình code |
| Ảnh | ≤ 1 MiB, `jpg`/`png`/`webp`, ≤ 4000×4000 px; **không** SVG/GIF/HTML |
| Số video | ≤ 10 video/khóa; ≤ 2 khóa có video (bộ demo) |
| Storage nội bộ | ≤ 1 GiB managed storage |
| Rendition | **Một** rendition (file giảng viên đã nén) + 1 poster JPG eager; không sinh HLS/đa độ phân giải |
| Ảnh hiển thị | 3 width cố định 320/640/960 (ADR-011) |

## 3. Luồng upload

```text
Giảng viên (browser)          Next.js server                      MongoDB                Cloudinary
 │ 1. chọn file, kiểm tra size/type/duration (UX, không phải bảo mật)
 │──2. requestUpload(courseId, purpose, fileMeta)──▶│
 │                                │ requireRole + canEditCourse + rate limit
 │                                │ kill switch uploads? budget < 90%? usage mới (< 24h)? → nếu không: 409/503 fail-closed
 │                                │ releaseExpiredReservations() (lô nhỏ)
 │                                │──reserve quota (atomic $expr) ─────▶│ quotaCounters
 │                                │──insert uploadReservations(active)─▶│
 │                                │ ký params: {timestamp, public_id, type, allowed_formats,
 │                                │   overwrite:false, tags, notification_url?, eager? }
 │◀──{cloudName, apiKey, params, signature, resourceType, reservationId}─│
 │──3. POST https://api.cloudinary.com/v1_1/<cloud>/<resourceType>/upload (file + params) ───────────────────▶│
 │◀─────────────────────────────── response (public_id, bytes, ...) ─────────────────────────────────────────│
 │──4. finalizeUpload(reservationId)──▶│  (KHÔNG gửi bytes/duration/publicId — server tự tra)
 │                                │──Admin API GET resources/<rt>/<type>/<public_id> ─────────────────────────▶│
 │                                │ đối chiếu (§4)
 │                                │──transaction: reservation→consumed, insert mediaAssets(ready),
 │                                │   quota: reserved -= reservedBytes, used += bytes ─▶│
 │◀──MediaAssetDto───────────────│
                                   (song song, tùy chọn) Cloudinary ──webhook──▶ /api/webhooks/cloudinary → cùng hàm finalize
```

### Tham số được ký (server quyết định 100%)

| Param | Giá trị |
|---|---|
| `public_id` | `lms/<APP_ENV>/c/<courseId>/<reservationId>` — client không chọn |
| `type` | `authenticated` cho `lesson_video`; `upload` cho ảnh bìa, ảnh bài, `preview_video` (ADR-010 ⚠️) |
| `allowed_formats` | theo purpose |
| `overwrite` | `false` |
| `tags` | `lms,<APP_ENV>,course_<courseId>` (phục vụ reconcile theo tag) |
| `eager` + `eager_async` | video: 1 poster cố định (vd `so_2,w_640,c_limit,f_jpg`) khi `eagerTransformationsEnabled` **[KC chi phí thật]** |
| `notification_url` | `<APP_URL>/api/webhooks/cloudinary` chỉ khi APP_URL là HTTPS công khai |
| `timestamp` | thời điểm server |

Client chỉ nhận về **chữ ký cho bộ tham số này**; thêm/sửa tham số bất kỳ ⇒ chữ ký sai ⇒ Cloudinary từ chối.

## 4. Finalize — đối chiếu bắt buộc

Hàm `finalizeReservation(reservationId, source: 'client'|'webhook')`, **idempotent**:

1. Đọc reservation. Nếu `consumed` → trả asset hiện có (idempotent). Nếu `rejected/released` → trả lỗi trạng thái. Nếu `expired` hoặc `now > expiresAt` → **không chấp nhận**; asset (nếu có trên Cloudinary) thành orphan cho cleanup.
2. Chuyển `active → finalizing` bằng `findOneAndUpdate` có điều kiện (chặn hai finalize song song).
3. Gọi Admin API lấy resource theo `public_id` + `resourceType` + `type` **của reservation** (không của client). Không tìm thấy → trả `UPLOAD_NOT_FOUND`, đưa reservation về `active` (client có thể thử lại tới khi hết hạn).
4. Kiểm tra:
   - `public_id` khớp; `resource_type` khớp purpose (bắt trường hợp client đổi endpoint image↔video);
   - `type` khớp; `format` ∈ allowlist;
   - `bytes ≤ limit purpose`; video `duration ≤ 300` và hữu hạn; ảnh `width/height ≤ 4000`;
   - `created_at ≥ reservation.createdAt`.
5. Hợp lệ → **transaction**: reservation `consumed` + `purgeAt`; insert `mediaAssets(status: ready, reservationId U)`; `quotaCounters`: `reservedBytes -= reservedBytes`, `usedBytes += bytes thật`; video: `reservedCount -1`, `usedCount +1`.
   Duplicate key trên `mediaAssets.reservationId` ⇒ finalize khác đã thắng → trả asset đó.
6. Không hợp lệ → reservation `rejected` + giải phóng quota; insert `mediaAssets(status: deletion_pending, rejectReason)` để job xóa trên Cloudinary; báo lỗi cụ thể cho giảng viên ("Video dài 6 phút 12 giây, vượt giới hạn 5 phút").

Xử lý tình huống:

| Tình huống | Xử lý |
|---|---|
| Upload xong, finalize lỗi mạng | Client retry finalize (idempotent); nếu đóng tab: webhook (khi có) hoặc script reconcile |
| Callback/webhook lặp | Bước 1/5 idempotent; quota không cộng lần hai |
| Callback đến sau khi reservation hết hạn | Không chấp nhận; asset vào danh sách orphan |
| Reservation hết hạn không upload | `releaseExpiredReservations()`: `active && expiresAt < now` → `expired` + hoàn quota |
| Server crash giữa chừng (`finalizing` treo) | Reconcile: `finalizing` > 15 phút → chạy lại finalize |
| Hai reservation đồng thời vượt quota | `$expr` trên một document đảm bảo chỉ một thắng (test integration song song) |

## 5. Gắn media vào bài học

- Chỉ gắn `mediaAssets` có `status: 'ready'`, cùng `courseId`, `purpose` phù hợp loại bài.
- Gắn/gỡ cập nhật `refs` (`$addToSet`/`$pull`) cùng lúc với mutation lesson draft. Khi xuất bản: thêm ref `lesson_published`, bỏ ref published cũ không còn dùng.
- `durationSeconds` của bài video lấy từ `mediaAssets`, không từ client.

## 6. Phát video (delivery)

| Loại | Cấp URL |
|---|---|
| Ảnh bìa, ảnh bài, preview video (`upload`) | URL CDN công khai dựng từ `publicId` + transformation cố định |
| Video bài thường (`authenticated`) | Server Action `getPlaybackSource(lessonId)`: `requireViewer` → `canReadLesson` (enrollment active + course published/archived, không suspended) → kill switch `playbackIssuanceEnabled` → trả signed URL (SDK `cloudinary.url(publicId, {resource_type:'video', type:'authenticated', sign_url:true})`) |

- Trang học **không** nhúng URL video vào HTML khi data saver bật: player hiển thị poster + "Video ~12,4 MiB — Bấm để tải", chỉ khi bấm mới gọi `getPlaybackSource`.
- Data saver tắt: vẫn `preload="none"`, không autoplay, không tự chuyển bài video kế tiếp. URL lấy khi render trang học (đã kiểm tra quyền).
- Catalog/chi tiết khóa không bao giờ chứa URL video không preview; preview video cũng `preload="none"`.
- **Giới hạn nói thật trong UI admin/docs:** signed URL đã cấp có thể bị chia sẻ, không hết hạn, vẫn tiêu tốn băng thông; tắt cấp URL mới **không** thu hồi URL cũ. Chuyển asset sang `authenticated` mới/đổi `public_id` là cách vô hiệu URL cũ (tốn thao tác, ghi trong RUNBOOK).
- Không proxy video qua Next.js.

## 7. Xóa và dọn dẹp

- Xóa media chỉ khi `refs` rỗng. Asset có ref `lesson_published`/`course_published` **không thể xóa**.
- Xóa: `status → deletion_pending` → job/script gọi Admin/Upload API `destroy` (cùng `resource_type` + `type`, `invalidate: true`) → thành công mới `deleted` + trừ `usedBytes`. Thất bại: `deletion.attempts++`, `nextAttemptAt` backoff lũy thừa (1 phút → ~2 giờ), tối đa 8 lần rồi hiện cảnh báo cho admin. Không bao giờ báo "đã xóa" khi API chưa xác nhận.
- `pnpm media:cleanup` (mặc định **dry-run**):
  1. Liệt kê resource Cloudinary theo prefix `lms/<APP_ENV>/` (Admin API, phân trang, tính vào 500 req/giờ).
  2. So với `mediaAssets` + reservation đang hoạt động; orphan = không có bản ghi tương ứng **và** cũ hơn grace period 24 giờ.
  3. In bảng: publicId, bytes, tuổi, lý do. Chỉ xóa khi chạy `--apply --confirm=<số lượng>`.
- `pnpm media:reconcile` (dry-run mặc định): xử lý reservation `finalizing` treo, reservation `active` hết hạn, tính lại `quotaCounters`.

## 8. Kill switch và phạm vi tác dụng

| Switch | Tác dụng | KHÔNG làm được |
|---|---|---|
| `uploadsEnabled=false` | Ngừng cấp reservation/chữ ký mới | Không chặn upload đang dùng chữ ký đã cấp (≤ 1 giờ) — finalize vẫn kiểm tra switch và từ chối, asset bị dọn |
| `playbackIssuanceEnabled=false` | Ngừng cấp signed URL mới cho video bài thường | Không thu hồi URL đã cấp; không chặn preview public |
| `eagerTransformationsEnabled=false` | Upload mới không kèm eager poster | Không xóa derived đã có |
| Tự động: budget ≥ 90% hoặc usage cũ > 24h / API lỗi | Như `uploadsEnabled=false` (fail-closed) | Bài đọc vẫn hoạt động bình thường |
