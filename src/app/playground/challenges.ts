/**
 * Thử thách luyện tập cho playground (tự kiểm tra trên trình duyệt của người học — KHÔNG chấm trên server,
 * không phải bài thi: người học có thể xem test). Tiến độ lưu localStorage của chính máy người học.
 */
export type WebChallenge = {
  id: string;
  title: string;
  level: "Cơ bản" | "Trung bình";
  topic: "JavaScript" | "DOM" | "CSS";
  description: string;
  starter: { html: string; css: string; js: string };
  /** Mã kiểm thử chạy SAU code người học trong khung cách ly: test("…", () => expect(x).toBe(y)). */
  tests: string;
  hint: string;
};

export const WEB_CHALLENGES: WebChallenge[] = [
  {
    id: "tong-mang",
    title: "Tổng các số trong mảng",
    level: "Cơ bản",
    topic: "JavaScript",
    description: "Viết hàm `tong(arr)` trả về tổng các số trong mảng. Mảng rỗng trả về 0.",
    starter: { html: "<p>Mở Console để xem kết quả.</p>", css: "body{font-family:system-ui;padding:16px}", js: "function tong(arr) {\n  // viết code ở đây\n}\n\nconsole.log(tong([1, 2, 3]));\n" },
    tests: `test("tong([1,2,3]) = 6", () => expect(tong([1, 2, 3])).toBe(6));
test("mảng rỗng = 0", () => expect(tong([])).toBe(0));
test("có số âm", () => expect(tong([5, -2, -3])).toBe(0));`,
    hint: "Dùng vòng lặp for…of cộng dồn, hoặc arr.reduce((a, b) => a + b, 0).",
  },
  {
    id: "dao-chuoi",
    title: "Đảo ngược chuỗi",
    level: "Cơ bản",
    topic: "JavaScript",
    description: "Viết hàm `daoChuoi(s)` trả về chuỗi đảo ngược. Ví dụ `daoChuoi(\"abc\")` → `\"cba\"`.",
    starter: { html: "", css: "", js: "function daoChuoi(s) {\n  \n}\n\nconsole.log(daoChuoi(\"Tự Học\"));\n" },
    tests: `test('"abc" → "cba"', () => expect(daoChuoi("abc")).toBe("cba"));
test("chuỗi rỗng", () => expect(daoChuoi("")).toBe(""));
test("có dấu tiếng Việt", () => expect(daoChuoi("Học")).toBe("cọH"));`,
    hint: "Array.from(s) tách đúng ký tự Unicode, sau đó .reverse().join(\"\").",
  },
  {
    id: "loc-chan",
    title: "Lọc số chẵn",
    level: "Cơ bản",
    topic: "JavaScript",
    description: "Viết hàm `locChan(arr)` trả về mảng MỚI chỉ gồm các số chẵn, giữ nguyên thứ tự.",
    starter: { html: "", css: "", js: "function locChan(arr) {\n  \n}\n" },
    tests: `test("[1,2,3,4] → [2,4]", () => expect(locChan([1, 2, 3, 4])).toEqual([2, 4]));
test("không sửa mảng gốc", () => { const a = [2, 3]; locChan(a); expect(a).toEqual([2, 3]); });
test("số âm và 0", () => expect(locChan([-2, -1, 0])).toEqual([-2, 0]));`,
    hint: "arr.filter((x) => x % 2 === 0) — filter luôn tạo mảng mới.",
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    level: "Cơ bản",
    topic: "JavaScript",
    description: "Viết `fizzBuzz(n)` trả về mảng từ 1 tới n: chia hết cho 3 → \"Fizz\", cho 5 → \"Buzz\", cho cả hai → \"FizzBuzz\", còn lại là số.",
    starter: { html: "", css: "", js: "function fizzBuzz(n) {\n  const ketQua = [];\n  \n  return ketQua;\n}\n\nconsole.log(fizzBuzz(15));\n" },
    tests: `test("n = 5", () => expect(fizzBuzz(5)).toEqual([1, 2, "Fizz", 4, "Buzz"]));
test("phần tử thứ 15 là FizzBuzz", () => expect(fizzBuzz(15)[14]).toBe("FizzBuzz"));
test("n = 0 → mảng rỗng", () => expect(fizzBuzz(0)).toEqual([]));`,
    hint: "Kiểm tra điều kiện chia hết cho 15 TRƯỚC, rồi mới đến 3 và 5.",
  },
  {
    id: "viet-hoa-dau",
    title: "Viết hoa chữ cái đầu mỗi từ",
    level: "Trung bình",
    topic: "JavaScript",
    description: "Viết `vietHoaDau(s)`: viết hoa chữ cái đầu mỗi từ, các chữ còn lại viết thường, gộp nhiều dấu cách thành một. Ví dụ `\"  xin   CHÀO việt nam\"` → `\"Xin Chào Việt Nam\"`.",
    starter: { html: "", css: "", js: "function vietHoaDau(s) {\n  \n}\n" },
    tests: `test("câu tiếng Việt", () => expect(vietHoaDau("xin chào việt nam")).toBe("Xin Chào Việt Nam"));
test("chữ hoa lộn xộn", () => expect(vietHoaDau("hỌc LẬP trình")).toBe("Học Lập Trình"));
test("nhiều dấu cách", () => expect(vietHoaDau("  một   hai ")).toBe("Một Hai"));`,
    hint: "s.trim().split(/\\s+/) rồi map từng từ: w[0].toUpperCase() + w.slice(1).toLowerCase().",
  },
  {
    id: "dem-tan-suat",
    title: "Đếm tần suất từ",
    level: "Trung bình",
    topic: "JavaScript",
    description: "Viết `demTu(cau)` trả về object đếm số lần xuất hiện mỗi từ (không phân biệt hoa thường). Ví dụ `demTu(\"a b A\")` → `{ a: 2, b: 1 }`.",
    starter: { html: "", css: "", js: "function demTu(cau) {\n  const dem = {};\n  \n  return dem;\n}\n\nconsole.table(demTu(\"học code code học tiếp\"));\n" },
    tests: `test("đếm cơ bản", () => expect(demTu("a b a")).toEqual({ a: 2, b: 1 }));
test("không phân biệt hoa thường", () => expect(demTu("Học học HỌC")).toEqual({ "học": 3 }));
test("chuỗi rỗng → {}", () => expect(demTu("   ")).toEqual({}));`,
    hint: "Chuyển về chữ thường, tách bằng split(/\\s+/), bỏ chuỗi rỗng, rồi dem[w] = (dem[w] || 0) + 1.",
  },
  {
    id: "bo-dem",
    title: "Nút tăng bộ đếm",
    level: "Cơ bản",
    topic: "DOM",
    description: "Khi bấm nút `#tang`, số trong `#so` tăng thêm 1 (bắt đầu từ 0). Dùng addEventListener.",
    starter: {
      html: '<p>Đã bấm: <strong id="so">0</strong></p>\n<button id="tang">Tăng</button>',
      css: "body{font-family:system-ui;padding:16px}\nbutton{padding:8px 16px;border-radius:999px;border:0;background:#b91c1c;color:#fff}",
      js: "const nut = document.querySelector(\"#tang\");\nconst so = document.querySelector(\"#so\");\n\n// gắn sự kiện click ở đây\n",
    },
    tests: `test("bấm 1 lần → 1", () => { document.querySelector("#tang").click(); expect(document.querySelector("#so").textContent.trim()).toBe("1"); });
test("bấm thêm 2 lần → 3", () => { const b = document.querySelector("#tang"); b.click(); b.click(); expect(document.querySelector("#so").textContent.trim()).toBe("3"); });`,
    hint: "nut.addEventListener(\"click\", () => { so.textContent = Number(so.textContent) + 1; });",
  },
  {
    id: "todo",
    title: "Danh sách việc cần làm",
    level: "Trung bình",
    topic: "DOM",
    description: "Bấm `#them` thì thêm nội dung ô `#viec` thành một `<li>` trong `#ds` rồi xóa trống ô nhập. Bỏ qua nếu ô chỉ có dấu cách.",
    starter: {
      html: '<input id="viec" placeholder="Việc cần làm">\n<button id="them">Thêm</button>\n<ul id="ds"></ul>',
      css: "body{font-family:system-ui;padding:16px}\nli{margin:4px 0}",
      js: "const o = document.querySelector(\"#viec\");\nconst ds = document.querySelector(\"#ds\");\n\ndocument.querySelector(\"#them\").addEventListener(\"click\", () => {\n  // viết code ở đây\n});\n",
    },
    tests: `const o = document.querySelector("#viec"), b = document.querySelector("#them"), ds = document.querySelector("#ds");
test("thêm một việc", () => { o.value = "Học Next.js"; b.click(); expect(ds.children.length).toBe(1); expect(ds.children[0].textContent.trim()).toBe("Học Next.js"); });
test("ô nhập được xóa trống", () => expect(o.value).toBe(""));
test("bỏ qua chuỗi toàn dấu cách", () => { o.value = "   "; b.click(); expect(ds.children.length).toBe(1); });`,
    hint: "Dùng o.value.trim(); tạo li bằng document.createElement(\"li\"), gán textContent (không dùng innerHTML với dữ liệu người dùng).",
  },
  {
    id: "can-giua",
    title: "Căn giữa bằng Flexbox",
    level: "Cơ bản",
    topic: "CSS",
    description: "Viết CSS cho `.khung` để `.hop` nằm chính giữa cả chiều ngang lẫn chiều dọc, dùng Flexbox.",
    starter: {
      html: '<div class="khung"><div class="hop">Giữa</div></div>',
      css: ".khung {\n  height: 200px;\n  background: #fee2e2;\n  /* viết CSS ở đây */\n}\n.hop {\n  padding: 12px 20px;\n  background: #b91c1c;\n  color: #fff;\n  border-radius: 12px;\n}\n",
      js: "",
    },
    tests: `const k = getComputedStyle(document.querySelector(".khung"));
test("display: flex", () => expect(k.display).toBe("flex"));
test("căn giữa ngang", () => expect(k.justifyContent).toBe("center"));
test("căn giữa dọc", () => expect(k.alignItems).toBe("center"));`,
    hint: "display: flex; justify-content: center; align-items: center;",
  },
  {
    id: "luoi-the",
    title: "Lưới 3 cột bằng CSS Grid",
    level: "Trung bình",
    topic: "CSS",
    description: "Cho `.luoi` hiển thị 3 cột bằng nhau với khoảng cách 16px giữa các thẻ, dùng CSS Grid.",
    starter: {
      html: '<div class="luoi">\n  <div class="the">1</div><div class="the">2</div><div class="the">3</div>\n  <div class="the">4</div><div class="the">5</div><div class="the">6</div>\n</div>',
      css: ".luoi {\n  /* viết CSS ở đây */\n}\n.the {\n  padding: 24px;\n  background: #fecaca;\n  border-radius: 12px;\n  text-align: center;\n}\n",
      js: "",
    },
    tests: `const g = getComputedStyle(document.querySelector(".luoi"));
test("display: grid", () => expect(g.display).toBe("grid"));
test("3 cột", () => expect(g.gridTemplateColumns.split(" ").length).toBe(3));
test("3 cột bằng nhau", () => { const c = g.gridTemplateColumns.split(" ").map(parseFloat); expect(Math.max(...c) - Math.min(...c) < 1).toBeTruthy(); });
test("khoảng cách 16px", () => expect(g.columnGap).toBe("16px"));`,
    hint: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;",
  },
];

