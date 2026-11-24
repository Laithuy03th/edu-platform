# UI_AUDIT — giao diện, responsive, animation, accessibility

Ngày kiểm tra: 2026-11-24. Nguồn quan sát: build production, Playwright (Chromium) và đo trực tiếp. Không chụp dữ liệu học viên hay secret.

## 1. Design token (§36.2): đối chiếu và đo tương phản

Token nằm tập trung ở [globals.css](../src/app/globals.css). Màu trùng bảng gợi ý của V2: canvas `#fffaf9`, surface `#fff`, brand soft `#fca5a5`, subtle `#fee2e2`/`#fff1f2`, CTA `#b91c1c`/hover `#991b1b`, chữ `#18181b`/`#52525b`, viền `#eadddd`. Font Be Vietnam Pro tự host qua next/font, 5 weight 400–800.

| Cặp màu (đo theo công thức WCAG 2.x) | Tỉ lệ | Kết luận |
|---|---|---|
| ink / canvas | 17,12 | AAA |
| ink-soft / canvas | 7,47 | AAA |
| ink-faint / canvas | 5,10 | AA |
| chữ trắng / CTA `#b91c1c` | 6,47 | AA |
| chữ trắng / CTA hover `#991b1b` | 8,31 | AAA |
| chữ CTA / brand-subtle `#fee2e2` | 5,30 | AA |
| chữ trắng / brand soft `#fca5a5` | **1,90** | Không đạt. Đã kiểm tra: cặp này **không được dùng cho chữ**; `text-brand-300` chỉ xuất hiện ở nét gạch SVG trang trí (`aria-hidden`) trên hero |
| viền / surface | 1,32 | Viền trang trí. Không được dùng làm ranh giới duy nhất của control: input có viền `line-strong` và có focus ring |

Màu destructive có nhãn chữ và icon, không chỉ dựa vào màu đỏ (đỏ cũng là màu brand).

## 2. Quan sát theo viewport

| Kiểm tra | Kết quả | Nguồn |
|---|---|---|
| Không tràn ngang ở 375 và 1440: `/`, `/courses`, `/courses/[slug]`, `/paths/[slug]`, `/login` | Đạt (`scrollWidth ≤ clientWidth`) | Script đo hôm nay |
| Không tràn ngang ở 375 (E2E responsive) | Đạt | `tests/e2e/responsive.spec.ts`, 10/10 pass |
| Screenshot 375/768/1440 các trang chính | Đạt sau khi sửa header tablet thành drawer (commit 2eecc25) | PROGRESS 2026-11-24 |
| Menu mobile mở/đóng bằng bàn phím (Escape) | Đạt | E2E |
| Thứ tự Tab trên trang chủ | Skip link → logo → Khóa học → Lộ trình → ô tìm kiếm (có label sr-only) → Đăng nhập; **mọi điểm dừng đều có focus ring** | Script đo hôm nay |
| Ô mật khẩu: nút hiện/ẩn, cảnh báo Caps Lock | Đạt (E2E-1 kiểm tra `type=text` sau khi bấm) | E2E |
| Zoom 200%, thao tác cảm ứng thật, trình đọc màn hình | **Chưa kiểm tra** | — |

## 3. Motion (§36.4)

| Kiểm tra | Kết quả |
|---|---|
| `prefers-reduced-motion: reduce` | 0 animation > 50 ms đang chạy; 0 phần tử chữ bị ẩn trên `/`, `/courses`, `/courses/[slug]`, `/paths` |
| Tắt JavaScript | 0 phần tử chữ ở `opacity: 0`. Nội dung SEO/CTA không phụ thuộc JS |
| Animation tạm dừng khi tab ẩn / ngoài viewport | Có (`visibilitychange`, `IntersectionObserver` trong [motion.tsx](../src/components/motion.tsx)) |
| Chỉ animate transform/opacity | Có. Không có thư viện motion; CSS và một component `Reveal` |
| **Chi phí trên mobile** | `/courses` TBT~660 ms (CPU chậm 4×). Cần profile `Reveal` kết hợp hydrate bộ lọc (P1) |

## 4. Trạng thái màn hình

| Trạng thái | Có | Ghi chú |
|---|---|---|
| Loading (skeleton) | Có ở vùng riêng tư `(student)`, `admin`, `instructor` | **Hôm nay đã bỏ** khỏi trang public để status 404 đúng (SEO_AUDIT #1). Catalog dùng trạng thái chờ của bộ lọc |
| Empty | Có (`EmptyState`) | catalog, ghi chú, ôn tập… |
| Error | `app/error.tsx` | |
| Not-found | `app/not-found.tsx`, trả 404 thật | |
| Forbidden / bị đình chỉ | Có thông báo ở trang khóa học | |
| Offline / upload thất bại | `media-uploader.tsx` có lỗi upload; **chưa thử với upload thật** | Phụ thuộc M09 |

## 5. Đánh giá thiết kế (nhận xét có chủ ý, không chỉ vì "dùng Tailwind")

**Điểm tốt:**
- Hero có nhịp editorial và minh họa UI bằng SVG/CSS, không dùng stock photo.
- Typography tiếng Việt rõ ràng.
- Token nhất quán, CTA tương phản tốt.
- Trang học có focus mode.

**Điểm chưa đạt so với V2 §36.1/36.3:**
1. **Bìa khóa học** là gradient chọn theo hash tiêu đề cộng chữ cái đầu. Chưa thể hiện công nghệ/cấp độ, và các card khá giống nhau → cần hệ bìa theo technology (SVG xác định).
2. **Header** chưa có điều hướng theo mảng IT và technology hub (phụ thuộc taxonomy T01/T02). Chưa có mega menu, và cũng không nên có khi chưa đủ nội dung.
3. **Code block** chỉ là `<pre>` nền tối: chưa có syntax highlight, nút sao chép, tên file hay output mong đợi (T07). Đây là thiếu sót lớn nhất đối với một nền tảng học lập trình.
4. Chưa có layout tutorial/reference: mục lục, heading anchor, callout.
5. Email giao dịch trước dùng nút xanh `#2563eb`, lệch nhận diện → **đã đổi** sang `#b91c1c` hôm nay.
6. Dark theme: chưa có (P2, đúng theo V2).

## 6. Việc tiếp theo (đã đưa vào REMAINING_WORK)

- **P1:** Code block có highlight (chạy ở server, không thêm JS ở client), nút sao chép, filename, output.
- **P1:** Hệ bìa theo technology/cấp độ.
- **P1:** Profile và giảm TBT của `/courses` trên mobile.
- **P1:** Screenshot audit cho learning workspace và admin ở 375/768/1440; test zoom 200%.
- **P2:** Dark theme.
