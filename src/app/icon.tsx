import { iconImage } from "@/lib/og";

/** Favicon PNG + icon cho manifest (192/512 — tiêu chí cài đặt PWA, logo cho Organization JSON-LD). */
export function generateImageMetadata() {
  return [32, 192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  return iconImage(Number(await id));
}
