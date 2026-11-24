import { describe, expect, it } from "vitest";
import { LOOP_GUARD, protectLoops } from "@/lib/loop-protect";

const count = (s: string) => s.split(LOOP_GUARD).length - 1;

describe("protectLoops (P05)", () => {
  it("chèn guard vào thân for/while/do có ngoặc nhọn", () => {
    expect(protectLoops("while (true) { x++; }")).toBe(`while (true) {${LOOP_GUARD} x++; }`);
    expect(count(protectLoops("for (let i = 0; i < 3; i++) {}\nfor (const k of a) {}"))).toBe(2);
    expect(count(protectLoops("do { i++ } while (i < 3);"))).toBe(1); // phần `while (...)` của do-while không có `{`
  });
  it("bỏ qua chuỗi, template, comment và thuộc tính trùng tên", () => {
    const src = 'const s = "while (1) {"; // for (;;) {\n/* do { */ const t = `for(;;){`; obj.for = 1; doThing(); format() {}';
    expect(count(protectLoops(src))).toBe(0);
  });
  it("điều kiện có ngoặc/chuỗi lồng nhau", () => {
    expect(count(protectLoops('while (f(a, ")") && (b || c)) { go(); }'))).toBe(1);
  });
  it("vòng lặp không có ngoặc nhọn: giữ nguyên (giới hạn đã ghi)", () => {
    expect(protectLoops("while (x) i++;")).toBe("while (x) i++;");
  });
  it("code sau khi chèn vẫn hợp lệ và chạy đúng", () => {
    const __lp = () => false;
    const js = protectLoops("let s = 0; for (let i = 1; i <= 4; i++) { s += i; } let j = 0; do { j++; } while (j < 3); return s * 10 + j;");
    expect(new Function("__lp", js)(__lp)).toBe(103);
  });
});
