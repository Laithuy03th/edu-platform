import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd, breadcrumbLd, courseLd, robotsUnless } from "@/lib/seo";
import { mailSettings } from "@/lib/env";

/** S04: JSON-LD nhúng dữ liệu do người dùng nhập (tên khóa, mô tả) không được đóng thẻ <script>. */
describe("JSON-LD an toàn", () => {
  it("escape '<' để không thoát khỏi thẻ script", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: "</script><script>alert(1)</script>" }} />);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toContain("</script><script>");
    // Vẫn là JSON hợp lệ, giá trị gốc được giữ nguyên sau khi parse.
    const json = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)</script>");
  });

  it("Course không bịa rating/giá; breadcrumb dùng URL tuyệt đối", () => {
    const c = courseLd({ slug: "a", title: "A", shortDescription: "d", instructorName: "GV", level: "Cơ bản", categoryName: null });
    expect(c).not.toHaveProperty("aggregateRating");
    expect(c).not.toHaveProperty("offers");
    expect(c.url).toMatch(/^https?:\/\/[^/]+\/courses\/a$/);
    const b = breadcrumbLd([{ name: "Khóa học", path: "/courses" }]);
    expect(b.itemListElement[0]!.item).toMatch(/^https?:\/\/[^/]+\/courses$/);
  });

  it("robotsUnless: trang indexable không khai báo robots (kế thừa layout)", () => {
    expect(robotsUnless(true)).toEqual({});
    expect(robotsUnless(false)).toEqual({ robots: { index: false, follow: true } });
  });
});

/** O02: có SMTP_HOST thì gửi thật kể cả khi dev; không có thì dev/test dùng outbox file. */
describe("mailSettings", () => {
  it("chọn transport", () => {
    expect(mailSettings({ SMTP_PORT: 587 }, false).mailTransport).toBe("file");
    expect(mailSettings({ SMTP_PORT: 587, SMTP_HOST: "smtp.example.com" }, false).mailTransport).toBe("smtp");
    expect(mailSettings({ SMTP_PORT: 587 }, true).mailTransport).toBe("smtp");
    expect(mailSettings({ SMTP_PORT: 587, SMTP_HOST: "smtp.example.com", MAIL_TRANSPORT: "file" }, false).mailTransport).toBe("file");
  });
  it("SMTP_SECURE trống thì suy từ port", () => {
    expect(mailSettings({ SMTP_PORT: 465 }, false).smtpSecure).toBe(true);
    expect(mailSettings({ SMTP_PORT: 587 }, false).smtpSecure).toBe(false);
    expect(mailSettings({ SMTP_PORT: 587, SMTP_SECURE: "true" }, false).smtpSecure).toBe(true);
    expect(mailSettings({ SMTP_PORT: 465, SMTP_SECURE: "false" }, false).smtpSecure).toBe(false);
  });
});
