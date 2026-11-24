Trong App Router của Next.js, **tên file** quyết định vai trò của nó trong một route. Bảng dưới đây để tra nhanh; các ghi chú "lưu ý" là hành vi đã quan sát khi xây dựng chính nền tảng này trên Next.js 16.4.6.

## Bảng tra nhanh

| File | Vai trò | Ghi chú |
|---|---|---|
| `page.tsx` | Nội dung của route; có file này thì thư mục mới thành URL | Server Component mặc định |
| `layout.tsx` | Khung bọc các trang con, giữ nguyên khi chuyển trang | Layout gốc phải có `<html>` và `<body>` |
| `loading.tsx` | Giao diện chờ khi segment đang tải | Bọc trang bằng Suspense — xem lưu ý status code |
| `error.tsx` | Bắt lỗi khi render segment | Bắt buộc là Client Component (`"use client"`) |
| `not-found.tsx` | Giao diện khi gọi `notFound()` | Trả status 404 nếu được gọi trước khi stream |
| `route.ts` | API endpoint (GET, POST…) | Không đặt cùng thư mục với `page.tsx` |
| `template.tsx` | Như layout nhưng tạo lại mỗi lần chuyển trang | Ít dùng; hợp cho hiệu ứng vào trang |
| `sitemap.ts`, `robots.ts` | Sinh `sitemap.xml`, `robots.txt` | Chạy ở server |

## Thư mục đặc biệt

| Mẫu | Ý nghĩa | Ví dụ URL |
|---|---|---|
| `[slug]` | Tham số động | `/courses/nextjs-co-ban` |
| `[...slug]` | Bắt mọi đoạn phía sau | `/docs/a/b/c` |
| `(nhom)` | Nhóm route, **không** xuất hiện trong URL | `(auth)/login` → `/login` |
| `_private` | Không thành route; chứa file nội bộ | — |

## params là Promise

Từ Next.js 15, `params` và `searchParams` của page là **Promise** — phải `await` trước khi dùng:

```tsx title="app/courses/[slug]/page.tsx"
type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <h1>Khóa học: {slug}</h1>;
}
```

Truy cập `params.slug` trực tiếp (không `await`) là lỗi thường gặp khi làm theo hướng dẫn viết cho Next.js 13–14.

## Lưu ý: loading.tsx và status 404

`loading.tsx` bọc nội dung trang trong Suspense, nên Next.js **bắt đầu stream HTML với status 200** trước khi trang chạy xong. Nếu trang gọi `notFound()` sau đó, giao diện 404 vẫn hiện nhưng status HTTP đã là 200 — công cụ tìm kiếm coi đó là "soft 404".

Khi xây nền tảng này, các trang công khai dạng `/courses/[slug]` từng trả 200 cho slug không tồn tại vì có `loading.tsx` ở thư mục gốc. Cách xử lý đã dùng:

- Không đặt `loading.tsx` ở cấp bao trùm các trang công khai cần trả 404 đúng.
- Chỉ đặt `loading.tsx` trong khu vực cần đăng nhập (dashboard, khu quản trị) — nơi không cần index.
- Kiểm tra lại bằng `curl -I` trên **bản build production** (`next build` + `next start`), vì chế độ dev có thể cư xử khác.

```bash title="Kiểm tra status"
curl -I http://localhost:3000/courses/khong-ton-tai
```

```output
HTTP/1.1 404 Not Found
```

## Lưu ý: metadata gộp nông

`metadata` của trang con **thay thế toàn bộ** từng khóa cấp cao của layout, không gộp sâu. Ví dụ trang khai báo `openGraph: { title }` thì mất luôn `siteName`, `locale` mà layout đã đặt cho `openGraph`. Hãy khai báo đủ các trường cần thiết ở trang con (hoặc dùng một hàm dựng chung).

## Server hay Client Component?

- Mặc định mọi file trong `app/` là **Server Component**: đọc database, gọi API có secret, không gửi JS xuống trình duyệt.
- Chỉ thêm `"use client"` cho phần có tương tác (state, sự kiện, API trình duyệt) — và đặt nó ở component lá, không ở cả trang.
- Không truyền hàm, class instance hay object có phương thức từ Server sang Client Component qua props; chỉ truyền dữ liệu tuần tự hóa được.
