import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";
import { formatMinutes } from "@/lib/text";
import { getPathDetail } from "@/modules/learning-paths/service";

export const alt = "Lộ trình học lập trình trên Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

/** Ảnh chia sẻ của lộ trình (chỉ lộ trình đã xuất bản — xem với tư cách khách). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getPathDetail(slug, null).catch(() => null);
  if (!d || d.path.status !== "published") return ogImage({ eyebrow: "Lộ trình theo mục tiêu", title: "Học lập trình có lộ trình rõ ràng" });
  const required = d.items.filter((i) => i.required && i.available);
  const seconds = required.reduce((s, i) => s + i.durationSeconds, 0);
  return ogImage({
    eyebrow: "Lộ trình theo mục tiêu",
    title: d.path.title,
    subtitle: d.path.goal,
    chips: [`${d.items.length} chặng`, ...(seconds ? [`Khoảng ${formatMinutes(seconds)}`] : []), "Miễn phí"],
  });
}
