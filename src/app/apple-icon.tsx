import { iconImage } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** apple-touch-icon (iOS thêm vào màn hình chính): nền kín, iOS tự bo góc. */
export default function AppleIcon() {
  return iconImage(180);
}
