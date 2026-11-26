# Search Console, Bing Webmaster và theo dõi SEO sau khi deploy

Tài liệu cho chủ dự án. Chỉ làm sau khi site có domain thật và chạy với `APP_ENV=production`. Bản dev/preview luôn
gắn `noindex`, nên không cần (và không nên) xác minh. Không có cách nào bảo đảm thứ hạng Google; các bước dưới đây
giúp Google crawl đúng, index đúng trang, và cho bạn số liệu để sửa.

## 0. Trước khi xác minh

1. Đặt `APP_URL=https://<domain>` (không có `/` ở cuối). Canonical, sitemap, Open Graph và JSON-LD đều lấy domain từ biến này.
2. Đặt `APP_ENV=production`. Khi đó site bỏ `noindex` và robots.txt cho crawl các trang công khai.
3. Mở `https://<domain>/robots.txt` và `https://<domain>/sitemap.xml` để kiểm tra. Sitemap chỉ chứa nội dung đã xuất bản, kèm ảnh bìa khóa học.
4. Vào **Quản trị → Kiểm tra SEO** (`/admin/seo`) và xử lý các mục "!" quan trọng: mô tả quá ngắn, thiếu ảnh bìa, chưa có bài học thử.

## 1. Google Search Console

Khuyên dùng **Domain property**, xác minh bằng bản ghi DNS TXT tại nhà cung cấp domain. Cách này bao gồm mọi subdomain và cả http/https.

Nếu chỉ dùng **URL-prefix property**:

1. Chọn phương thức **HTML tag** và copy giá trị `content="..."`. Chỉ lấy phần giá trị, không lấy cả thẻ.
2. Đặt biến môi trường `GOOGLE_SITE_VERIFICATION=<giá trị>`, deploy lại, rồi bấm **Verify**. Thẻ được render trong `<head>` của mọi trang.

Sau khi xác minh:

- **Sitemaps** → gửi `sitemap.xml`. Sau vài ngày, cột "Discovered URLs" phải xấp xỉ bằng số trang công khai đã xuất bản.
- **URL Inspection**:
  1. Kiểm tra trang chủ, một khóa học, một bài hướng dẫn và một hub công nghệ.
  2. Chọn **Test live URL** để xem HTML Google render được.
  3. Bấm **Request indexing** cho các trang quan trọng.
- **Pages** (Indexing): xem trang bị loại và lý do. "Excluded by noindex" là đúng với trang lọc catalog (`/courses?level=...`) và trang lưu trữ. "Duplicate without user-selected canonical" thì kiểm tra lại `APP_URL`.
- **Enhancements**: Breadcrumbs, Videos (video học thử trên trang khóa học) sẽ xuất hiện khi Google đã crawl. Lỗi ở đây thường do thiếu dữ liệu bắt buộc. JSON-LD của site chỉ khai báo dữ liệu thật, không thêm rating/giá giả.
- **Core Web Vitals / Page experience**: chỉ có số liệu khi đủ lượt truy cập thật (dữ liệu field của Chrome). Trước đó, dùng PageSpeed Insights cho từng URL.

## 2. Bing Webmaster Tools (và Cốc Cốc)

- Nhanh nhất: **Import from Google Search Console**. Thao tác này tự xác minh và lấy sitemap.
- Hoặc dùng thẻ meta: đặt `BING_SITE_VERIFICATION=<giá trị content của msvalidate.01>`.
- Gửi sitemap `https://<domain>/sitemap.xml`.
- Cốc Cốc và một số công cụ khác dùng dữ liệu crawl riêng. Sitemap và robots.txt chuẩn là đủ, không cần cấu hình thêm.

## 3. Kiểm tra định kỳ (mỗi tháng)

| Việc | Ở đâu | Dấu hiệu cần sửa |
|---|---|---|
| Trang mới đã index chưa | GSC → Pages, URL Inspection | Khóa mới xuất bản > 2 tuần vẫn "Discovered – currently not indexed": thêm internal link từ hub/lộ trình, kiểm tra mô tả |
| Truy vấn mang lại click | GSC → Performance | CTR thấp ở vị trí 1–10 → viết lại tiêu đề/mô tả ngắn của khóa (sửa ở khu giảng viên, duyệt lại) |
| Lỗi crawl, 404 | GSC → Pages | Đổi slug khóa học/bài viết đã có 308 tự động; 404 khác thì xem link nguồn |
| Dữ liệu có cấu trúc | GSC → Enhancements | Lỗi Video: video học thử bị gỡ hoặc thiếu poster |
| Chất lượng nội dung | `/admin/seo`, `/admin/coverage` | Nội dung > 12 tháng chưa cập nhật, chưa review chuyên môn |

## 4. Đo lường không xâm phạm riêng tư (S10)

Site hiện **không** gắn công cụ analytics bên thứ ba (đúng chính sách bảo mật). Số liệu organic lấy từ Search
Console (click, hiển thị, truy vấn) — không cần cookie hay script theo dõi. Nếu sau này muốn analytics trên site,
chọn công cụ không dùng cookie, không gửi email/ghi chú/dữ liệu học, rồi cập nhật trang `/chinh-sach-bao-mat` trước.

## 5. Biến môi trường liên quan

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `APP_URL` | Có (production) | Domain chính thức, HTTPS |
| `APP_ENV` | Có | `production` để cho index |
| `GOOGLE_SITE_VERIFICATION` | Không | Chỉ khi xác minh bằng thẻ meta |
| `BING_SITE_VERIFICATION` | Không | Chỉ khi xác minh Bing bằng thẻ meta |
| `CONTACT_EMAIL` | Không | Email liên hệ công khai trên /lien-he và chính sách bảo mật |
