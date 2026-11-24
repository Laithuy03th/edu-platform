Lỗi kết nối MongoDB thường xuất hiện ngay lần chạy đầu và có thông báo khá khó đọc. Bài này gom các lỗi hay gặp nhất khi dùng **driver chính thức `mongodb` cho Node.js**, giải thích nguyên nhân và cách sửa. Bốn thông báo lỗi trong bài được tái hiện thật bằng driver 7.9.1 (xem khung "Đã chạy thử"); các lỗi phía MongoDB Atlas (IP, xác thực) được mô tả theo tài liệu chính thức và kinh nghiệm cấu hình, **không** tái hiện bằng tài khoản thật để tránh tạo lần đăng nhập sai.

## Đoạn code kiểm tra kết nối tối thiểu

Dùng đoạn này để tách lỗi kết nối khỏi lỗi trong ứng dụng của bạn:

```js title="check-db.mjs"
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI; // đặt trong biến môi trường, không ghi thẳng vào code
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Kết nối OK");
} catch (err) {
  console.error(err.name, "-", err.message);
} finally {
  await client.close();
}
```

Chạy bằng `node check-db.mjs` sau khi đặt `MONGODB_URI`. `serverSelectionTimeoutMS: 5000` giúp lỗi hiện sau 5 giây thay vì chờ 30 giây mặc định.

## 1. MongoServerSelectionError: connect ECONNREFUSED

```output
MongoServerSelectionError | connect ECONNREFUSED 127.0.0.1:27099
```

**Nghĩa là:** máy của bạn tới được địa chỉ đó nhưng không có tiến trình nào lắng nghe ở cổng này.

**Cách sửa:**

- MongoDB cục bộ chưa chạy — khởi động dịch vụ/tiến trình `mongod`.
- Sai cổng: mặc định là `27017`; kiểm tra lại số cổng trong URI.
- Dùng Docker: cổng container chưa được publish ra máy (`-p 27017:27017`).

## 2. MongoParseError: Invalid connection string (mật khẩu có ký tự đặc biệt)

```output
MongoParseError | Invalid connection string
```

Lỗi này xuất hiện khi mật khẩu chứa ký tự có ý nghĩa trong URL như `@`, `:`, `/`, `%`, `?`, `#`. Ví dụ mật khẩu `p@ss:w0rd` làm driver hiểu sai đâu là tên máy chủ.

**Cách sửa:** mã hóa phần tên người dùng và mật khẩu bằng `encodeURIComponent` trước khi ghép vào URI:

```js
const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`;
```

Cách khác: đặt mật khẩu chỉ gồm chữ và số cho tài khoản database (vẫn đủ dài).

## 3. MongoParseError: Invalid scheme

```output
MongoParseError | Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

**Nghĩa là:** URI viết sai phần đầu, thường do thiếu một dấu `/` (`mongodb:/...`), có khoảng trắng hoặc dấu nháy thừa khi copy vào file `.env`.

**Cách sửa:** in độ dài và ký tự đầu của biến (không in cả chuỗi vì chứa mật khẩu), ví dụ `console.log(uri?.slice(0, 14))`, rồi so với `mongodb+srv://`.

## 4. querySrv ENOTFOUND

```output
Error | querySrv ENOTFOUND _mongodb._tcp.cluster0.khong-ton-tai.mongodb.net
```

URI dạng `mongodb+srv://` yêu cầu tra bản ghi DNS SRV của cluster. Lỗi này nghĩa là tra DNS thất bại.

**Cách sửa:**

- Tên cluster sai: copy lại chuỗi kết nối từ trang **Connect** của Atlas.
- Mạng/DNS chặn bản ghi SRV (một số mạng công ty hoặc DNS của nhà mạng): thử đổi DNS, đổi mạng, hoặc dùng chuỗi kết nối dạng `mongodb://` liệt kê đủ các host mà Atlas cung cấp.

## 5. Atlas: kết nối bị treo rồi timeout (chưa cho phép IP)

Khi IP hiện tại của bạn chưa nằm trong **Network Access** của Atlas, kết nối thường treo tới hết `serverSelectionTimeoutMS` rồi báo `MongoServerSelectionError` kèm lý do không chọn được server.

**Cách sửa:** vào Atlas → **Network Access** → thêm IP hiện tại. Mạng gia đình thường đổi IP sau khi khởi động lại modem, nên lỗi có thể "tự xuất hiện" dù hôm qua vẫn chạy. Chỉ mở `0.0.0.0/0` khi thật sự cần (ví dụ host không có IP cố định) và hiểu rằng khi đó lớp bảo vệ còn lại chỉ là tài khoản/mật khẩu database.

## 6. Atlas: bad auth / Authentication failed

**Nghĩa là:** tới được cluster nhưng sai tên người dùng/mật khẩu **database** (khác với tài khoản đăng nhập trang Atlas), hoặc user không có quyền trên database đó.

**Cách sửa:** kiểm tra user trong **Database Access**, đặt lại mật khẩu, nhớ mã hóa ký tự đặc biệt (mục 2). Cấp quyền tối thiểu cần thiết (ví dụ `readWrite` trên đúng một database) thay vì quyền admin toàn cluster.

## Thói quen giúp tránh lỗi

- Giữ URI trong biến môi trường; **không** commit file `.env`, không in cả URI ra log.
- Tạo **một** `MongoClient` dùng chung cho cả ứng dụng thay vì tạo mới mỗi request — tạo mới liên tục làm cạn kết nối, nhất là với gói Atlas miễn phí.
- Đặt `serverSelectionTimeoutMS` ngắn khi phát triển để thấy lỗi nhanh.
