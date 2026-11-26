import { expect, test, type Page } from "@playwright/test";

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-password-123";

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("trang thông tin công khai: giới thiệu, chính sách, điều khoản, liên hệ — có trong footer và sitemap", async ({ page, request }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Về Tự Học", exact: true });
  for (const [name, path, h1] of [
    ["Giới thiệu", "/gioi-thieu", "Giới thiệu Tự Học"],
    ["Chính sách bảo mật", "/chinh-sach-bao-mat", "Chính sách bảo mật"],
    ["Điều khoản sử dụng", "/dieu-khoan-su-dung", "Điều khoản sử dụng"],
    ["Liên hệ", "/lien-he", "Liên hệ"],
  ] as const) {
    await footer.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/chinh-sach-bao-mat</loc>");
  expect(sitemap).toContain("/playground/python</loc>");
  // Icon, manifest, ảnh OG dựng động
  expect((await request.get("/manifest.webmanifest")).headers()["content-type"]).toContain("manifest+json");
  expect((await request.get("/icon/512")).headers()["content-type"]).toBe("image/png");
  expect((await request.get("/playground/python/opengraph-image")).headers()["content-type"]).toBe("image/png");
});

test("học viên: tải dữ liệu cá nhân (JSON) rồi tự xóa tài khoản → không đăng nhập lại được", async ({ page }) => {
  const email = `xoa${Date.now()}@example.com`;
  const pw = "cụm mật khẩu xóa tài khoản";
  await page.goto("/register");
  await page.fill("#displayName", "Người sẽ xóa");
  await page.fill("#email", email);
  await page.fill("#password", pw);
  await page.fill("#confirmPassword", pw);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByText("Đăng ký đã được ghi nhận")).toBeVisible();
  await login(page, email, pw);

  // Tải dữ liệu: đúng của mình, không có băm mật khẩu
  const res = await page.request.get("/api/me/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const data = (await res.json()) as { account: { email: string; displayName: string } };
  expect(data.account).toMatchObject({ email, displayName: "Người sẽ xóa" });
  expect(JSON.stringify(data)).not.toContain("passwordHash");

  await page.goto("/settings/security");
  await page.getByRole("button", { name: "Xóa tài khoản…" }).click();
  const dlg = page.getByRole("dialog", { name: "Xóa vĩnh viễn tài khoản?" });
  await dlg.locator("#delete-password").fill("sai mật khẩu rồi");
  await dlg.locator("#delete-confirm").fill("XÓA TÀI KHOẢN");
  await dlg.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await expect(dlg.getByText("Mật khẩu hiện tại không đúng.").first()).toBeVisible();
  await dlg.locator("#delete-password").fill(pw);
  await dlg.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await expect(page.getByText("Tài khoản của bạn đã được xóa.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // Phiên cũ hết hiệu lực; đăng nhập lại bằng email cũ thất bại
  expect((await page.request.get("/api/me/export")).status()).toBe(401);
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", pw);
  await page.locator("form button[type=submit]").click();
  await expect(page).toHaveURL(/\/login/);
});

test("giảng viên xem phân tích khóa (số liệu tổng hợp); admin xem trang kiểm tra SEO", async ({ browser }) => {
  const ins = await browser.newPage();
  await login(ins, "giangvien@demo.local");
  await ins.goto("/instructor/courses");
  await ins.locator('a[href^="/instructor/courses/"]').first().click();
  await ins.waitForURL(/\/instructor\/courses\/[a-f0-9]{24}$/);
  await ins.getByRole("link", { name: "Phân tích" }).click();
  await expect(ins.getByRole("heading", { level: 1 })).toHaveText("Phân tích khóa học");
  await expect(ins.getByText(/Không hiển thị dữ liệu của từng học viên/)).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, "admin@demo.local");
  await admin.goto("/admin/seo");
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText("Kiểm tra SEO");
  await expect(admin.getByText("Cấu hình site")).toBeVisible();
  await expect(admin.getByText(/Khóa học trong sitemap/)).toBeVisible();
});
