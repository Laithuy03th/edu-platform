import { expect, test, type Page } from "@playwright/test";

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-password-123";

/** Gõ code vào CodeMirror (insertText: không bị tự đóng ngoặc như khi gõ từng phím). */
async function setCode(page: Page, code: string) {
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
}

/** P05: playground chạy code trong khung cách ly; U07: chuyển theme không cần tải lại và được nhớ. */
test("playground web: chạy ví dụ, code không đọc được cookie/trang cha/mạng, vòng lặp vô hạn tự dừng, thử thách chấm tự động", async ({ page, context }) => {
  await context.addCookies([{ name: "probe_cookie", value: "secret", url: "http://localhost:3100" }]);
  const consoleLine = (t: string) => page.locator("ol[aria-label=Console] li", { hasText: t });
  await page.goto("/playground");
  await page.locator(".cm-editor").waitFor();
  const frame = page.frameLocator('iframe[title^="Kết quả"]');
  await frame.locator("#btn").click();
  await expect(consoleLine("Số lần bấm: 1")).toBeVisible();

  await page.getByRole("tab", { name: "JavaScript" }).click();
  await setCode(
    page,
    'const r=[];try{r.push(document.cookie)}catch(e){r.push("cookie:"+e.name)}try{r.push(parent.document.title)}catch(e){r.push("parent:"+e.name)}console.log(r.join("|"));fetch("/api/health").then(()=>console.log("fetch:OK")).catch(()=>console.log("fetch:blocked"));',
  );
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await expect(consoleLine("cookie:SecurityError|parent:SecurityError").first()).toBeVisible();
  await expect(consoleLine("fetch:blocked").first()).toBeVisible();

  await setCode(page, 'let n=0; while (true) { n++; } console.log("sau-vong-lap", n > 0);');
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await expect(consoleLine("sau-vong-lap true").first()).toBeVisible({ timeout: 10_000 });

  // Lỗi runtime có số dòng → bấm để nhảy tới dòng đó
  await setCode(page, "const a = 1;\nconsole.log(a);\nkhongCo();\n");
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await page.getByRole("button", { name: "main.js:3 →" }).first().click();
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("3");

  // Thử thách: mở bằng ?thu-thach=, chấm đúng → đánh dấu hoàn thành
  await page.goto("/playground?thu-thach=tong-mang");
  await expect(page.locator("section[aria-label='Thử thách'] h2")).toHaveText("Tổng các số trong mảng");
  await setCode(page, "function tong(arr) {\n  return arr.reduce((a, b) => a + b, 0);\n}\n");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Hoàn thành thử thách “Tổng các số trong mảng”!")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("section[aria-label='Thử thách'] li.text-danger-700")).toHaveCount(0);
});

test("theme: Sáng → Tối áp dụng ngay và được nhớ sau khi tải lại", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Giao diện sáng/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(18, 16, 17)");
});

