# MEDIA_AUDIT — ảnh, video, upload, playback, quota

Ngày kiểm tra: 2026-11-24. Theo PROMPT V2 §35.6, §31.2 luồng 8. Không ghi secret, chữ ký hay URL có token.

## 1. Kết luận ngắn

**Cập nhật 2026-11-24 (chiều): đã có media thật.** Theo yêu cầu của chủ dự án, `pnpm media:samples --apply --submit` sinh và tải lên **2 ảnh bìa + 13 video minh họa** (mỗi bài 1 video, không lời, dựng từ chính nội dung bài) qua **đúng các hàm server của web**: `requestUpload` → upload có chữ ký lên Cloudinary thật → `finalizeReservation` tra Admin API. Hai khóa được duyệt lại qua UI admin trên dev :3000 (Atlas). Ca thử này tìm ra **một lỗi thật mà test mock không bắt được** (§4).

Trước đó (sáng cùng ngày): 0 asset; mọi kiểm tra media chỉ chạy với provider giả.

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Asset thật trong MongoDB (`mediaAssets`) | **15 `ready`** (2 `course_thumbnail`, 3 `preview_video`, 10 `lesson_video`) + 1 `rejected` (lần thử đầu, xem §4) | Atlas `tuhoc_dev`, aggregate theo status/purpose |
| Bài học video | **13/13** bài là `video`, vẫn giữ bài đọc bên dưới video; transcript = nội dung trên màn hình theo mốc thời gian | Atlas `lessons.published.type` |
| Ảnh bìa khóa học | **2/2** khóa có ảnh bìa 1280×720 JPEG (81 và 88 KiB) qua Cloudinary, rendition cố định | Screenshot `/courses` và `/courses/nextjs-co-ban` ở 1440 px |
| Upload signed + reservation + quota | **VERIFIED** (thật) | 16 lần upload; quota nội bộ `storage:global` = 7.973.268 byte; `videos:course:*` = 7 và 6, trong giới hạn 10/khóa và 2 khóa |
| Finalize đối chiếu metadata thật | **VERIFIED** (thật), sau khi sửa lỗi `duration` | §4 |
| Webhook Cloudinary | MOCK_ONLY | Cần URL HTTPS công khai (chưa deploy) |
| Playback trong trang học | **VERIFIED** | Học viên đã đăng ký: video `authenticated` + URL có chữ ký phát được (readyState 4, 53,12 s, có poster). Khách mở cùng bài bị chuyển về `/login`, HTML không chứa URL video. Bài học thử: `upload` công khai phát được |
| Resume | **VERIFIED** | Mở lại cùng bài 3 lần: video tiếp tục từ 5 s → 10 s → 15 s |
| Usage snapshot | Gọi thật OK | Credits 0,17 → **0,2**/25; transformations 0 → 34 (poster eager + rendition ảnh). `storageBytes` 177.506.273 không đổi vì provider chỉ cập nhật theo ngày (`last_updated` = 2026-11-23) và đã gồm asset có sẵn của tài khoản |
| Dọn orphan | Chạy thật, dry-run | `pnpm media:cleanup` → `Orphan: 0`. Asset bị finalize từ chối đã bị xóa trên Cloudinary (Admin API trả 404) |
| Delivery / access policy | **VERIFIED** (đúng thiết kế ADR-010) | Video bài thường: `authenticated` + `s--…--`; preview và ảnh: `upload` công khai. Giới hạn vẫn còn: URL có chữ ký không hết hạn |
| Định dạng | WebM VP9, 1280×720, 25 fps, ~90 kbps (0,44–0,80 MiB/video, 45–75 giây) | Safari cũ (< 14.1, iOS < 17.4) không phát được WebM. Nếu cần hỗ trợ, giảng viên tải bản MP4 H.264 |

## 2. Những gì đã có trong code

- **Luồng upload:** quyền + quota → reservation nguyên tử có thời hạn → server ký upload với tham số trong allowlist (`public_id`, `type`, `allowed_formats`, `overwrite=false`) → client upload thẳng lên Cloudinary → finalize tra Admin API, đối chiếu bytes, duration, resource type và owner → ghi asset `ready` và commit quota. Mô tả chi tiết trong [MEDIA_PIPELINE.md](MEDIA_PIPELINE.md).
- **Giới hạn mặc định:** video ≤ 20 MiB và ≤ 5 phút; ảnh ≤ 1 MiB; tối đa 10 video/khóa; tối đa 2 khóa có video. Tất cả đọc từ env `QUOTA_*`. `.env` hiện để trống nên dùng giá trị mặc định.
- **Player:** dùng `<video controls>` gốc của trình duyệt, nên tốc độ phát, tua và toàn màn hình phụ thuộc trình duyệt. Có poster, resume (lưu vị trí, best effort khi rời tab), transcript dạng text do giảng viên nhập, và chế độ tiết kiệm dữ liệu (chỉ gắn nguồn video khi người học bấm phát).
- **Kill switch:** có ở `/admin/media` cho upload và cho cấp quyền phát mới. Phạm vi tác dụng đã ghi trong RUNBOOK.

