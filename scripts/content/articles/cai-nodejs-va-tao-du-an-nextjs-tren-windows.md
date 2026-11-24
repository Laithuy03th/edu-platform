Bài này đưa bạn từ một máy Windows "trắng" tới trang Next.js đầu tiên chạy ở `http://localhost:3000`. Mỗi bước có lệnh, kết quả mong đợi và cách kiểm tra. Các lệnh cho Windows đã được chạy thử thật (xem khung "Đã chạy thử" ở đầu bài); lệnh cho macOS/Linux được ghi để tham khảo nhưng **chưa chạy thử** trong đợt này.

## Bạn cần gì trước khi bắt đầu

- Windows 10/11 có quyền cài phần mềm.
- Kết nối mạng ổn định (bước tạo dự án tải khoảng 360 gói npm, mất khoảng 1 phút).
- Một terminal: **PowerShell** (có sẵn trên Windows) hoặc terminal trong VS Code.

## Bước 1: Cài Node.js bản LTS

Node.js là runtime chạy JavaScript ngoài trình duyệt; Next.js cần nó để chạy server phát triển và build. Chọn bản **LTS** (hỗ trợ dài hạn) thay vì bản "Current" để ít gặp lỗi tương thích.

Cách đơn giản nhất: tải bộ cài `.msi` bản LTS từ trang chính thức nodejs.org, chạy và để mặc định. Bộ cài thêm `node` và `npm` vào `PATH`.

Nếu bạn cần chuyển qua lại nhiều phiên bản Node cho nhiều dự án, dùng trình quản lý phiên bản (ví dụ nvm-windows trên Windows, nvm trên macOS/Linux) thay cho bộ cài trực tiếp.

## Bước 2: Kiểm tra đã cài đúng

**Mở một cửa sổ terminal MỚI** (terminal cũ chưa nhận `PATH` vừa cập nhật), rồi chạy:

```powershell title="Windows (PowerShell)"
node -v
npm -v
git --version
```

```output
v22.13.0
10.9.2
git version 2.51.0.windows.1
```

Số phiên bản của bạn có thể khác — điều quan trọng là mỗi lệnh in ra một phiên bản, không báo lỗi. Git không bắt buộc để chạy Next.js, nhưng `create-next-app` sẽ tự khởi tạo một kho Git nếu máy có Git.

### Lỗi thường gặp ở bước này

- `node : The term 'node' is not recognized...` — terminal đang mở từ trước khi cài. Đóng hẳn và mở terminal mới; nếu vẫn lỗi, đăng xuất/đăng nhập lại Windows để `PATH` được nạp lại.
- PowerShell báo `running scripts is disabled on this system` khi gọi `npm`/`npx` — chính sách thực thi chặn file `.ps1`. Có thể dùng Command Prompt (`cmd`) thay thế, hoặc đổi chính sách cho riêng tài khoản của bạn bằng `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (hiểu rõ tác động trước khi đổi).

## Bước 3: Tạo dự án Next.js

Chạy trong thư mục bạn muốn chứa dự án (ví dụ `Documents\code`):

```powershell title="Windows (PowerShell)"
npx create-next-app@latest blog-cua-toi --ts --app --eslint --tailwind --use-npm --no-src-dir --import-alias "@/*" --turbopack --yes
```

Các cờ trả lời sẵn các câu hỏi tương tác: dùng TypeScript, App Router, ESLint, Tailwind CSS, npm, không dùng thư mục `src`, alias `@/*` và Turbopack. Bỏ `--yes` và các cờ nếu bạn muốn tự chọn từng mục.

Kết thúc thành công trông như sau (rút gọn):

```output
added 360 packages, and audited 361 packages in 56s
found 0 vulnerabilities
Initialized a git repository.
Success! Created blog-cua-toi at ...\blog-cua-toi
```

Ở lần chạy thử, dự án được tạo với `next` **16.4.6** và `react` **19.3.0**. Template mới bật sẵn `cacheComponents: true` trong `next.config.ts` — đây là chế độ cache mới của Next.js; khi đọc tài liệu cũ hoặc bài hướng dẫn khác, để ý xem họ có dùng chế độ này hay không.

## Bước 4: Chạy server phát triển

```powershell title="Windows (PowerShell)"
cd blog-cua-toi
npm run dev
```

```output
▲ Next.js 16.4.6 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 452ms
```

Mở `http://localhost:3000` trong trình duyệt để thấy trang mặc định. Sửa `app/page.tsx` rồi lưu — trang tự cập nhật nhờ Fast Refresh. Dừng server bằng `Ctrl + C`.

Nếu cổng 3000 đang bận (ví dụ bạn đang chạy một dự án khác), Next.js tự chọn cổng khác và in ra trong log; hoặc chỉ định cổng: `npx next dev -p 3456`.

## Bước 5: Build bản production để kiểm tra

```powershell title="Windows (PowerShell)"
npm run build
```

```output
✓ Generating static pages using 5 workers (4/4)
Route (app)
┌ ○ /
└ ○ /_not-found
○  (Static)  prerendered as static content
```

Build thành công nghĩa là code không có lỗi kiểu (TypeScript) và các trang dựng được. Hãy tập thói quen chạy `npm run build` trước khi đẩy code lên — nhiều lỗi chỉ lộ ra ở bước này chứ không lộ ở `npm run dev`.

## Lệnh tương đương trên macOS/Linux (chưa chạy thử)

```bash title="macOS / Linux"
node -v && npm -v && git --version
npx create-next-app@latest blog-cua-toi --ts --app --eslint --tailwind --use-npm --no-src-dir --import-alias "@/*" --turbopack --yes
cd blog-cua-toi && npm run dev
```

Các lệnh npm/npx giống hệt Windows; khác biệt chủ yếu nằm ở cách cài Node (bộ cài `.pkg`, Homebrew, trình quản lý gói của bản phân phối Linux hoặc nvm).

## Kiểm tra cuối

- [ ] `node -v` in ra bản LTS.
- [ ] `npm run dev` hiện "Ready" và trang mở được ở trình duyệt.
- [ ] `npm run build` kết thúc không lỗi.

Xong ba mục trên là bạn sẵn sàng cho khóa "Next.js cơ bản cho người mới".
