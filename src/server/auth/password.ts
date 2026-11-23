import "server-only";
import { hash, verify, type Algorithm } from "@node-rs/argon2";

/**
 * ADR-004: Argon2id, tham số khởi điểm theo OWASP (m=19 MiB, t=2, p=1).
 * Kết quả benchmark thực đo ghi ở docs/TECH_DECISIONS.md (pnpm bench:argon2).
 */
export const ARGON2_OPTIONS = {
  algorithm: 2 as Algorithm, // Argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
export const PASSWORD_MAX_BYTES = 1024;

/** ADR-005: chuẩn hóa NFC nhất quán khi đặt và khi kiểm tra; không trim, không đổi ký tự khác. */
export function normalizePassword(raw: string): string {
  return raw.normalize("NFC");
}

export function passwordProblems(raw: string): string[] {
  const pw = normalizePassword(raw);
  const problems: string[] = [];
  const codePoints = [...pw].length;
  if (codePoints < PASSWORD_MIN) problems.push(`Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.`);
  if (codePoints > PASSWORD_MAX) problems.push(`Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`);
  if (Buffer.byteLength(pw, "utf8") > PASSWORD_MAX_BYTES) problems.push("Mật khẩu quá dài.");
  return problems;
}

export async function hashPassword(raw: string): Promise<string> {
  const pw = normalizePassword(raw);
  if (Buffer.byteLength(pw, "utf8") > PASSWORD_MAX_BYTES) throw new Error("password too long");
  return hash(pw, ARGON2_OPTIONS);
}

// Hash giả để thời gian phản hồi tương đương khi user không tồn tại (A3).
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= hash("dummy-password-for-timing-equalization", ARGON2_OPTIONS);
  return dummyHash;
}

export async function verifyPassword(stored: string | null, raw: string): Promise<boolean> {
  const pw = normalizePassword(raw);
  if (Buffer.byteLength(pw, "utf8") > PASSWORD_MAX_BYTES) return false;
  if (!stored) {
    await verify(await getDummyHash(), pw).catch(() => false);
    return false;
  }
  try {
    return await verify(stored, pw);
  } catch {
    return false;
  }
}
