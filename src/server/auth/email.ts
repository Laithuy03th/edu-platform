/** ADR-005: chuẩn hóa email — trim, NFC, lowercase toàn bộ; KHÔNG bỏ dấu chấm hay +tag. */
export function normalizeEmail(raw: string): string {
  return raw.trim().normalize("NFC").toLowerCase();
}

const EMAIL_RE = /^[^\s@"<>()[\],;:\\]+@[^\s@"<>()[\],;:\\]+\.[^\s@"<>()[\],;:\\]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  // eslint-disable-next-line no-control-regex
  return e.length <= 254 && EMAIL_RE.test(e) && !/[\u0000-\u001f\u007f]/.test(e);
}
