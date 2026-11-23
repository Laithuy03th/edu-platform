import "server-only";
import type { Mail } from "./index";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const html = `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
<h2>${esc(title)}</h2>${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
${action ? `<p><a href="${esc(action.url)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${esc(action.label)}</a></p><p style="font-size:12px;color:#555">Hoặc mở liên kết: ${esc(action.url)}</p>` : ""}
<p style="font-size:12px;color:#555">Tự Học — email tự động, vui lòng không trả lời.</p></body></html>`;
  const text = [title, "", ...paragraphs, ...(action ? ["", `${action.label}: ${action.url}`] : [])].join("\n");
  return { html, text };
}

export function verifyEmailMail(to: string, name: string, url: string): Mail {
  return {
    to,
    subject: "Xác minh email của bạn — Tự Học",
    ...layout(
      `Chào ${name},`,
      ["Bấm nút bên dưới để xác minh địa chỉ email. Liên kết có hiệu lực trong 24 giờ.", "Nếu bạn không tạo tài khoản, hãy bỏ qua email này."],
      { label: "Xác minh email", url },
    ),
  };
}

export function resetPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Đặt lại mật khẩu — Tự Học",
    ...layout(
      "Yêu cầu đặt lại mật khẩu",
      ["Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần.", "Sau khi đặt lại, mọi thiết bị đang đăng nhập sẽ bị đăng xuất.", "Nếu bạn không yêu cầu, hãy bỏ qua email này."],
      { label: "Đặt lại mật khẩu", url },
    ),
  };
}

export function setPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Đặt mật khẩu cho tài khoản — Tự Học",
    ...layout(
      "Đặt mật khẩu đăng nhập",
      ["Tài khoản của bạn hiện chỉ đăng nhập bằng Google. Liên kết dưới đây cho phép đặt mật khẩu (hiệu lực 30 phút)."],
      { label: "Đặt mật khẩu", url },
    ),
  };
}

export function existingAccountMail(to: string, loginUrl: string): Mail {
  return {
    to,
    subject: "Có người thử đăng ký bằng email của bạn — Tự Học",
    ...layout(
      "Email này đã có tài khoản",
      ["Ai đó (có thể là bạn) vừa thử tạo tài khoản mới bằng email này. Tài khoản hiện có không bị thay đổi.", "Nếu quên mật khẩu, hãy dùng chức năng Quên mật khẩu."],
      { label: "Đăng nhập", url: loginUrl },
    ),
  };
}
