import { defineConfig, devices } from "@playwright/test";

/**
 * E2E trọng yếu (TEST_PLAN §4). Chạy trên build production + MongoDB cục bộ đã seed:
 *   pnpm dev:db                          (terminal 1)
 *   MONGODB_URI=... SEED_DEMO_PASSWORD=demo-password-123 pnpm db:seed
 *   pnpm build && pnpm test:e2e          (webServer tự chạy `next start -p 3100`)
 * Không dùng Google/Cloudinary/SMTP thật; email qua adapter file.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive.spec.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27027/?replicaSet=rs0",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-012345",
      APP_URL: `http://localhost:${PORT}`,
      MAIL_TRANSPORT: "file",
    },
  },
});
