import type { WebFiles } from "@/lib/playground-share";

/** Ví dụ mở sẵn cho playground HTML/CSS/JS — đều chạy được trong khung cách ly (không cần mạng). */
export const WEB_EXAMPLES: { id: string; label: string; files: WebFiles }[] = [
  {
    id: "bo-dem",
    label: "Bộ đếm (DOM + sự kiện)",
    files: {
      html: '<main>\n  <h1>Bộ đếm</h1>\n  <p>Đã bấm <strong id="n">0</strong> lần</p>\n  <button id="btn">Bấm tôi</button>\n</main>',
      css: "body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0; background: #fff1f2; }\nmain { text-align: center; }\nbutton { font: inherit; padding: .6rem 1.2rem; border: 0; border-radius: 999px; background: #b91c1c; color: #fff; cursor: pointer; }\nbutton:active { transform: scale(.96); }",
      js: 'let count = 0;\nconst n = document.querySelector("#n");\ndocument.querySelector("#btn").addEventListener("click", () => {\n  count++;\n  n.textContent = count;\n  console.log("Số lần bấm:", count);\n});',
    },
  },
  {
    id: "mang",
    label: "Mảng: map / filter / reduce + console.table",
    files: {
      html: "<p>Mở Console bên dưới để xem kết quả.</p>",
      css: "body { font-family: system-ui, sans-serif; padding: 1rem; }",
      js: 'const hocVien = [\n  { ten: "An", diem: 8.5, thanhPho: "Hà Nội" },\n  { ten: "Bình", diem: 6, thanhPho: "Đà Nẵng" },\n  { ten: "Chi", diem: 9.25, thanhPho: "TP.HCM" },\n  { ten: "Dũng", diem: 4.5, thanhPho: "Hà Nội" },\n];\n\nconsole.table(hocVien);\nconst dat = hocVien.filter((h) => h.diem >= 5).map((h) => h.ten);\nconsole.log("Đạt:", dat);\nconst tb = hocVien.reduce((s, h) => s + h.diem, 0) / hocVien.length;\nconsole.log("Điểm trung bình:", tb.toFixed(2));\nconsole.log("Theo thành phố:", Object.groupBy(hocVien, (h) => h.thanhPho));',
    },
  },
  {
    id: "flex-cards",
    label: "Flexbox: thẻ khóa học co giãn",
    files: {
      html: '<div class="list">\n  <article class="card"><h3>Next.js cơ bản</h3><p>7 bài · Cơ bản</p></article>\n  <article class="card"><h3>MongoDB</h3><p>6 bài · Trung cấp</p></article>\n  <article class="card"><h3>React</h3><p>Sắp có</p></article>\n</div>',
      css: ".list { display: flex; gap: 12px; flex-wrap: wrap; padding: 16px; font-family: system-ui; }\n.card { flex: 1 1 180px; padding: 20px; border-radius: 16px; background: linear-gradient(135deg, #fecaca, #fff); box-shadow: 0 8px 20px -10px #b91c1c; transition: transform .2s; }\n.card:hover { transform: translateY(-4px); }\n.card h3 { margin: 0 0 4px; }\n.card p { margin: 0; color: #52525b; }",
      js: "",
    },
  },
  {
    id: "grid-gallery",
    label: "CSS Grid: lưới tự co theo màn hình",
    files: {
      html: '<section class="grid">\n' + Array.from({ length: 8 }, (_, i) => `  <div class="o">${i + 1}</div>`).join("\n") + "\n</section>",
      css: ".grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 16px; font-family: system-ui; }\n.o { aspect-ratio: 1; display: grid; place-items: center; border-radius: 14px; background: #fee2e2; color: #991b1b; font-weight: 800; font-size: 1.5rem; }\n.o:nth-child(3n) { background: #b91c1c; color: #fff; }",
      js: "",
    },
  },
  {
    id: "animation",
    label: "CSS Animation: loader và hiệu ứng",
    files: {
      html: '<div class="wrap">\n  <div class="spinner" aria-label="Đang tải"></div>\n  <p class="pulse">Đang tải…</p>\n</div>',
      css: ".wrap { display: grid; place-items: center; min-height: 90vh; gap: 16px; font-family: system-ui; }\n.spinner { width: 56px; height: 56px; border-radius: 50%; border: 6px solid #fee2e2; border-top-color: #b91c1c; animation: spin 0.9s linear infinite; }\n.pulse { animation: pulse 1.4s ease-in-out infinite; color: #991b1b; font-weight: 600; }\n@keyframes spin { to { transform: rotate(360deg); } }\n@keyframes pulse { 50% { opacity: .35; } }\n@media (prefers-reduced-motion: reduce) { .spinner, .pulse { animation: none; } }",
      js: "",
    },
  },
  {
    id: "canvas",
    label: "Canvas: vẽ và hoạt họa",
    files: {
      html: '<canvas id="c" width="480" height="260"></canvas>',
      css: "body { margin: 0; display: grid; place-items: center; min-height: 95vh; background: #0d1117; }\ncanvas { max-width: 100%; border-radius: 12px; background: #161b22; }",
      js: 'const c = document.querySelector("#c");\nconst ctx = c.getContext("2d");\nconst balls = Array.from({ length: 12 }, () => ({\n  x: Math.random() * c.width, y: Math.random() * c.height,\n  vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, r: 6 + Math.random() * 10,\n}));\nfunction frame() {\n  ctx.clearRect(0, 0, c.width, c.height);\n  for (const b of balls) {\n    b.x += b.vx; b.y += b.vy;\n    if (b.x < b.r || b.x > c.width - b.r) b.vx *= -1;\n    if (b.y < b.r || b.y > c.height - b.r) b.vy *= -1;\n    ctx.beginPath();\n    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);\n    ctx.fillStyle = "#f87171";\n    ctx.fill();\n  }\n  requestAnimationFrame(frame);\n}\nframe();',
    },
  },
  {
    id: "form",
    label: "Form: kiểm tra dữ liệu nhập",
    files: {
      html: '<form id="f" novalidate>\n  <label>Email <input id="email" type="email" required></label>\n  <label>Mật khẩu <input id="pw" type="password" minlength="8" required></label>\n  <button>Đăng ký</button>\n  <p id="msg" role="status"></p>\n</form>',
      css: "form { display: grid; gap: 12px; max-width: 320px; margin: 24px auto; font-family: system-ui; }\nlabel { display: grid; gap: 4px; font-weight: 600; }\ninput { padding: 8px 10px; border: 1px solid #d4d4d8; border-radius: 8px; font: inherit; }\ninput:invalid:not(:placeholder-shown) { border-color: #dc2626; }\nbutton { padding: 10px; border: 0; border-radius: 999px; background: #b91c1c; color: #fff; font: inherit; }\n#msg { min-height: 1.5em; }",
      js: 'const f = document.querySelector("#f");\nconst msg = document.querySelector("#msg");\nf.addEventListener("submit", (e) => {\n  e.preventDefault(); // playground không gửi form đi đâu\n  const email = f.email.value.trim();\n  const pw = f.pw.value;\n  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) return (msg.textContent = "Email chưa đúng định dạng.");\n  if (pw.length < 8) return (msg.textContent = "Mật khẩu cần ít nhất 8 ký tự.");\n  msg.textContent = "Hợp lệ! (Ở web thật, server vẫn phải kiểm tra lại.)";\n  console.log({ email, doDaiMatKhau: pw.length });\n});',
    },
  },
  {
    id: "async",
    label: "Bất đồng bộ: Promise, async/await",
    files: {
      html: "<p>Xem thứ tự in ra trong Console.</p>",
      css: "body { font-family: system-ui; padding: 16px; }",
      js: 'const doi = (ms, giaTri) => new Promise((r) => setTimeout(() => r(giaTri), ms));\n\nasync function main() {\n  console.log("1. Bắt đầu");\n  const [a, b] = await Promise.all([doi(300, "dữ liệu A"), doi(150, "dữ liệu B")]);\n  console.log("3. Có cả hai:", a, b);\n  try {\n    await Promise.reject(new Error("Mạng lỗi (giả lập)"));\n  } catch (e) {\n    console.warn("4. Bắt được lỗi:", e.message);\n  }\n}\nmain();\nconsole.log("2. Dòng này chạy trước vì main() chưa await xong");',
    },
  },
];
