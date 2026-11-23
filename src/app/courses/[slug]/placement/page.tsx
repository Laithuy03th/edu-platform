import { notFound, redirect } from "next/navigation";
import { cols } from "@/server/db/models";

/** Chuyển tới bài đánh giá đầu vào (bản published) của khóa; quyền được kiểm tra ở trang quiz. */
export default async function PlacementRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await cols();
  const course = await c.courses.findOne({ slug, status: { $in: ["published", "archived"] } }, { projection: { "published.placementQuizId": 1 } });
  const id = course?.published?.placementQuizId;
  if (!id) notFound();
  redirect(`/quiz/${id.toHexString()}`);
}
