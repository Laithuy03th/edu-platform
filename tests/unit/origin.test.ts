import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/server/request";

/** A13: mutation dùng cookie phải có Origin trùng app (Next.js bỏ qua kiểm tra khi thiếu Origin). */
describe("assertSameOrigin", () => {
  it("chấp nhận Origin của app", () => {
    expect(() => assertSameOrigin({ origin: "http://localhost:3000", host: "localhost:3000" })).not.toThrow();
  });
  it("từ chối thiếu Origin, Origin lạ hoặc sai định dạng", () => {
    for (const origin of [null, "https://evil.example", "null", "not a url"]) {
      expect(() => assertSameOrigin({ origin, host: "localhost:3000" })).toThrowError(expect.objectContaining({ code: "FORBIDDEN_ORIGIN" }));
    }
  });
  it("dev: Origin khớp Host của chính request (vd 127.0.0.1) được chấp nhận", () => {
    expect(() => assertSameOrigin({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" })).not.toThrow();
    expect(() => assertSameOrigin({ origin: "http://127.0.0.1:3000", host: "evil:3000" })).toThrow();
  });
});
