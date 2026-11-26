/**
 * srcset cho ảnh bìa Cloudinary đã có transformation cố định `c_limit,w_<n>` (ADR-011: chỉ 3 độ rộng 320/640/960,
 * không tạo transformation tùy ý). URL không đúng mẫu → trả nguyên src (không srcset). Dùng được ở client lẫn server.
 */
const W = [320, 640, 960] as const;
export function coverSrcSet(url: string | null | undefined): { src: string; srcSet?: string } | null {
  if (!url) return null;
  if (!/\/c_limit,w_\d+,/.test(url)) return { src: url };
  return { src: url.replace(/\/c_limit,w_\d+,/, "/c_limit,w_640,"), srcSet: W.map((w) => `${url.replace(/\/c_limit,w_\d+,/, `/c_limit,w_${w},`)} ${w}w`).join(", ") };
}
