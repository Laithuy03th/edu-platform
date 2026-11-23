import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getViewer } from "@/server/auth";
import { getCourseDetail, LEVEL_LABEL } from "@/modules/courses/catalog";
import { getEnrollment } from "@/modules/enrollments/service";
import { courseProgressFor } from "@/modules/learning/queries";
import { listCourseReviews, myCourseReview, canReviewCourse } from "@/modules/reviews/service";
import { Markdown } from "@/components/markdown";
import { Stars } from "@/components/course-card";
import { Alert, Badge, Card, Container, ProgressBar, buttonClass } from "@/components/ui";
import { formatDuration, formatMinutes } from "@/lib/text";
import { EnrollButton } from "./enroll-button";
import { CourseReviews } from "./reviews";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCourseDetail(slug).catch(() => null);
  if (!c) return { title: "Không tìm thấy khóa học" };
  return {
    title: c.title,
    description: c.shortDescription,
    alternates: { canonical: `/courses/${c.slug}` },
    robots: c.status === "published" ? undefined : { index: false },
    openGraph: { title: c.title, description: c.shortDescription, images: c.thumbnailUrl ? [c.thumbnailUrl] : undefined },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) notFound();
  const viewer = await getViewer();
  const courseId = new ObjectId(course.id);
  const isOwner = viewer?.idStr === course.instructorId;
  const isAdmin = viewer?.roles.includes("admin");
  // Khóa bị đình chỉ: chỉ chủ khóa/admin xem chi tiết.
  if (course.status === "suspended" && !isOwner && !isAdmin) {
    return (
      <Container className="py-10">
        <Alert tone="warning" title="Khóa học đang tạm ngưng">
          Khóa học này tạm thời không truy cập được.
        </Alert>
      </Container>
    );
  }
  const enrollment = viewer ? await getEnrollment(viewer.id, courseId) : null;
  if (course.status === "archived" && !enrollment && !isOwner && !isAdmin) notFound();
  const progress = viewer && enrollment?.status === "active" ? await courseProgressFor(viewer.id, courseId) : null;
  const [reviews, myReview, reviewAllowed] = await Promise.all([
    listCourseReviews(courseId, 1),
    viewer ? myCourseReview(viewer.id, courseId) : null,
    viewer ? canReviewCourse(viewer, courseId) : false,
  ]);
  const firstLesson = course.chapters[0]?.lessons[0]?.id;

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="grid gap-8 py-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
              <Link href="/courses" className="hover:underline">
                Khóa học
              </Link>{" "}
              › {course.categoryName ?? "Khác"}
            </nav>
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="mt-3 text-lg text-slate-600">{course.shortDescription}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <Badge tone="info">{LEVEL_LABEL[course.level]}</Badge>
              <Stars value={course.ratingAvg} count={course.ratingCount} />
              <span className="text-slate-600">
                {course.lessonCount} bài · {course.chapters.length} chương · ~{formatMinutes(course.totalDurationSeconds)}
              </span>
              <span className="text-slate-600">Giảng viên: {course.instructorName}</span>
            </div>
            {course.status === "archived" ? (
              <Alert tone="warning" className="mt-4">
                Khóa học đã được lưu trữ: không nhận đăng ký mới. Học viên đã đăng ký vẫn tiếp tục học được.
              </Alert>
            ) : null}
          </div>
          <Card className="h-fit space-y-4">
            {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="aspect-video w-full rounded object-cover" /> : null}
            {enrollment?.status === "active" && progress ? (
              <>
                <ProgressBar value={progress.percent} label={`Đã học ${progress.completed}/${progress.total} bài bắt buộc`} />
                {enrollment.completedAt ? (
                  <Badge tone="success">
                    {enrollment.completedVersion !== null && enrollment.completedVersion < course.publishedVersion ? "Đã hoàn thành phiên bản trước — khóa có nội dung mới" : "Đã hoàn thành khóa học"}
                  </Badge>
                ) : null}
                <Link href={`/learn/${course.slug}/${progress.nextLessonId ?? firstLesson}`} className={buttonClass("primary", "w-full")}>
                  {progress.completed > 0 ? "Tiếp tục học" : "Bắt đầu học"}
                </Link>
                {course.hasPlacementQuiz ? (
                  <Link href={`/courses/${course.slug}/placement`} className={buttonClass("outline", "w-full")}>
                    Làm bài đánh giá đầu vào
                  </Link>
                ) : null}
              </>
            ) : enrollment?.status === "revoked" ? (
              <Alert tone="danger">Quyền truy cập khóa học của bạn đã bị thu hồi{enrollment.revokedReason ? `: ${enrollment.revokedReason}` : "."}</Alert>
            ) : course.status === "published" ? (
              <EnrollButton courseId={course.id} loggedIn={Boolean(viewer)} verified={Boolean(viewer?.emailVerified)} slug={course.slug} />
            ) : null}
            {isOwner || isAdmin ? (
              <Link href={`/instructor/courses/${course.id}`} className={buttonClass("ghost", "w-full")}>
                Mở trình soạn thảo
              </Link>
            ) : null}
            <p className="text-xs text-slate-500">Khóa học miễn phí trong phạm vi demo.</p>
          </Card>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {course.learningObjectives.length ? (
            <section>
              <h2 className="mb-3 text-xl font-bold">Bạn sẽ học được</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {course.learningObjectives.map((o) => (
                  <li key={o} className="flex gap-2 text-sm">
                    <span aria-hidden className="text-green-600">✓</span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="mb-3 text-xl font-bold">Giới thiệu</h2>
            <Markdown>{course.description}</Markdown>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Nội dung khóa học</h2>
            <div className="space-y-3">
              {course.chapters.map((ch, i) => (
                <details key={ch.id} open={i === 0} className="rounded-lg border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 font-medium">
                    Chương {i + 1}: {ch.title} <span className="text-sm font-normal text-slate-500">({ch.lessons.length} bài)</span>
                  </summary>
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {ch.lessons.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span aria-hidden>{l.type === "video" ? "▶" : "📄"}</span>
                          <span className="sr-only">{l.type === "video" ? "Video:" : "Bài đọc:"}</span>
                          {l.isPreview ? (
                            <Link href={`/learn/${course.slug}/${l.id}`} className="text-brand-700 hover:underline">
                              {l.title}
                            </Link>
                          ) : (
                            l.title
                          )}
                          {l.isPreview ? <Badge tone="success">Học thử</Badge> : null}
                          {!l.isRequired ? <Badge>Tùy chọn</Badge> : null}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{formatDuration(l.durationSeconds)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
          <CourseReviews
            courseId={course.id}
            reviews={reviews}
            myReview={myReview ? { rating: myReview.rating, comment: myReview.comment } : null}
            canReview={reviewAllowed}
            loggedIn={Boolean(viewer)}
          />
        </div>
        <aside className="space-y-6">
          {course.prerequisites.length ? (
            <Card>
              <h2 className="mb-2 font-semibold">Kiến thức đầu vào</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {course.prerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <h2 className="mb-2 font-semibold">Giảng viên</h2>
            <p className="font-medium">{course.instructorName}</p>
            {course.instructorBio ? <p className="mt-1 text-sm text-slate-600">{course.instructorBio}</p> : null}
          </Card>
        </aside>
      </Container>
    </>
  );
}
