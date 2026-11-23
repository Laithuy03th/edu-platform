import "server-only";
import { logger } from "@/lib/logger";

/** Trang công khai không sập khi DB chưa cấu hình/lỗi: trả fallback và log. */
export async function safeLoad<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error("page.load_failed", { err });
    return fallback;
  }
}
