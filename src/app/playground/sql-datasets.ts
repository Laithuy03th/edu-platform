/**
 * Bộ dữ liệu mẫu cho playground SQL (SQLite chạy trong trình duyệt). Dữ liệu nằm trong bộ nhớ của tab:
 * tải lại trang hoặc "Đặt lại dữ liệu" là về như ban đầu, không có gì gửi lên server.
 */
export type DatasetId = "hoc-tap" | "cua-hang";

/** Mô hình của chính nền tảng học: khóa, bài, học viên, đăng ký. */
const HOC_TAP = `CREATE TABLE courses (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, level TEXT CHECK (level IN ('beginner','intermediate','advanced')));
CREATE TABLE lessons (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id), title TEXT NOT NULL, minutes INTEGER NOT NULL);
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE enrollments (student_id INTEGER REFERENCES students(id), course_id INTEGER REFERENCES courses(id), progress INTEGER DEFAULT 0, PRIMARY KEY (student_id, course_id));
INSERT INTO courses VALUES (1,'nextjs-co-ban','Next.js cơ bản cho người mới','beginner'),(2,'mongodb-cho-web-developer','MongoDB cho web developer','intermediate'),(3,'sql-nhap-mon','SQL nhập môn','beginner');
INSERT INTO lessons (course_id,title,minutes) VALUES (1,'Next.js là gì',6),(1,'Tạo dự án đầu tiên',8),(1,'App Router',10),(1,'Server Component',12),(2,'Document và collection',7),(2,'Nhúng hay tham chiếu',9),(2,'Index theo truy vấn',11),(3,'SELECT cơ bản',8);
INSERT INTO students VALUES (1,'An','Hà Nội'),(2,'Bình','Đà Nẵng'),(3,'Chi','TP.HCM'),(4,'Dũng','Hà Nội'),(5,'Hà',NULL);
INSERT INTO enrollments VALUES (1,1,100),(1,2,40),(2,1,75),(3,1,10),(3,3,0),(4,2,90),(5,1,50);`;

/** Cửa hàng phụ kiện máy tính: sản phẩm, khách, đơn hàng, chi tiết đơn (unit_price = giá lúc mua). */
const CUA_HANG = `CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL);
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT, joined_at TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), created_at TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')));
CREATE TABLE order_items (order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
INSERT INTO products VALUES (1,'Bàn phím cơ','Phụ kiện',890000),(2,'Chuột không dây','Phụ kiện',350000),(3,'Tai nghe Bluetooth','Âm thanh',1290000),(4,'Loa mini','Âm thanh',650000),(5,'Màn hình 24 inch','Màn hình',3290000),(6,'Giá đỡ laptop','Phụ kiện',420000),(7,'Webcam Full HD','Phụ kiện',990000),(8,'Cáp USB-C','Phụ kiện',120000);
INSERT INTO customers VALUES (1,'Nguyễn An','Hà Nội','2025-11-02'),(2,'Trần Bình','Đà Nẵng','2025-12-15'),(3,'Lê Chi','TP.HCM','2026-01-08'),(4,'Phạm Dũng','Hà Nội','2026-01-20'),(5,'Hoàng Em','Cần Thơ','2026-02-11'),(6,'Vũ Giang','TP.HCM','2026-03-03'),(7,'Đỗ Hà','Huế','2026-04-01'),(8,'Bùi Khoa',NULL,'2026-04-18');
INSERT INTO orders VALUES (1,1,'2026-01-05 09:12','shipped'),(2,2,'2026-01-17 14:30','shipped'),(3,1,'2026-02-02 08:45','shipped'),(4,3,'2026-02-14 20:10','paid'),(5,4,'2026-02-25 11:00','cancelled'),(6,3,'2026-03-09 16:20','shipped'),(7,5,'2026-03-21 10:05','shipped'),(8,6,'2026-04-02 19:40','paid'),(9,2,'2026-04-15 13:15','shipped'),(10,1,'2026-05-06 07:55','pending'),(11,6,'2026-05-20 21:30','shipped'),(12,5,'2026-06-01 12:00','paid');
INSERT INTO order_items VALUES (1,8,3,120000),(1,2,1,350000),(2,1,1,890000),(2,5,1,3290000),(3,2,2,350000),(3,3,1,1290000),(4,8,2,120000),(4,6,1,420000),(5,5,2,3290000),(6,2,1,350000),(6,1,1,890000),(6,7,1,990000),(7,8,4,120000),(7,4,1,650000),(8,3,3,1290000),(9,2,2,340000),(10,1,2,890000),(10,6,1,420000),(11,8,2,120000),(11,3,1,1290000),(11,4,1,650000),(12,2,1,350000),(12,7,1,990000);`;

