/**
 * Bảo vệ vòng lặp vô hạn cho playground (P05): chèn `if (__lp()) break;` ngay sau `{` của thân
 * for / while / do. Khung sandbox có thể chạy CÙNG tiến trình với trang (tùy trình duyệt), nên một
 * `while (true) {}` làm đơ cả tab — không thể dừng từ bên ngoài. `__lp()` (định nghĩa trong runner)
 * trả true khi code chạy liên tục quá ngưỡng thời gian.
 *
 * Bộ quét bỏ qua chuỗi, template literal, comment; không chèn khi thân vòng lặp không có ngoặc nhọn
 * (vd `while (x) i++;`) — giới hạn đã ghi trên giao diện.
 */
export const LOOP_GUARD = "if (__lp()) break;";

export function protectLoops(src: string): string {
  const out: string[] = [];
  let i = 0;
  const n = src.length;
  const isId = (c: string | undefined) => !!c && /[A-Za-z0-9_$]/.test(c);

  // Bỏ qua chuỗi/comment bắt đầu tại j, trả vị trí ngay sau nó (hoặc j nếu không phải).
  const skipNonCode = (j: number): number => {
    const c = src[j];
    if (c === "/" && src[j + 1] === "/") {
      const e = src.indexOf("\n", j);
      return e < 0 ? n : e;
    }
    if (c === "/" && src[j + 1] === "*") {
      const e = src.indexOf("*/", j + 2);
      return e < 0 ? n : e + 2;
    }
    if (c === '"' || c === "'" || c === "`") {
      let k = j + 1;
      while (k < n && src[k] !== c) k += src[k] === "\\" ? 2 : 1;
      return Math.min(k + 1, n);
    }
    return j;
  };
  const skipSpace = (j: number): number => {
    for (;;) {
      while (j < n && /\s/.test(src[j]!)) j++;
      const k = skipNonCode(j);
      if (k === j || !(src[j] === "/" && (src[j + 1] === "/" || src[j + 1] === "*"))) return j;
      j = k;
    }
  };
  // Tìm ngoặc đóng khớp với `(` tại j.
  const matchParen = (j: number): number => {
    let depth = 0;
    for (let k = j; k < n; ) {
      const s = skipNonCode(k);
      if (s !== k) {
        k = s;
        continue;
      }
      if (src[k] === "(") depth++;
      else if (src[k] === ")" && --depth === 0) return k;
      k++;
    }
    return -1;
  };

  let last = 0;
  while (i < n) {
    const s = skipNonCode(i);
    if (s !== i) {
      i = s;
      continue;
    }
    const prev = src[i - 1];
    const word = src.startsWith("while", i) ? "while" : src.startsWith("for", i) ? "for" : src.startsWith("do", i) ? "do" : null;
    if (word && !isId(prev) && prev !== "." && !isId(src[i + word.length])) {
      let j = skipSpace(i + word.length);
      if (word !== "do") {
        if (src[j] !== "(") {
          i += word.length;
          continue;
        }
        const close = matchParen(j);
        if (close < 0) break;
        j = skipSpace(close + 1);
      }
      if (src[j] === "{") {
        out.push(src.slice(last, j + 1), LOOP_GUARD);
        last = j + 1;
      }
      i = j > i ? j : i + word.length;
      continue;
    }
    i++;
  }
  out.push(src.slice(last));
  return out.join("");
}
