import "./_env";
import { arg } from "./_env";
import { env } from "@/lib/env";
import { sendMail, verifySmtp } from "@/server/mail";

/**
 * Kiểm tra cấu hình SMTP (O02) mà không in giá trị bí mật.
 *   pnpm mail:check                       → kiểm tra biến + kết nối/đăng nhập SMTP (không gửi thư)
 *   pnpm mail:check --send-to=a@b.com     → gửi đúng 1 email thử tới địa chỉ chỉ định
 *   pnpm mail:check --self                → gửi 1 email thử tới chính địa chỉ MAIL_FROM
 */
const mask = (email: string) => email.replace(/^(.)([^@]*)(@.*)$/, (_, a: string, b: string, d: string) => `${a}${"*".repeat(Math.min(b.length, 6))}${d}`);
const addressOf = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

async function main() {
  const e = env();
  const has = (k: keyof typeof e) => (e[k] ? "có" : "THIẾU");
  console.log(`APP_ENV=${e.appEnv} · transport=${e.mailTransport}${e.MAIL_TRANSPORT ? " (MAIL_TRANSPORT)" : " (tự chọn)"}`);
  console.log(`SMTP_HOST: ${e.SMTP_HOST ?? "THIẾU"} · SMTP_PORT: ${e.SMTP_PORT} · secure(TLS ngay): ${e.smtpSecure}`);
  console.log(`SMTP_USER: ${has("SMTP_USER")} · SMTP_PASSWORD: ${has("SMTP_PASSWORD")} · MAIL_FROM: ${e.MAIL_FROM ? mask(addressOf(e.MAIL_FROM)) : "THIẾU"}`);

  if (e.mailTransport === "file") {
    console.log("\n→ Đang dùng outbox file (.data/mail). Email KHÔNG được gửi thật. Điền SMTP_HOST (và các biến SMTP khác) để gửi thật.");
    process.exitCode = 1;
    return;
  }
  const problems: string[] = [];
  if (!e.SMTP_HOST) problems.push("Thiếu SMTP_HOST.");
  if (!e.MAIL_FROM) problems.push('Thiếu MAIL_FROM, ví dụ: Tự Học <ban@gmail.com>.');
  if (e.SMTP_USER && !e.SMTP_PASSWORD) problems.push("Có SMTP_USER nhưng thiếu SMTP_PASSWORD.");
  if (e.SMTP_PORT === 465 && !e.smtpSecure) problems.push("Port 465 cần SMTP_SECURE=true (hoặc bỏ trống để tự suy).");
  if (e.SMTP_PORT === 587 && e.smtpSecure) problems.push("Port 587 dùng STARTTLS: đặt SMTP_SECURE=false (hoặc bỏ trống).");
  if (e.SMTP_PASSWORD && /\s/.test(e.SMTP_PASSWORD)) {
    if (/gmail\.com$/i.test(e.SMTP_HOST ?? "")) console.log("Lưu ý: SMTP_PASSWORD có dấu cách — với Gmail, adapter tự bỏ dấu cách của App Password.");
    else problems.push("SMTP_PASSWORD có khoảng trắng — kiểm tra lại đã dán đúng chưa.");
  }
  if (/gmail\.com$/i.test(e.SMTP_HOST ?? "") && e.SMTP_USER && e.MAIL_FROM && addressOf(e.MAIL_FROM) !== e.SMTP_USER.toLowerCase()) {
    problems.push("Gmail: địa chỉ trong MAIL_FROM khác SMTP_USER → Gmail sẽ ghi đè người gửi hoặc từ chối. Dùng cùng một địa chỉ.");
  }
  if (problems.length) {
    console.log("\nCấu hình chưa hợp lệ:\n- " + problems.join("\n- "));
    process.exitCode = 1;
    return;
  }

  process.stdout.write("\nKết nối + đăng nhập SMTP… ");
  await verifySmtp();
  console.log("OK (server chấp nhận đăng nhập; chưa gửi thư nào).");

  const to = arg("send-to") ?? (process.argv.includes("--self") && e.MAIL_FROM ? addressOf(e.MAIL_FROM) : undefined);
  if (to) {
    await sendMail({ to, subject: "Thử cấu hình email — Tự Học", text: "Email thử từ lệnh pnpm mail:check. Nếu bạn nhận được thư này, SMTP đã hoạt động." });
    console.log(`Đã gửi 1 email thử tới ${mask(to)}. Kiểm tra hộp thư (cả mục Spam).`);
  } else {
    console.log("Muốn thử gửi thật: pnpm mail:check --send-to=<email của bạn>");
  }
}

main().catch((err) => {
  // Chỉ in thông điệp lỗi của nodemailer (không chứa mật khẩu).
  const er = err as { code?: string; responseCode?: number; message?: string };
  console.error(`\nLỖI${er.code ? ` [${er.code}${er.responseCode ? ` ${er.responseCode}` : ""}]` : ""}: ${er.message ?? err}`);
  if (er.code === "EAUTH") console.error("→ Sai SMTP_USER/SMTP_PASSWORD. Với Gmail cần App Password (bật xác minh 2 bước), không dùng mật khẩu đăng nhập Google.");
  if (er.code === "ETIMEDOUT" || er.code === "ESOCKET" || er.code === "ECONNECTION") console.error("→ Không kết nối được: kiểm tra SMTP_HOST/SMTP_PORT/SMTP_SECURE, tường lửa hoặc mạng chặn cổng SMTP.");
  process.exitCode = 1;
});
