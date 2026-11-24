import { expect, test } from "@playwright/test";

/** P05: playground chạy code trong khung cách ly; U07: chuyển theme không cần tải lại và được nhớ. */
test("playground: chạy ví dụ, code không đọc được cookie/trang cha/mạng, vòng lặp vô hạn tự dừng", async ({ page, context }) => {
  await context.addCookies([{ name: "probe_cookie", value: "secret", url: "http://localhost:3100" }]);
  const consoleLine = (t: string) => page.locator("ol[aria-live] li", { hasText: t });
  await page.goto("/playground");
  const frame = page.frameLocator('iframe[title^="Kết quả"]');
  await frame.locator("#btn").click();
  await expect(consoleLine("Số lần bấm: 1")).toBeVisible();

  await page.getByRole("tab", { name: "JavaScript" }).click();
  await page.locator("#pg-editor").fill(
    'const r=[];try{r.push(document.cookie)}catch(e){r.push("cookie:"+e.name)}try{r.push(parent.document.title)}catch(e){r.push("parent:"+e.name)}console.log(r.join("|"));fetch("/api/health").then(()=>console.log("fetch:OK")).catch(()=>console.log("fetch:blocked"));',
  );
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await expect(consoleLine("cookie:SecurityError|parent:SecurityError")).toBeVisible();
  await expect(consoleLine("fetch:blocked")).toBeVisible();

  await page.locator("#pg-editor").fill('let n=0; while (true) { n++; } console.log("sau-vong-lap", n > 0);');
  await page.getByRole("button", { name: /^Chạy/ }).click();
  await expect(consoleLine("sau-vong-lap true")).toBeVisible({ timeout: 10_000 });
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
