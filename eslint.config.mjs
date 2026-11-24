import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Ảnh Cloudinary dùng <img> với srcset kích thước cố định (ADR-011), không qua Image Optimization.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    // ADR-002: next-auth chỉ được import trong src/server/auth (để có thể thay thư viện).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/auth/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next-auth", "next-auth/*"], message: "Chỉ import next-auth trong src/server/auth." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "public/vendor/**", ".data/**"]),
]);

export default eslintConfig;
