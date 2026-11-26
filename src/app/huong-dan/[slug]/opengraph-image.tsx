import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";
import { getPublicArticle, KIND_LABEL } from "@/modules/articles/service";
import { formatDate } from "@/lib/time";

export const alt = "Bài hướng dẫn lập trình trên Tự Học";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

/** Ảnh chia sẻ của bài hướng dẫn: loại bài, tiêu đề, tóm tắt, công nghệ, ngày cập nhật — đều là dữ liệu thật. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getPublicArticle(slug).catch(() => null);
  if (!a || "redirectTo" in a) return ogImage({ eyebrow: "Hướng dẫn & tham khảo", title: "Học lập trình tiếng Việt", subtitle: "Bài hướng dẫn có code chạy được, kiểm thử trên phiên bản cụ thể." });
  return ogImage({
    eyebrow: KIND_LABEL[a.kind],
    title: a.title,
    subtitle: a.summary,
    chips: [...a.technologies.map((t) => t.name).slice(0, 3), `Cập nhật ${formatDate(a.contentUpdatedAt)}`],
  });
}
