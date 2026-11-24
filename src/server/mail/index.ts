import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env, requireEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export type Mail = { to: string; subject: string; text: string; html?: string };

/** Thư mục outbox cho adapter file (chỉ development/test). */
export const DEV_OUTBOX = path.join(process.cwd(), ".data", "mail");

let transport: Transporter | null = null;

/**
 * Gmail hiển thị App Password thành 4 nhóm "abcd efgh ijkl mnop"; dấu cách chỉ để dễ đọc, không thuộc mật khẩu.
 * Chỉ bỏ khoảng trắng với Gmail; provider khác giữ nguyên giá trị người dùng nhập.
 */
export function smtpPassword(host: string, password: string): string {
  return /(^|\.)gmail\.com$/i.test(host) ? password.replace(/\s+/g, "") : password;
}

function smtp(): Transporter {
  if (transport) return transport;
  const e = env();
  const host = requireEnv("SMTP_HOST", "Cần cấu hình SMTP để gửi email.");
  transport = nodemailer.createTransport({
    host,
    port: e.SMTP_PORT,
    secure: e.smtpSecure,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: smtpPassword(host, requireEnv("SMTP_PASSWORD")) } : undefined,
  });
  return transport;
}

/** Kết nối + đăng nhập SMTP mà KHÔNG gửi thư (dùng cho `pnpm mail:check`). Ném lỗi của server SMTP nếu sai. */
export async function verifySmtp(): Promise<void> {
  await smtp().verify();
}

/** Adapter email (ADR-016). Thiếu cấu hình SMTP ở production → ném ConfigError, không giả lập thành công. */
export async function sendMail(mail: Mail): Promise<void> {
  const e = env();
  if (e.mailTransport === "file") {
    if (e.isProduction) throw new Error("file mail transport is not allowed in production");
    await mkdir(DEV_OUTBOX, { recursive: true });
    const file = path.join(DEV_OUTBOX, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    await writeFile(file, JSON.stringify({ ...mail, createdAt: new Date().toISOString() }, null, 2), "utf8");
    logger.info("mail.file_outbox", { to: mail.to, subject: mail.subject, file: path.basename(file) });
    return;
  }
  await smtp().sendMail({
    from: requireEnv("MAIL_FROM", 'Ví dụ: "Tự Học <no-reply@example.com>"'),
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  logger.info("mail.sent", { subject: mail.subject });
}