export type SqlChallenge = { id: string; title: string; level: "Cơ bản" | "Trung bình" | "Nâng cao"; dataset: "hoc-tap" | "cua-hang"; description: string; starter: string; solution: string; ordered: boolean; hint: string };

/**
 * Kết quả mong đợi tính bằng cách chạy `solution` trên dữ liệu mới nạp → so khớp GIÁ TRỊ theo vị trí cột
 * (không so tên cột/bí danh). ordered = true: thứ tự dòng phải đúng (đề có yêu cầu sắp xếp).
 */
export const SQL_CHALLENGES: SqlChallenge[] = [
  { id: "hv-ha-noi", title: "Học viên ở Hà Nội", level: "Cơ bản", dataset: "hoc-tap", description: "Liệt kê tên (`name`) các học viên ở thành phố Hà Nội.", starter: "SELECT \nFROM students\nWHERE ", solution: "SELECT name FROM students WHERE city = 'Hà Nội'", ordered: false, hint: "WHERE city = 'Hà Nội' (chuỗi trong SQL dùng nháy đơn)." },
  { id: "chua-co-thanh-pho", title: "Thiếu thông tin thành phố", level: "Cơ bản", dataset: "hoc-tap", description: "Tìm tên học viên chưa có thành phố (giá trị NULL).", starter: "SELECT name FROM students WHERE ", solution: "SELECT name FROM students WHERE city IS NULL", ordered: false, hint: "So sánh với NULL phải dùng IS NULL, không dùng = NULL." },
  { id: "so-bai-moi-khoa", title: "Số bài mỗi khóa", level: "Cơ bản", dataset: "hoc-tap", description: "Với MỖI khóa học, cho biết `title` và số bài học, sắp xếp số bài giảm dần.", starter: "SELECT c.title, COUNT(l.id) AS so_bai\nFROM courses c\n", solution: "SELECT c.title, COUNT(l.id) FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id ORDER BY COUNT(l.id) DESC", ordered: true, hint: "LEFT JOIN lessons, GROUP BY c.id, rồi ORDER BY so_bai DESC." },
  { id: "dang-ky-nhieu-khoa", title: "Học viên học từ 2 khóa", level: "Trung bình", dataset: "hoc-tap", description: "Liệt kê tên học viên đăng ký từ 2 khóa trở lên.", starter: "SELECT s.name\nFROM students s\nJOIN enrollments e ON e.student_id = s.id\n", solution: "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id GROUP BY s.id HAVING COUNT(*) >= 2", ordered: false, hint: "GROUP BY s.id rồi lọc nhóm bằng HAVING COUNT(*) >= 2." },
  { id: "bai-dai-nhat", title: "Bài dài nhất của mỗi khóa", level: "Nâng cao", dataset: "hoc-tap", description: "Với mỗi khóa, cho biết tên khóa (`courses.title`), tên bài dài nhất (`lessons.title`) và số phút của bài đó — đúng thứ tự 3 cột.", starter: "SELECT c.title, l.title, l.minutes\nFROM lessons l\nJOIN courses c ON c.id = l.course_id\nWHERE ", solution: "SELECT c.title, l.title, l.minutes FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.minutes = (SELECT MAX(minutes) FROM lessons WHERE course_id = l.course_id)", ordered: false, hint: "Truy vấn con tương quan: l.minutes = (SELECT MAX(minutes) FROM lessons WHERE course_id = l.course_id)." },
  { id: "xep-hang-trong-khoa", title: "Xếp hạng học viên trong từng khóa", level: "Nâng cao", dataset: "hoc-tap", description: "Cho biết tên khóa, tên học viên, tiến độ và thứ hạng của học viên trong khóa đó (tiến độ cao nhất hạng 1) — dùng window function.", starter: "SELECT c.title, s.name, e.progress\n       -- thêm cột thứ hạng ở đây\nFROM enrollments e\nJOIN students s ON s.id = e.student_id\nJOIN courses c ON c.id = e.course_id;", solution: "SELECT c.title, s.name, e.progress, RANK() OVER (PARTITION BY c.id ORDER BY e.progress DESC) FROM enrollments e JOIN students s ON s.id = e.student_id JOIN courses c ON c.id = e.course_id", ordered: false, hint: "RANK() OVER (PARTITION BY c.id ORDER BY e.progress DESC)" },
  { id: "don-theo-trang-thai", title: "Đếm đơn theo trạng thái", level: "Cơ bản", dataset: "cua-hang", description: "Đếm số đơn hàng của mỗi trạng thái (`status`) — 2 cột: trạng thái, số đơn.", starter: "SELECT status, \nFROM orders\n", solution: "SELECT status, COUNT(*) FROM orders GROUP BY status", ordered: false, hint: "COUNT(*) kết hợp GROUP BY status." },
  { id: "khach-chua-mua", title: "Khách chưa từng mua", level: "Trung bình", dataset: "cua-hang", description: "Liệt kê tên khách hàng chưa có đơn hàng nào.", starter: "SELECT c.name\nFROM customers c\n", solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL", ordered: false, hint: "LEFT JOIN orders rồi lọc o.id IS NULL (hoặc dùng NOT EXISTS)." },
  { id: "tong-tien-don", title: "Giá trị từng đơn hàng", level: "Trung bình", dataset: "cua-hang", description: "Với mỗi đơn, cho biết `id` đơn và tổng tiền (quantity × unit_price), sắp xếp tổng tiền giảm dần.", starter: "SELECT o.id, SUM(i.quantity * i.unit_price) AS tong_tien\nFROM orders o\n", solution: "SELECT o.id, SUM(i.quantity * i.unit_price) FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id ORDER BY 2 DESC", ordered: true, hint: "JOIN order_items, GROUP BY o.id, ORDER BY tong_tien DESC." },
  { id: "doanh-thu-theo-thang", title: "Doanh thu theo tháng", level: "Trung bình", dataset: "cua-hang", description: "Tính doanh thu (quantity × unit_price) theo tháng `strftime('%Y-%m', o.created_at)`, BỎ QUA đơn bị hủy (`status = 'cancelled'`), sắp xếp theo tháng tăng dần.", starter: "SELECT strftime('%Y-%m', o.created_at) AS thang,\n       SUM(i.quantity * i.unit_price) AS doanh_thu\nFROM orders o\n", solution: "SELECT strftime('%Y-%m', o.created_at), SUM(i.quantity * i.unit_price) FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY 1 ORDER BY 1", ordered: true, hint: "JOIN order_items, WHERE o.status <> 'cancelled', GROUP BY tháng, ORDER BY tháng." },
  { id: "san-pham-ban-chay", title: "Top 3 sản phẩm bán chạy", level: "Trung bình", dataset: "cua-hang", description: "Cho biết tên 3 sản phẩm có tổng số lượng bán nhiều nhất (tính mọi đơn) và tổng số lượng đó, nhiều nhất trước.", starter: "SELECT p.name, SUM(i.quantity) AS da_ban\nFROM products p\n", solution: "SELECT p.name, SUM(i.quantity) FROM products p JOIN order_items i ON i.product_id = p.id GROUP BY p.id ORDER BY SUM(i.quantity) DESC LIMIT 3", ordered: true, hint: "GROUP BY p.id, ORDER BY tổng DESC, LIMIT 3." },
  { id: "khach-vip", title: "Khách hàng VIP", level: "Nâng cao", dataset: "cua-hang", description: "Tìm tên khách có tổng chi tiêu trên 3.000.000 đ (không tính đơn bị hủy) và tổng chi tiêu đó.", starter: "SELECT c.name, SUM(i.quantity * i.unit_price) AS tong\nFROM customers c\n", solution: "SELECT c.name, SUM(i.quantity * i.unit_price) FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.id HAVING SUM(i.quantity * i.unit_price) > 3000000", ordered: false, hint: "JOIN 3 bảng, WHERE bỏ đơn hủy, GROUP BY c.id, HAVING SUM(...) > 3000000." },
];

export type PythonChallenge = { id: string; title: string; level: "Cơ bản" | "Trung bình"; description: string; starter: string; tests: string; hint: string };

/** tests: các dòng `kiem_tra("tên", biểu_thức_bool)` chạy sau code người học (Python). */
export const PYTHON_CHALLENGES: PythonChallenge[] = [
  { id: "tong-chan", title: "Tổng các số chẵn", level: "Cơ bản", description: "Viết hàm `tong_chan(n)` trả về tổng các số chẵn từ 1 đến n.", starter: "def tong_chan(n):\n    # viết code ở đây\n    pass\n\nprint(tong_chan(10))\n", tests: 'kiem_tra("tong_chan(10) == 30", tong_chan(10) == 30)\nkiem_tra("tong_chan(1) == 0", tong_chan(1) == 0)\nkiem_tra("tong_chan(0) == 0", tong_chan(0) == 0)', hint: "sum(range(2, n + 1, 2))" },
  { id: "dem-nguyen-am", title: "Đếm nguyên âm", level: "Cơ bản", description: "Viết `dem_nguyen_am(s)` đếm số nguyên âm a, e, i, o, u (không phân biệt hoa thường, chỉ chữ không dấu).", starter: "def dem_nguyen_am(s):\n    pass\n", tests: 'kiem_tra("\'Python\' có 1", dem_nguyen_am("Python") == 1)\nkiem_tra("\'AEIOU\' có 5", dem_nguyen_am("AEIOU") == 5)\nkiem_tra("chuỗi rỗng có 0", dem_nguyen_am("") == 0)', hint: "sum(1 for c in s.lower() if c in 'aeiou')" },
  { id: "so-nguyen-to", title: "Kiểm tra số nguyên tố", level: "Trung bình", description: "Viết `la_nguyen_to(n)` trả về True nếu n là số nguyên tố.", starter: "def la_nguyen_to(n):\n    pass\n", tests: 'kiem_tra("2 là nguyên tố", la_nguyen_to(2) is True)\nkiem_tra("1 không phải", la_nguyen_to(1) is False)\nkiem_tra("97 là nguyên tố", la_nguyen_to(97) is True)\nkiem_tra("91 = 7×13 không phải", la_nguyen_to(91) is False)', hint: "Thử chia cho các số từ 2 đến int(n ** 0.5) + 1." },
  { id: "tan-suat-tu", title: "Từ xuất hiện nhiều nhất", level: "Trung bình", description: "Viết `tu_pho_bien(cau)` trả về từ xuất hiện nhiều nhất (chữ thường). Nếu hòa, trả về từ xuất hiện trước.", starter: "def tu_pho_bien(cau):\n    pass\n", tests: 'kiem_tra("học code học → học", tu_pho_bien("học code học") == "học")\nkiem_tra("không phân biệt hoa thường", tu_pho_bien("A b a B b") == "b")\nkiem_tra("hòa → từ đến trước", tu_pho_bien("x y") == "x")', hint: "collections.Counter(cau.lower().split()).most_common(1) — Counter giữ thứ tự xuất hiện khi hòa." },
  { id: "giai-thua", title: "Giai thừa", level: "Cơ bản", description: "Viết `giai_thua(n)` trả về n! = 1 × 2 × … × n (quy ước 0! = 1).", starter: "def giai_thua(n):\n    # viết code ở đây\n    pass\n\nprint(giai_thua(5))\n", tests: 'kiem_tra("0! = 1", giai_thua(0) == 1)\nkiem_tra("5! = 120", giai_thua(5) == 120)\nkiem_tra("20! = 2432902008176640000", giai_thua(20) == 2432902008176640000)', hint: "Dùng vòng for nhân dồn từ 1 đến n, hoặc math.prod(range(1, n + 1))." },
  { id: "dao-nguoc", title: "Đảo ngược từng từ", level: "Cơ bản", description: "Viết `dao_tu(cau)` đảo ngược THỨ TỰ các từ trong câu (từ cách nhau bởi khoảng trắng), kết quả nối bằng một dấu cách.", starter: "def dao_tu(cau):\n    pass\n\nprint(dao_tu(\"tôi học Python\"))\n", tests: 'kiem_tra("tôi học Python → Python học tôi", dao_tu("tôi học Python") == "Python học tôi")\nkiem_tra("bỏ khoảng trắng thừa", dao_tu("  a   b  ") == "b a")\nkiem_tra("chuỗi rỗng", dao_tu("") == "")', hint: '" ".join(reversed(cau.split())) — split() không đối số tự bỏ khoảng trắng thừa.' },
  { id: "fibonacci", title: "Dãy Fibonacci nhanh", level: "Trung bình", description: "Viết `fib(n)` trả về số Fibonacci thứ n (fib(0) = 0, fib(1) = 1). Phải chạy nhanh với n = 300.", starter: "def fib(n):\n    pass\n\nprint([fib(i) for i in range(10)])\n", tests: 'kiem_tra("fib(0) = 0", fib(0) == 0)\nkiem_tra("fib(10) = 55", fib(10) == 55)\nkiem_tra("fib(300) chạy nhanh và đúng", fib(300) == 222232244629420445529739893461909967206666939096499764990979600)', hint: "Lặp với hai biến a, b = b, a + b (tránh đệ quy thuần — quá chậm với n lớn)." },
  { id: "doi-xung", title: "Chuỗi đối xứng", level: "Trung bình", description: "Viết `la_doi_xung(s)` trả về True nếu s đọc xuôi ngược như nhau, CHỈ xét chữ và số, không phân biệt hoa thường.", starter: "def la_doi_xung(s):\n    pass\n", tests: 'kiem_tra("Racecar", la_doi_xung("Racecar") is True)\nkiem_tra("câu có dấu câu", la_doi_xung("A man, a plan, a canal: Panama") is True)\nkiem_tra("Python không đối xứng", la_doi_xung("Python") is False)\nkiem_tra("chuỗi rỗng là đối xứng", la_doi_xung("") is True)', hint: "t = [c.lower() for c in s if c.isalnum()] rồi so sánh t == t[::-1]." },
];
