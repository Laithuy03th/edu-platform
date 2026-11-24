# MEDIA_AUDIT — ảnh, video, upload, playback, quota

Ngày kiểm tra: 2026-11-24. Theo PROMPT V2 §35.6, §31.2 luồng 8. Không ghi secret, chữ ký hay URL có token.

## 1. Kết luận ngắn

**Hiện chưa có ảnh hay video thật nào trong ứng dụng.** Pipeline upload → finalize → playback đã có code và đã có test tích hợp, nhưng đó là test với **provider giả (mock)**. Chưa chạy lần nào với Cloudinary thật qua UI. Bằng chứng duy nhất có tương tác với Cloudinary thật là lệnh gọi Usage API. Theo §31.1, lệnh gọi đó chỉ chứng minh lấy được số liệu sử dụng, không chứng minh upload hay phát video hoạt động.

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Asset thật trong MongoDB (`mediaAssets`) | **0 bản ghi** | Đếm trên Atlas `tuhoc_dev` ngày 2026-11-24 |
| Reservation (`uploadReservations`) | 0 | như trên |
| Bài học video | 0/13 bài, cả 13 đều là `reading` | Atlas: `lessons.published.type` |
| Ảnh bìa khóa học | 0/2 khóa có `thumbnailMediaId`; card dùng bìa gradient + chữ cái đầu, chọn theo hash của tiêu đề (chưa theo công nghệ/cấp độ) | Atlas + [course-card.tsx](../src/components/course-card.tsx) |
| Upload signed + reservation + quota | MOCK_ONLY | [media.test.ts](../tests/integration/media.test.ts) M1, M2, M11 (mock provider) |
| Finalize đối chiếu metadata thật, idempotent | MOCK_ONLY | M3/M4, finalize khi reservation đã hết hạn, đổi resource_type |
| Webhook Cloudinary (kiểm chữ ký, gọi lặp) | MOCK_ONLY | [route.ts](../src/app/api/webhooks/cloudinary/route.ts); chưa nhận webhook thật (cần URL public) |
| Playback trong trang học | BLOCKED (không có video) | [video-player.tsx](../src/app/learn/[slug]/[lessonId]/video-player.tsx): `preload="none"`, không autoplay, data saver |
| Usage snapshot | **Gọi thật OK** | Atlas `usageSnapshots`: 2 bản ghi (`cloudinary_admin_api`, `mongodb_dbstats`); Free 25 credits, đã dùng 0% |
| Fail-closed khi usage cũ hoặc lỗi | MOCK_ONLY | M8 |
| Dọn orphan / reconcile | MOCK_ONLY | M7; chưa chạy `pnpm media:cleanup` với Cloudinary thật |
| Delivery / access policy | BLOCKED | ADR-010: URL delivery có chữ ký **không hết hạn**, có thể bị chia sẻ. Chưa thử với tài khoản thật |

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
| Asset / chủ sở hữu / license | _(file do chủ dự án tự quay hoặc có quyền dùng)_ |
| Kích thước / bytes / thời lượng | |
| `publicId` (không ghi chữ ký) | |
| MongoDB `mediaAssets._id` và bài học tham chiếu | |
| Route hiển thị và viewport đã kiểm tra | `/learn/<slug>/<lessonId>` ở 375 và 1440 |
| Phát / resume / transcript / data saver | |
| Usage trước → sau (`pnpm usage:sync`) | |
| Xóa: `pnpm media:cleanup` (chạy thử trước, sau đó mới xóa thật) | |

## 5. Giới hạn phải nói rõ

- Cloudinary Free **không có hard cap**. Chặn upload không chặn được băng thông của video đã phát hành. URL đã cấp không thu hồi được.
- Signed delivery URL **không tự hết hạn**. Chỉ dùng nội dung demo không nhạy cảm.
- Phần chặn kích thước ở trình duyệt chỉ để UX tốt hơn. Kiểm soát thật nằm ở bước finalize: đọc metadata từ provider, vượt giới hạn thì xóa và hoàn quota.
