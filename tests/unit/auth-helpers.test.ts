import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/server/auth/email";
import { normalizePassword, passwordProblems } from "@/server/auth/password";
import { safeCallbackUrl } from "@/server/auth/redirect";
import { __test as loggerTest } from "@/lib/logger";

const ORIGIN = "http://localhost:3000";

describe("normalizeEmail (ADR-005)", () => {
  it("trim + lowercase nhưng giữ dấu chấm và +tag", () => {
    expect(normalizeEmail("  John.Doe+LMS@GMail.com ")).toBe("john.doe+lms@gmail.com");
  });
  it("validate cơ bản", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(`${"x".repeat(250)}@b.co`)).toBe(false);
  });
});

describe("mật khẩu (A15)", () => {
  it("12–128 ký tự, đếm theo code point", () => {
    expect(passwordProblems("short")).not.toHaveLength(0);
    expect(passwordProblems("mật khẩu dài đủ")).toHaveLength(0);
    expect(passwordProblems("a".repeat(129))).not.toHaveLength(0);
    // 12 emoji = 12 code point (24 UTF-16 unit) → hợp lệ
    expect(passwordProblems("😀".repeat(12))).toHaveLength(0);
  });
  it("NFC và NFD của cùng chuỗi tiếng Việt cho cùng kết quả; không trim khoảng trắng", () => {
    const nfc = "Tiếng Việt rất hay".normalize("NFC");
    const nfd = nfc.normalize("NFD");
    expect(nfc).not.toBe(nfd);
    expect(normalizePassword(nfd)).toBe(normalizePassword(nfc));
    expect(normalizePassword("  có khoảng trắng  ")).toBe("  có khoảng trắng  ");
  });
});

describe("safeCallbackUrl (A12 open redirect)", () => {
  it.each([
    ["//evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/api/auth/signout", "/dashboard"],
    ["", "/dashboard"],
    [undefined, "/dashboard"],
    ["/courses/abc?x=1#y", "/courses/abc?x=1#y"],
    ["/learn/a/b", "/learn/a/b"],
  ])("%s → %s", (input, expected) => {
    expect(safeCallbackUrl(input, ORIGIN)).toBe(expected);
  });
});

describe("logger redaction", () => {
  it("che các khóa nhạy cảm ở mọi độ sâu", () => {
    const out = loggerTest.redact({ password: "x", nested: { token: "t", ok: 1 }, list: [{ cookie: "c" }] }) as Record<string, unknown>;
    expect(out.password).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).token).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
    expect(((out.list as unknown[])[0] as Record<string, unknown>).cookie).toBe("[redacted]");
  });
});
