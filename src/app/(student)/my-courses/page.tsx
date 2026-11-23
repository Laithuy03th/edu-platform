import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { myCourses } from "@/modules/enrollments/service";
import { CourseCover } from "@/components/course-card";
import { Reveal } from "@/components/motion";
import { IconBook } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader, ProgressBar, buttonClass } from "@/components/ui";

export const metadata = { title: "Khóa học của tôi" };

export default async function MyCoursesPage() {
  const viewer = await requireViewer();
  const courses = await myCourses(viewer);
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title="Khóa học của tôi" description="Tiến độ tính trên các bài bắt buộc của phiên bản khóa học hiện hành." />
      {courses.length === 0 ? (
        <EmptyState icon={<IconBook />} title="Chưa có khóa học" action={<Link href="/courses" className={buttonClass("primary")}>Khám phá khóa học</Link>}>
          Đăng ký một khóa miễn phí để bắt đầu.
        </EmptyState>
      ) : (
        <Reveal group className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const blocked = c.enrollmentStatus === "revoked" || c.status === "suspended";
            return (
              <article key={c.courseId} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="aspect-[16/9] overflow-hidden">{c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <CourseCover title={c.title} className="h-full w-full" />}</div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap gap-1.5">
                    {c.completedAt ? <Badge tone="success">{c.completedVersion !== null && c.completedVersion < c.publishedVersion ? "Hoàn thành bản trước · có bài mới" : "Đã hoàn thành"}</Badge> : null}
                    {c.status === "archived" ? <Badge tone="warning">Đã lưu trữ</Badge> : null}
                    {c.status === "suspended" ? <Badge tone="danger">Tạm ngưng</Badge> : null}
                    {c.enrollmentStatus === "revoked" ? <Badge tone="danger">Đã thu hồi quyền</Badge> : null}
                  </div>
                  <h2 className="text-h3">{c.title}</h2>
                  <ProgressBar value={c.progress.percent} label={`${c.progress.completed}/${c.progress.total} bài bắt buộc`} />
                  {c.lastLessonTitle ? <p className="text-sm text-ink-faint">Gần nhất: {c.lastLessonTitle}</p> : null}
                  <div className="mt-auto pt-2">
                    {blocked ? (
                      <Link href={`/courses/${c.slug}`} className={buttonClass("outline", "w-full")}>
                        Xem chi tiết
                      </Link>
                    ) : (
                      <Link href={`/learn/${c.slug}/${c.lastLessonId ?? c.progress.nextLessonId}`} className={buttonClass("primary", "w-full")}>
                        {c.progress.completed ? "Tiếp tục học" : "Bắt đầu"}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </Reveal>
      )}
    </Container>
  );
}
