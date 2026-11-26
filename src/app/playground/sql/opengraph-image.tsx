import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Playground SQL trực tuyến — SQLite trên trình duyệt — Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({ eyebrow: "Playground · SQLite trên trình duyệt", title: "Luyện SQL với dữ liệu thật", subtitle: "JOIN, GROUP BY, window function trên dữ liệu khóa học và cửa hàng — gợi ý tên bảng/cột, xuất CSV.", chips: ["12 thử thách chấm tự động", "Không cần cài đặt", "Miễn phí"] });
}