## 3. Thiếu so với V2 §35

| ID | Thiếu | Ưu tiên |
|---|---|---|
| M03 | Metadata ảnh: `alt`, `caption`, nguồn/license, kích thước cố định cho card/detail/content. Chưa có hệ ảnh bìa 16:9 thật | P1 |
| M04 | Caption (`<track>`), chương/mốc thời gian, nhãn điều khiển riêng; chưa kiểm tra chữ code trong video đọc được trên mobile | P1 |
| M09 | **Một ca thử nhỏ, thật, đi qua UI:** 1 video ≤ 20 MiB, có snapshot usage trước và sau | **P0**, cần chủ dự án cho phép và cung cấp file |
| S05 | Trang xem video công khai và `VideoObject`, chỉ khi đã có video thật | P2 |
| — | OG image 1200×630 dùng chung | P1 |

## 4. Bằng chứng cần có khi chạy ca thử M09 (mẫu ghi)

| Trường | Giá trị |
|---|---|
| Asset / chủ sở hữu / license | Do `scripts/media-samples.ts` sinh từ nội dung bài của chính dự án (không dùng tài nguyên bên ngoài). Font hệ thống Segoe UI và Cascadia Code chỉ dùng để render, không phân phối file font |
| Kích thước / bytes / thời lượng | 13 video: 45–75 s, 0,44–0,80 MiB (tổng ~7,8 MB); 2 ảnh: 81/88 KiB |
| `publicId` (không ghi chữ ký) | `lms/development/c/<courseId>/<reservationId>` |
| MongoDB `mediaAssets._id` và bài học tham chiếu | Ví dụ bài 1.1 Next.js: asset `6b054fd1d0f275221204aa3f` (`preview_video`, 75,4 s, 839.364 byte) |
| Route hiển thị và viewport đã kiểm tra | `/learn/nextjs-co-ban/<id>` ở 1440 (đăng nhập) và 375 (học thử); `/courses`, `/courses/nextjs-co-ban` ở 1440 |
| Phát / resume / transcript / data saver | Phát OK (cả `authenticated` lẫn `upload`); resume OK; transcript hiển thị. **Data saver chưa thử** |
| Usage trước → sau (`pnpm usage:sync`) | credits 0,17 → 0,2; transformations 0 → 34 |
| Xóa: `pnpm media:cleanup` | Dry-run: 0 orphan. Chưa xóa thật (không cần) |

**Lỗi thật tìm được:** Admin API `resource()` của Cloudinary **không trả `duration` cho video** nếu không truyền `media_metadata: true`; phản hồi upload thì có trả. Hệ quả: finalize từ chối **mọi** video với lỗi "Không đọc được thời lượng video". Trước khi sửa, giảng viên không tải được video nào. Đã sửa trong [cloudinary.ts](../src/server/cloudinary.ts) và thêm test hồi quy [cloudinary-adapter.test.ts](../tests/unit/cloudinary-adapter.test.ts). Đã thử thật với cả 3 tùy chọn: `media_metadata` và `image_metadata` đều trả `duration`; `video_metadata` thì không.

**Giới hạn của ca thử:** file đi qua các hàm server trong script, không qua nút upload trên trình duyệt (`MediaUploader`). Phần ký, upload, finalize, quota là cùng một code; phần chọn file và kiểm tra phía trình duyệt chưa được thử với Cloudinary thật.

## 5. Giới hạn phải nói rõ

- Cloudinary Free **không có hard cap**. Chặn upload không chặn được băng thông của video đã phát hành. URL đã cấp không thu hồi được.
- Signed delivery URL **không tự hết hạn**. Chỉ dùng nội dung demo không nhạy cảm.
- Phần chặn kích thước ở trình duyệt chỉ để UX tốt hơn. Kiểm soát thật nằm ở bước finalize: đọc metadata từ provider, vượt giới hạn thì xóa và hoàn quota.
