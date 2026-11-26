import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Playground Python trực tuyến — chạy Python 3 trên trình duyệt — Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({ eyebrow: "Playground · Python 3 trên trình duyệt", title: "Chạy Python ngay, không cần cài đặt", subtitle: "input(), numpy, pandas, vẽ biểu đồ matplotlib — chạy trong khung cách ly an toàn.", chips: ["8 thử thách chấm tự động", "Lưu & chia sẻ", "Miễn phí"] });
}
