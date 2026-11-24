import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/markdown";

/** C16: Markdown do người dùng nhập không được thực thi HTML/JS (ADR-017). */
describe("Markdown an toàn", () => {
  const render = (md: string, allowImages = false) => renderToStaticMarkup(<Markdown allowImages={allowImages}>{md}</Markdown>);

  it("bỏ HTML thô: script, img onerror, iframe", () => {
    const html = render('Xin chào <script>alert(1)</script> <img src=x onerror="alert(2)"> <iframe src="https://evil"></iframe>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/<iframe/i);
  });

  it("link javascript:/data: bị vô hiệu; link http có rel an toàn", () => {
    const html = render("[x](javascript:alert(1)) [y](data:text/html,abc) [z](https://example.com)");
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/href="data:/i);
    expect(html).toMatch(/href="https:\/\/example.com"[^>]*rel="noopener noreferrer nofollow ugc"/);
  });

  it("ảnh ngoài Cloudinary không hiển thị; ảnh Cloudinary chỉ khi cho phép", () => {
    expect(render("![a](https://evil.example/x.png)", true)).not.toMatch(/<img/);
    expect(render("![a](https://res.cloudinary.com/demo/image/upload/x.png)", false)).not.toMatch(/<img/);
    expect(render("![a](https://res.cloudinary.com/demo/image/upload/x.png)", true)).toMatch(/<img[^>]+loading="lazy"/);
  });
});
