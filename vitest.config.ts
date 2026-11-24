import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${r("./src/").replace(/\\/g, "/")}$1` },
      // 'server-only' ném lỗi ngoài React Server; trong test Node thay bằng module rỗng.
      { find: /^server-only$/, replacement: r("./tests/setup/empty.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    setupFiles: ["tests/setup/each.ts"],
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
