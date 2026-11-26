import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Playground HTML, CSS, JavaScript trực tuyến — Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({ eyebrow: "Playground · chạy code trên trình duyệt", title: "HTML · CSS · JavaScript", subtitle: "Gõ code, xem kết quả ngay. Gợi ý code, Emmet, console, xem trước theo cỡ điện thoại.", chips: ["10 thử thách chấm tự động", "Lưu & chia sẻ", "Miễn phí"] });
}