export const DATASETS: Record<DatasetId, { label: string; description: string; sql: string; examples: { label: string; sql: string }[] }> = {
  "hoc-tap": {
    label: "Học tập (khóa học, học viên)",
    description: "courses · lessons · students · enrollments",
    sql: HOC_TAP,
    examples: [
      { label: "Số bài và tổng phút mỗi khóa", sql: "SELECT c.title, COUNT(l.id) AS so_bai, SUM(l.minutes) AS tong_phut\nFROM courses c\nLEFT JOIN lessons l ON l.course_id = c.id\nGROUP BY c.id\nORDER BY tong_phut DESC;" },
      { label: "Học viên và tiến độ (JOIN 3 bảng)", sql: "SELECT s.name, c.title, e.progress\nFROM enrollments e\nJOIN students s ON s.id = e.student_id\nJOIN courses c ON c.id = e.course_id\nORDER BY e.progress DESC;" },
      { label: "Khóa có tiến độ trung bình ≥ 50 (HAVING)", sql: "SELECT c.title, ROUND(AVG(e.progress), 1) AS tb\nFROM courses c\nJOIN enrollments e ON e.course_id = c.id\nGROUP BY c.id\nHAVING AVG(e.progress) >= 50;" },
      { label: "Học viên chưa có thành phố (NULL)", sql: "SELECT name FROM students WHERE city IS NULL;" },
      { label: "Xếp hạng trong từng khóa (window function)", sql: "SELECT c.title, s.name, e.progress,\n       RANK() OVER (PARTITION BY c.id ORDER BY e.progress DESC) AS hang\nFROM enrollments e\nJOIN students s ON s.id = e.student_id\nJOIN courses c ON c.id = e.course_id;" },
      { label: "Thêm, sửa, xóa dữ liệu (INSERT/UPDATE/DELETE)", sql: "INSERT INTO students (name, city) VALUES ('Khánh', 'Huế');\nUPDATE enrollments SET progress = progress + 10 WHERE progress < 50;\nDELETE FROM enrollments WHERE progress = 0;\n\nSELECT * FROM students;\nSELECT * FROM enrollments ORDER BY progress;" },
    ],
  },
  "cua-hang": {
    label: "Cửa hàng (sản phẩm, đơn hàng)",
    description: "products · customers · orders · order_items",
    sql: CUA_HANG,
    examples: [
      { label: "Đơn hàng kèm tên khách", sql: "SELECT o.id, c.name, o.created_at, o.status\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nORDER BY o.created_at;" },
      { label: "Doanh thu theo danh mục", sql: "SELECT p.category, SUM(i.quantity * i.unit_price) AS doanh_thu\nFROM order_items i\nJOIN products p ON p.id = i.product_id\nJOIN orders o ON o.id = i.order_id\nWHERE o.status <> 'cancelled'\nGROUP BY p.category\nORDER BY doanh_thu DESC;" },
      { label: "CTE: chi tiêu của từng khách", sql: "WITH chi_tieu AS (\n  SELECT o.customer_id, SUM(i.quantity * i.unit_price) AS tong\n  FROM orders o\n  JOIN order_items i ON i.order_id = o.id\n  WHERE o.status <> 'cancelled'\n  GROUP BY o.customer_id\n)\nSELECT c.name, COALESCE(ct.tong, 0) AS tong_chi_tieu\nFROM customers c\nLEFT JOIN chi_tieu ct ON ct.customer_id = c.id\nORDER BY tong_chi_tieu DESC;" },
      { label: "Doanh thu lũy kế theo tháng (window)", sql: "SELECT thang, doanh_thu,\n       SUM(doanh_thu) OVER (ORDER BY thang) AS luy_ke\nFROM (\n  SELECT strftime('%Y-%m', o.created_at) AS thang,\n         SUM(i.quantity * i.unit_price) AS doanh_thu\n  FROM orders o\n  JOIN order_items i ON i.order_id = o.id\n  WHERE o.status <> 'cancelled'\n  GROUP BY thang\n);" },
      { label: "Bán thấp hơn giá niêm yết (so sánh 2 bảng)", sql: "SELECT o.id AS don, p.name, p.price AS gia_niem_yet, i.unit_price AS gia_ban\nFROM order_items i\nJOIN products p ON p.id = i.product_id\nJOIN orders o ON o.id = i.order_id\nWHERE i.unit_price < p.price;" },
      { label: "Tạo VIEW và dùng lại", sql: "CREATE VIEW don_hop_le AS\nSELECT * FROM orders WHERE status <> 'cancelled';\n\nSELECT status, COUNT(*) AS so_don\nFROM don_hop_le\nGROUP BY status;" },
    ],
  },
};

export const DATASET_IDS = Object.keys(DATASETS) as DatasetId[];
export const isDatasetId = (v: unknown): v is DatasetId => typeof v === "string" && v in DATASETS;
