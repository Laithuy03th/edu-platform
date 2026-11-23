import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { Container, buttonClass } from "@/components/ui";
import { listFeatured } from "@/modules/courses/catalog";
import { listFeaturedPaths } from "@/modules/learning-paths/service";
import { safeLoad } from "@/components/safe-load";

const FEATURES = [
  { title: "Ghi chú theo thời điểm video", body: "Bấm một nút để ghi chú đúng giây đang xem; bấm lại ghi chú để tua tới đó." },
  { title: "Ôn tập câu sai", body: "Câu trả lời sai được đưa vào lịch ôn 1–3–7–14 ngày theo quy tắc rõ ràng." },
  { title: "Tự đánh giá mức độ hiểu", body: "Học xong vẫn có thể chưa hiểu — đánh dấu để quay lại ôn, tách khỏi tiến độ." },
  { title: "Bài tập dự án có rubric", body: "Nộp link GitHub/demo, tự đánh giá theo tiêu chí, nhận phản hồi từ giảng viên." },
  { title: "Đánh giá đầu vào", body: "Làm bài kiểm tra ngắn để biết chương nào nên học trước, chương nào ôn nhanh." },
  { title: "Tiết kiệm dữ liệu", body: "Không tự phát video, hiển thị dung lượng trước khi tải, ưu tiên bài đọc." },
];

export default async function HomePage() {
  const [featured, paths] = await Promise.all([safeLoad(() => listFeatured(), []), safeLoad(() => listFeaturedPaths(), [])]);
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="grid gap-8 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Học lập trình có lộ trình, có thực hành, có ôn tập.</h1>
            <p className="mt-4 text-lg text-slate-600">
              Bài đọc ngắn gọn, video vừa đủ, quiz chấm ngay và dự án có rubric. Miễn phí trong phạm vi demo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/courses" className={buttonClass("primary")}>
                Xem khóa học
              </Link>
              <Link href="/paths" className={buttonClass("outline")}>
                Chọn lộ trình theo mục tiêu
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-slate-600">{f.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Khóa học nổi bật</h2>
          <Link href="/courses" className="text-sm text-brand-700 hover:underline">
            Tất cả khóa học →
          </Link>
        </div>
        {featured.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <p className="text-slate-600">Chưa có khóa học nào được xuất bản.</p>
        )}

        {paths.length ? (
          <>
            <h2 className="mb-4 mt-12 text-xl font-bold">Lộ trình nổi bật</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((p) => (
                <Link key={p.id} href={`/paths/${p.slug}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.goal}</p>
                  <p className="mt-3 text-xs text-slate-500">{p.itemCount} mục</p>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </Container>
    </>
  );
}
