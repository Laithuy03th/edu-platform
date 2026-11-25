/** Ví dụ mở sẵn cho playground Python (Pyodide). Gói ngoài thư viện chuẩn (numpy, pandas, matplotlib) tự tải khi import. */
export const PY_EXAMPLES: { id: string; label: string; code: string; stdin?: string }[] = [
  {
    id: "xin-chao",
    label: "Xin chào: biến và f-string",
    code: 'ten = "Tự Học"\nnam = 2026\nprint(f"Xin chào từ {ten}! Năm {nam}.")\n\n# Kiểu dữ liệu cơ bản\nfor gia_tri in [42, 3.14, "chuỗi", True, None, [1, 2], {"a": 1}]:\n    print(f"{gia_tri!r:>10} → {type(gia_tri).__name__}")\n',
  },
  {
    id: "input",
    label: "Nhập dữ liệu với input()",
    code: 'ten = input("Bạn tên gì? ")\nnam_sinh = int(input("Năm sinh: "))\ntuoi = 2026 - nam_sinh\nprint(f"Chào {ten}, năm nay bạn {tuoi} tuổi.")\n\nif tuoi >= 18:\n    print("Bạn đã đủ tuổi bầu cử.")\nelse:\n    print(f"Còn {18 - tuoi} năm nữa bạn mới đủ 18.")\n',
    stdin: "An\n2004\n",
  },
  {
    id: "vong-lap",
    label: "Vòng lặp: bảng cửu chương",
    code: "for i in range(2, 6):\n    dong = [f\"{i}×{j:<2}= {i * j:<3}\" for j in range(1, 10)]\n    print(\"  \".join(dong[:5]))\n    print(\"  \".join(dong[5:]))\n    print()\n\n# while + break\nn = 0\nwhile True:\n    n += 7\n    if n % 5 == 0:\n        print(\"Bội chung nhỏ nhất của 7 và 5:\", n)\n        break\n",
  },
  {
    id: "list-dict",
    label: "List, dict và comprehension",
    code: 'hoc_vien = [\n    {"ten": "An", "diem": 8.5, "thanh_pho": "Hà Nội"},\n    {"ten": "Bình", "diem": 6.0, "thanh_pho": "Đà Nẵng"},\n    {"ten": "Chi", "diem": 9.25, "thanh_pho": "TP.HCM"},\n    {"ten": "Dũng", "diem": 4.5, "thanh_pho": "Hà Nội"},\n]\n\ndat = [h["ten"] for h in hoc_vien if h["diem"] >= 5]\nprint("Đạt:", dat)\n\ntheo_thanh_pho = {}\nfor h in hoc_vien:\n    theo_thanh_pho.setdefault(h["thanh_pho"], []).append(h["ten"])\nprint("Theo thành phố:", theo_thanh_pho)\n\nxep_hang = sorted(hoc_vien, key=lambda h: h["diem"], reverse=True)\nfor hang, h in enumerate(xep_hang, start=1):\n    print(f"{hang}. {h[\'ten\']:<5} {h[\'diem\']:>5}")\n',
  },
  {
    id: "ham-de-quy",
    label: "Hàm, đệ quy và lru_cache",
    code: 'from functools import lru_cache\nimport time\n\n@lru_cache(maxsize=None)\ndef fib(n: int) -> int:\n    """Số Fibonacci thứ n (fib(0) = 0, fib(1) = 1)."""\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nbat_dau = time.perf_counter()\nprint([fib(i) for i in range(15)])\nprint("fib(200) =", fib(200))\nprint(f"Mất {(time.perf_counter() - bat_dau) * 1000:.2f} ms nhờ ghi nhớ kết quả")\n',
  },
  {
    id: "oop",
    label: "Lập trình hướng đối tượng (class)",
    code: 'class TaiKhoan:\n    def __init__(self, chu: str, so_du: int = 0):\n        self.chu = chu\n        self.so_du = so_du\n        self.lich_su: list[str] = []\n\n    def nap(self, so_tien: int) -> None:\n        if so_tien <= 0:\n            raise ValueError("Số tiền nạp phải dương")\n        self.so_du += so_tien\n        self.lich_su.append(f"+{so_tien:,}")\n\n    def rut(self, so_tien: int) -> None:\n        if so_tien > self.so_du:\n            raise ValueError(f"Không đủ tiền: còn {self.so_du:,} đ")\n        self.so_du -= so_tien\n        self.lich_su.append(f"-{so_tien:,}")\n\n    def __repr__(self) -> str:\n        return f"TaiKhoan({self.chu!r}, so_du={self.so_du:,})"\n\ntk = TaiKhoan("An")\ntk.nap(500_000)\ntk.rut(120_000)\nprint(tk, tk.lich_su)\ntry:\n    tk.rut(1_000_000)\nexcept ValueError as loi:\n    print("Lỗi:", loi)\n',
  },
  {
    id: "chuoi",
    label: "Xử lý chuỗi tiếng Việt",
    code: 'import unicodedata\nfrom collections import Counter\n\ncau = "Học lập trình không khó, khó là học đều mỗi ngày. Học đều thì giỏi!"\n\ndef bo_dau(s: str) -> str:\n    s = unicodedata.normalize("NFD", s).replace("đ", "d").replace("Đ", "D")\n    return "".join(c for c in s if unicodedata.category(c) != "Mn")\n\ntu = [t.strip(".,!?").lower() for t in cau.split()]\nprint("Số từ:", len(tu))\nprint("Phổ biến nhất:", Counter(tu).most_common(3))\nprint("Bỏ dấu:", bo_dau(cau))\nprint("Slug:", "-".join(bo_dau(t) for t in tu[:4]))\n',
  },
  {
    id: "asyncio",
    label: "Bất đồng bộ với asyncio",
    code: 'import asyncio\n\nasync def tai(ten: str, giay: float) -> str:\n    print(f"Bắt đầu tải {ten}…")\n    await asyncio.sleep(giay)\n    print(f"Xong {ten} sau {giay}s")\n    return ten.upper()\n\n# Playground hỗ trợ await ở cấp cao nhất\nket_qua = await asyncio.gather(tai("ảnh", 0.6), tai("video", 0.3), tai("phụ đề", 0.1))\nprint("Kết quả:", ket_qua)\n',
  },
  {
    id: "numpy",
    label: "NumPy: mảng và ma trận (tải ~3 MB)",
    code: 'import numpy as np\n\ndiem = np.array([[8.5, 7, 9], [6, 5.5, 7.5], [9.5, 9, 10]])\nprint("Ma trận điểm:\\n", diem)\nprint("Trung bình mỗi học viên:", diem.mean(axis=1).round(2))\nprint("Trung bình mỗi môn:", diem.mean(axis=0).round(2))\nprint("Cao nhất:", diem.max(), "ở vị trí", np.unravel_index(diem.argmax(), diem.shape))\n\nA = np.array([[2, 1], [1, 3]])\nb = np.array([5, 10])\nprint("Nghiệm hệ 2x + y = 5, x + 3y = 10:", np.linalg.solve(A, b))\n',
  },
  {
    id: "matplotlib",
    label: "Matplotlib: vẽ biểu đồ (tải ~10 MB)",
    code: 'import matplotlib.pyplot as plt\nimport numpy as np\n\nthang = ["T1", "T2", "T3", "T4", "T5", "T6"]\nhoc_vien = [120, 180, 260, 310, 420, 560]\n\nfig, (a, b) = plt.subplots(1, 2, figsize=(9, 3.4))\na.bar(thang, hoc_vien, color="#b91c1c")\na.set_title("Học viên mới mỗi tháng")\n\nx = np.linspace(0, 2 * np.pi, 200)\nb.plot(x, np.sin(x), label="sin(x)")\nb.plot(x, np.cos(x), label="cos(x)", linestyle="--")\nb.legend()\nb.set_title("Hàm lượng giác")\nplt.tight_layout()\nplt.show()\n',
  },
  {
    id: "pandas",
    label: "Pandas: phân tích bảng dữ liệu (tải ~12 MB)",
    code: 'import pandas as pd\n\ndf = pd.DataFrame({\n    "khoa_hoc": ["Next.js", "MongoDB", "Next.js", "SQL", "MongoDB", "Next.js"],\n    "hoc_vien": ["An", "Bình", "Chi", "Dũng", "An", "Hà"],\n    "tien_do": [100, 40, 75, 10, 90, 50],\n})\nprint(df, "\\n")\nprint(df.groupby("khoa_hoc")["tien_do"].agg(["count", "mean", "max"]).round(1), "\\n")\nprint("Học viên hoàn thành ≥ 75%:")\nprint(df[df.tien_do >= 75].sort_values("tien_do", ascending=False).to_string(index=False))\n',
  },
];
