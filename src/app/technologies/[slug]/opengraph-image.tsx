import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";
import { getTechnologyHub } from "@/modules/technologies/service";

export const alt = "Học theo công nghệ trên Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

/** Ảnh chia sẻ của hub công nghệ: tên, mô tả, số khóa/lộ trình thật. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await getTechnologyHub(slug).catch(() => null);
  if (!h || "redirectTo" in h) return ogImage({ eyebrow: "Học theo công nghệ", title: "Lộ trình học lập trình tiếng Việt" });
  return ogImage({
    eyebrow: "Học theo công nghệ",
    title: `Học ${h.name} bằng tiếng Việt`,
    subtitle: h.description,
    chips: [`${h.courses.length} khóa học`, ...(h.paths.length ? [`${h.paths.length} lộ trình`] : []), ...(h.prerequisites.length ? [`Nền tảng: ${h.prerequisites.map((p) => p.name).join(", ")}`] : [])],
  });
}
