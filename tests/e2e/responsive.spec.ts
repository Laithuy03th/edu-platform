import { expect, test } from "@playwright/test";

/** Kiểm tra không tràn ngang + menu mobile/drawer + reduced motion trên các trang công khai chính. */
for (const path of ["/", "/courses", "/courses/nextjs-co-ban", "/paths", "/login", "/register"]) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("menu mobile mở/đóng bằng bàn phím (Escape)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("reduced motion: nội dung vẫn hiển thị đầy đủ", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const hiddenReveal = await page.locator('[data-reveal="hidden"]').count();
  expect(hiddenReveal).toBe(0);
  await ctx.close();
});
