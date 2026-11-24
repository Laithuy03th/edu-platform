import "server-only";
import { z } from "zod";

/** Chuỗi rỗng trong .env được coi như "không đặt" để áp dụng mặc định. */
const opt = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

const bool = (def: boolean) =>
  opt(z.enum(["true", "false", "1", "0"]).optional()).transform((v) => (v === undefined ? def : v === "true" || v === "1"));

const int = (def: number, min = 0) =>
  opt(z.coerce.number().int().min(min).optional()).transform((v) => v ?? def);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: opt(z.enum(["development", "test", "production"]).optional()),
  APP_URL: opt(z.url().optional()),
  DEFAULT_TIMEZONE: opt(z.string().optional()).transform((v) => v ?? "Asia/Ho_Chi_Minh"),
  TRUST_PROXY: bool(false),

  MONGODB_URI: opt(z.string().optional()),
  MONGODB_DB_NAME: opt(z.string().regex(/^[A-Za-z0-9_-]{1,60}$/).optional()),
  MONGODB_MAX_POOL_SIZE: int(5, 1),

  AUTH_SECRET: opt(z.string().min(32, "AUTH_SECRET phải dài ít nhất 32 ký tự").optional()),
  AUTH_GOOGLE_ID: opt(z.string().optional()),
  AUTH_GOOGLE_SECRET: opt(z.string().optional()),
  RATE_LIMIT_SECRET: opt(z.string().min(16).optional()),

  MAIL_TRANSPORT: opt(z.enum(["file", "smtp"]).optional()),
  SMTP_HOST: opt(z.string().optional()),
  SMTP_PORT: int(587, 1),
  // Không đặt → tự suy từ port (465 = TLS ngay từ đầu, còn lại STARTTLS).
  SMTP_SECURE: opt(z.enum(["true", "false", "1", "0"]).optional()),
  SMTP_USER: opt(z.string().optional()),
  SMTP_PASSWORD: opt(z.string().optional()),
  // "Tên <email@domain>" hoặc "email@domain".
  MAIL_FROM: opt(z.string().regex(/^(?:[^<>]+<[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/, "MAIL_FROM phải là email hoặc dạng \"Tên <email@domain>\"").optional()),

  CLOUDINARY_CLOUD_NAME: opt(z.string().regex(/^[A-Za-z0-9_-]+$/).optional()),
  CLOUDINARY_API_KEY: opt(z.string().optional()),
  CLOUDINARY_API_SECRET: opt(z.string().optional()),

  QUOTA_STORAGE_BYTES: int(1024 ** 3, 1),
  QUOTA_VIDEO_MAX_BYTES: int(20 * 1024 ** 2, 1),
  QUOTA_VIDEO_MAX_SECONDS: int(300, 1),
  QUOTA_IMAGE_MAX_BYTES: int(1024 ** 2, 1),
  QUOTA_VIDEOS_PER_COURSE: int(10, 0),
  QUOTA_COURSES_WITH_VIDEO: int(2, 0),
  BUDGET_CLOUDINARY_CREDITS: opt(z.coerce.number().positive().optional()).transform((v) => v ?? 18),
  BUDGET_MONGODB_BYTES: int(300 * 1024 ** 2, 1),
  USAGE_STALE_AFTER_MINUTES: int(1440, 1),

  ALLOW_ADMIN_BOOTSTRAP: bool(false),
});

export type ServerEnv = ReturnType<typeof load>;

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigError(`Cấu hình môi trường không hợp lệ:\n${issues}`);
  }
  const e = parsed.data;
  const appEnv = e.APP_ENV ?? (e.NODE_ENV === "production" ? "production" : e.NODE_ENV);
  const appUrl = (e.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const { mailTransport, smtpSecure } = mailSettings(e, appEnv === "production");
  if (appEnv === "production" && mailTransport === "file") {
    throw new ConfigError("MAIL_TRANSPORT=file không được phép khi APP_ENV=production.");
  }
  return {
    ...e,
    appEnv,
    appUrl,
    appOrigin: new URL(appUrl).origin,
    isProduction: appEnv === "production",
    mailTransport,
    smtpSecure,
    mongoDbName: e.MONGODB_DB_NAME ?? `tuhoc_${appEnv === "production" ? "prod" : appEnv === "test" ? "test" : "dev"}`,
    googleEnabled: Boolean(e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET),
    cloudinaryEnabled: Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
  };
}

/**
 * Chọn transport email (ADR-016, O02): MAIL_TRANSPORT nếu đặt; không thì có SMTP_HOST hoặc production → smtp,
 * còn lại (dev/test không cấu hình) → file outbox. SMTP_SECURE trống → suy từ port (465 = TLS ngay).
 */
export function mailSettings(
  e: { MAIL_TRANSPORT?: "file" | "smtp"; SMTP_HOST?: string; SMTP_PORT: number; SMTP_SECURE?: string },
  isProduction: boolean,
): { mailTransport: "file" | "smtp"; smtpSecure: boolean } {
  const mailTransport = e.MAIL_TRANSPORT ?? (isProduction || e.SMTP_HOST ? "smtp" : "file");
  const smtpSecure = e.SMTP_SECURE === undefined ? e.SMTP_PORT === 465 : e.SMTP_SECURE === "true" || e.SMTP_SECURE === "1";
  return { mailTransport, smtpSecure };
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

let cached: ServerEnv | null = null;

/** Đọc env lười (không làm hỏng build khi .env còn trống). */
export function env(): ServerEnv {
  cached ??= load();
  return cached;
}

/** Lấy biến bắt buộc; thiếu thì ném lỗi thiết lập rõ ràng (không giả lập thành công). */
export function requireEnv<K extends keyof ServerEnv>(key: K, hint?: string): NonNullable<ServerEnv[K]> {
  const v = env()[key];
  if (v === undefined || v === null || v === "") {
    throw new ConfigError(`Thiếu biến môi trường ${String(key)}.${hint ? " " + hint : ""} Xem .env.example.`);
  }
  return v as NonNullable<ServerEnv[K]>;
}

/** Chỉ dùng trong test. */
export function resetEnvCache() {
  cached = null;
}
