import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-password-123";

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("E2E-1: đăng ký → xác minh email (outbox) → đăng ký khóa → học → ghi chú → quiz → resume", async ({ page }) => {
  const email = `e2e${Date.now()}@example.com`;
  const pw = "cụm mật khẩu e2e đủ dài";
  await page.goto("/register");
  await page.fill("#displayName", "Học viên E2E");
  await page.fill("#email", email);
  await page.fill("#password", pw);
  await page.fill("#confirmPassword", pw);
  // Nút con mắt hiện/ẩn mật khẩu hoạt động
  await page.getByRole("button", { name: "Hiện mật khẩu" }).first().click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByText("Đăng ký đã được ghi nhận")).toBeVisible();

  // Lấy liên kết xác minh từ outbox file (adapter dev/test)
  await expect.poll(() => readdirSync(path.join(process.cwd(), ".data", "mail")).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const dir = path.join(process.cwd(), ".data", "mail");
  const mail = readdirSync(dir)
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { to: string; text: string })
    .find((m) => m.to === email);
  const token = mail?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  expect(token).toBeTruthy();

  await login(page, email, pw);
  await page.goto(`/verify-email?token=${token}`);
  await page.getByRole("button", { name: "Xác minh email" }).click();
  await expect(page.getByText("Email đã được xác minh")).toBeVisible();

  await page.goto("/courses/nextjs-co-ban");
  await page.locator("button:visible", { hasText: "Đăng ký học miễn phí" }).first().click();
  await page.locator("a:visible", { hasText: /Bắt đầu học/ }).first().click();
  await page.waitForURL(/\/learn\//);
  const lessonUrl = page.url();

  await page.fill("#note-content", "Ghi chú E2E <script>window.__xss=1</script>");
  await page.getByRole("button", { name: "Lưu ghi chú" }).click();
  await expect(page.getByText("Đã lưu").first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();

  await page.getByRole("button", { name: "Đánh dấu đã học" }).click();
  await expect(page.getByText("Đã hoàn thành").first()).toBeVisible();

  // Resume: quay lại khóa học → "Tiếp tục học" dẫn về bài kế tiếp chưa học
  await page.goto("/dashboard");
  await expect(page.getByText(/Tiếp tục học/).first()).toBeVisible();
  await page.goto(lessonUrl);
  await expect(page.getByText("Đã hoàn thành").first()).toBeVisible();
});

test("E2E-2: giảng viên tạo nháp → gửi duyệt → admin duyệt → khóa xuất hiện công khai", async ({ browser }) => {
  const title = `Khóa E2E ${Date.now()}`;
  const ins = await browser.newPage();
  await login(ins, "giangvien@demo.local");
  await ins.goto("/instructor/courses");
  await ins.getByRole("button", { name: "+ Tạo khóa học" }).click();
  await ins.fill("#title", title);
  await ins.getByRole("button", { name: "Tạo bản nháp" }).click();
  await ins.waitForURL(/\/instructor\/courses\/[a-f0-9]{24}$/);
  const courseUrl = ins.url();

  // Trước khi duyệt: không có trong catalog
  const guest = await browser.newPage();
  await guest.goto(`/courses?q=${encodeURIComponent(title)}`);
  await expect(guest.getByText(title)).toHaveCount(0);

  // Thông tin khóa
  await ins.getByRole("tab", { name: "Thông tin khóa học" }).click();
  await ins.fill("#shortDescription", "Khóa học tạo bởi kiểm thử E2E");
  await ins.getByLabel("Mô tả chi tiết").fill("Mô tả chi tiết cho khóa học E2E.");
  await ins.fill("#learningObjectives", "Hiểu luồng duyệt");
  await ins.selectOption("#categoryId", { index: 1 });
  await ins.getByRole("button", { name: "Lưu thông tin" }).click();
  await expect(ins.getByText("Đã lưu thông tin khóa học.")).toBeVisible();

  // Chương + bài
  await ins.getByRole("tab", { name: "Nội dung khóa học" }).click();
  await ins.fill("#new-chapter", "Chương E2E");
  await ins.getByRole("button", { name: "+ Thêm chương" }).click();
  await ins.getByRole("button", { name: "+ Thêm bài học" }).first().click();
  await ins.fill("#lesson-title", "Bài E2E");
  await ins.getByRole("button", { name: "Tạo và soạn bài" }).click();
  await ins.waitForURL(/\/lessons\//);
  await ins.getByLabel("Nội dung bài").fill("# Nội dung\n\nBài học E2E.");
  await ins.getByRole("button", { name: "Lưu bài học" }).click();
  await expect(ins.getByText("Đã lưu bài học.")).toBeVisible();

  await ins.goto(courseUrl);
  await ins.getByRole("button", { name: "Gửi duyệt" }).click();
  await ins.getByRole("dialog").getByRole("button", { name: "Gửi duyệt" }).click();
  await expect(ins.getByText("Đã gửi duyệt.")).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, "admin@demo.local");
  await admin.goto(courseUrl.replace("/instructor/", "/admin/"));
  await admin.getByRole("button", { name: "Duyệt & xuất bản" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Duyệt & xuất bản" }).click();
  await expect(admin.getByText("Đã xuất bản.")).toBeVisible();

  await guest.goto(`/courses?q=${encodeURIComponent("Khóa E2E")}`);
  await expect(guest.getByText(title).first()).toBeVisible();
});