test("playground SQL: truy vấn, lỗi có gợi ý, khóa ngoại, truy vấn vô hạn bị dừng, thử thách, lưu vào tài khoản", async ({ page }) => {
  const ready = page.getByText(/SQLite 3\.\d+/).first();
  await page.goto("/playground/sql");
  await expect(ready).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("aside[aria-label='Cấu trúc dữ liệu'] summary")).toHaveCount(4);
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await expect(page.locator("section[aria-label='Kết quả 1'] tbody tr").first()).toContainText("Next.js cơ bản cho người mới");

  await setCode(page, "SELEC 1;");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Lỗi" })).toContainText("syntax error");
  await expect(page.getByRole("alert").filter({ hasText: "Lỗi" })).toContainText("Sai cú pháp");

  await setCode(page, "DELETE FROM courses WHERE id = 1;");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Lỗi" })).toContainText("FOREIGN KEY constraint failed");

  await setCode(page, "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) SELECT count(*) FROM n;");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText(/bị dừng/)).toBeVisible({ timeout: 10_000 });
  await expect(ready).toBeVisible({ timeout: 15_000 });

  // Thử thách trên bộ dữ liệu cửa hàng: sai số cột → báo cụ thể; đúng → hoàn thành
  await page.selectOption("#sql-challenge", "khach-chua-mua");
  await expect(page.getByText(/Xem kết quả mong đợi \(2 dòng/)).toBeVisible({ timeout: 15_000 });
  await setCode(page, "SELECT c.name, c.city FROM customers c;");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.locator("section[aria-label='Thử thách'] [role=status]")).toContainText("Cần 1 cột");
  await setCode(page, "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.locator("section[aria-label='Thử thách'] [role=status]")).toContainText("Chính xác!");

  // Lưu vào tài khoản (học viên demo) → mở lại từ "Bản lưu của tôi" → xóa
  await page.goto("/login");
  await page.fill("#email", "hocvien@demo.local");
  await page.fill("#password", PASSWORD);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.goto("/playground/sql");
  await expect(ready).toBeVisible({ timeout: 30_000 });
  const title = `Bản lưu E2E ${Date.now()}`;
  await setCode(page, "SELECT 'e2e-snippet' AS x;");
  await page.getByRole("button", { name: "Lưu vào tài khoản" }).click();
  await page.fill("#snippet-title", title);
  await page.getByRole("dialog", { name: "Lưu vào tài khoản" }).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã lưu vào tài khoản.")).toBeVisible();
  await setCode(page, "SELECT 1;");
  await page.getByRole("button", { name: "Bản lưu của tôi" }).click();
  await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  await expect(page.locator(".cm-content")).toContainText("e2e-snippet");
  await page.getByRole("button", { name: "Bản lưu của tôi" }).click();
  await page.getByRole("button", { name: `Xóa ${title}` }).click();
  await page.getByRole("dialog", { name: `Xóa “${title}”?` }).getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${title}`) })).toHaveCount(0);
});

test("playground Python: chạy, input(), lỗi có số dòng, dừng vòng lặp vô hạn, thử thách", async ({ page }) => {
  // Pyodide tải từ cdn.jsdelivr.net — máy không có mạng thì bỏ qua (không phải lỗi của ứng dụng)
  const cdn = await page.request.get("https://cdn.jsdelivr.net/pyodide/v314.0.8/full/pyodide.mjs").catch(() => null);
  test.skip(!cdn?.ok(), "Không truy cập được cdn.jsdelivr.net");
  test.setTimeout(180_000);
  const out = page.locator("ol[aria-label='Đầu ra chương trình']");
  const ready = page.getByText(/Python 3\.\d+\.\d+ · Pyodide/).first();
  await page.goto("/playground/python");
  await expect(ready).toBeVisible({ timeout: 120_000 });

  await page.selectOption("#py-example", "input");
  await expect(out).toContainText("Chào An, năm nay bạn 22 tuổi.", { timeout: 30_000 });

  await setCode(page, "so = [1, 2, 3]\nprint(so[0])\nprint(so[5])\n");
  await page.keyboard.press("Control+Enter");
  await expect(out).toContainText("IndexError: list index out of range");
  await page.getByRole("button", { name: "main.py:3 →" }).click();
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("3");

  // Không truy cập được API của site từ code Python (khung cách ly + CSP)
  await setCode(page, `from js import fetch\nr = await fetch("${new URL(page.url()).origin}/api/health")\nprint(r.status)\n`);
  await page.keyboard.press("Control+Enter");
  await expect(out).toContainText("Failed to fetch");

  await setCode(page, "while True:\n    pass\n");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText(/đang chạy · [1-9]s/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Dừng", exact: true }).click();
  await expect(ready).toBeVisible({ timeout: 60_000 });
  await setCode(page, "print('tiep-tuc', 6 * 7)\n");
  await page.keyboard.press("Control+Enter");
  await expect(out).toContainText("tiep-tuc 42");

  await page.selectOption("#py-challenge", "dao-nguoc");
  await setCode(page, 'def dao_tu(cau):\n    return " ".join(reversed(cau.split()))\n');
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Hoàn thành thử thách “Đảo ngược từng từ”!")).toBeVisible({ timeout: 30_000 });
});
