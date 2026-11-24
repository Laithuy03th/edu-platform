import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveCourseSlugRedirect } from "@/modules/courses/authoring";
import { ObjectId } from "mongodb";
import { getViewer } from "@/server/auth";
import { getCourseDetail, LEVEL_LABEL } from "@/modules/courses/catalog";
import { getEnrollment } from "@/modules/enrollments/service";
import { courseProgressFor } from "@/modules/learning/queries";
import { listCourseReviews, myCourseReview, canReviewCourse } from "@/modules/reviews/service";
import { Markdown } from "@/components/markdown";
import { CourseCover, Stars } from "@/components/course-card";
import { Avatar } from "@/components/avatar";
import { Reveal } from "@/components/motion";
import { IconBook, IconCheck, IconChevronDown, IconClock, IconLock, IconPlay, IconTarget } from "@/components/icons";
import { Alert, Badge, Card, Container, ProgressBar, buttonClass } from "@/components/ui";
import { formatDuration, formatMinutes } from "@/lib/text";
import { formatDate } from "@/lib/time";
import { EnrollButton } from "./enroll-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { isBookmarked } from "@/modules/bookmarks/service";
import { CourseReviews } from "./reviews";
import { JsonLd, breadcrumbLd, courseLd, pageOpenGraph, robotsUnless } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCourseDetail(slug).catch(() => null);
  if (!c) return { title: "Không tìm thấy khóa học" };
  return {
    title: c.title,
    description: c.shortDescription,
    alternates: { canonical: `/courses/${c.slug}` },
    ...robotsUnless(c.status === "published"),
    openGraph: pageOpenGraph({ title: c.title, description: c.shortDescription, url: `/courses/${c.slug}`, images: c.thumbnailUrl ? [c.thumbnailUrl] : undefined }),
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) {
    // S06: slug cũ của khóa đã đổi đường dẫn → 308 về URL mới
    const to = await resolveCourseSlugRedirect(slug);
    if (to) permanentRedirect(`/courses/${to}`);
    notFound();
  }
  const viewer = await getViewer();
  const courseId = new ObjectId(course.id);
  const isOwner = viewer?.idStr === course.instructorId;
  const isAdmin = viewer?.roles.includes("admin");
  if (course.status === "suspended" && !isOwner && !isAdmin) {
    return (
      <Container className="py-16">
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
  const previewCount = course.chapters.reduce((n, ch) => n + ch.lessons.filter((l) => l.isPreview).length, 0);
  const firstPreview = course.chapters.flatMap((ch) => ch.lessons).find((l) => l.isPreview);

  const cta =
    enrollment?.status === "active" && progress ? (
      <Link href={`/learn/${course.slug}/${progress.nextLessonId ?? firstLesson}`} className={buttonClass("primary", "w-full", "lg")}>
        {progress.completed > 0 ? "Tiếp tục học" : "Bắt đầu học"} →
      </Link>
    ) : enrollment?.status === "revoked" ? null : course.status === "published" ? (
      <EnrollButton courseId={course.id} loggedIn={Boolean(viewer)} verified={Boolean(viewer?.emailVerified)} slug={course.slug} />
    ) : null;

  return (
    <div className="pb-24 lg:pb-0">
      {course.status === "published" ? (
        <JsonLd
          data={[
            courseLd({ ...course, level: LEVEL_LABEL[course.level] }),
            breadcrumbLd([{ name: "Khóa học", path: "/courses" }, { name: course.title, path: `/courses/${course.slug}` }]),
          ]}
        />
      ) : null}
      {/* ---- Hero ---- */}
      <section className="bg-grain-warm border-b border-line">
        <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <div className="stagger-in min-w-0">
            <nav aria-label="Breadcrumb" style={{ "--i": 0 } as React.CSSProperties} className="mb-4 flex flex-wrap gap-1.5 text-sm text-ink-faint">
              <Link href="/courses" className="hover:text-brand-700">
                Khóa học
              </Link>
              <span aria-hidden>/</span>
              <span>{course.categoryName ?? "Khác"}</span>
            </nav>
            <div style={{ "--i": 1 } as React.CSSProperties} className="flex flex-wrap gap-2">
              <Badge tone="brand">{LEVEL_LABEL[course.level]}</Badge>
              {previewCount ? <Badge tone="success">{previewCount} bài học thử</Badge> : null}
              {course.status === "archived" ? <Badge tone="warning">Đã lưu trữ</Badge> : null}
            </div>
            <h1 style={{ "--i": 2 } as React.CSSProperties} className="text-display mt-4 text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
              {course.title}
            </h1>
            <p style={{ "--i": 3 } as React.CSSProperties} className="mt-4 max-w-2xl text-lg text-ink-soft">
              {course.shortDescription}
            </p>
            <dl style={{ "--i": 4 } as React.CSSProperties} className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-soft">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Đánh giá</dt>
                <dd>
                  <Stars value={course.ratingAvg} count={course.ratingCount} />
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <IconBook size={16} className="text-brand-600" />
                <dt className="sr-only">Số bài</dt>
                <dd>
                  {course.lessonCount} bài · {course.chapters.length} chương
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <IconClock size={16} className="text-brand-600" />
                <dt className="sr-only">Thời lượng</dt>
                <dd>Khoảng {formatMinutes(course.totalDurationSeconds)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">Giảng viên</dt>
                <dd className="flex items-center gap-2">
                  <Avatar name={course.instructorName} size={24} /> {course.instructorName}
                </dd>
              </div>
            </dl>
            {/* T01/T06: công nghệ + phiên bản đã kiểm thử, review chuyên môn và ngày cập nhật thật. */}
            <div style={{ "--i": 5 } as React.CSSProperties} className="mt-6 space-y-3 text-sm">
              {course.technologies.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink-faint">Công nghệ:</span>
                  {course.technologies.map((t) => (
                    <Link key={t.slug} href={`/technologies/${t.slug}`} className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink transition hover:border-brand-200 hover:text-brand-700">
                      {t.name}
                      {t.testedVersion ? <span className="ml-1 text-ink-faint">· đã kiểm thử {t.testedVersion}</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-faint">
                <span>Cập nhật nội dung: {formatDate(course.contentUpdatedAt)}</span>
                {course.contentReview ? (
                  <span className="inline-flex items-center gap-1">
                    <IconCheck size={14} className="text-success-700" /> Review chuyên môn: {course.contentReview.reviewerName} ({formatDate(course.contentReview.reviewedAt)})
                    {course.contentReview.outdated ? <Badge tone="warning">nội dung đã đổi sau lần review</Badge> : null}
                  </span>
                ) : (
                  <Badge tone="warning" title="Nội dung chưa được một người có chuyên môn kiểm tra độc lập">
                    Chưa review chuyên môn
                  </Badge>
                )}
              </p>
            </div>
            {course.status === "archived" ? (
              <Alert tone="warning" className="mt-6">
                Khóa học đã được lưu trữ: không nhận đăng ký mới. Học viên đã đăng ký vẫn tiếp tục học được.
              </Alert>
            ) : null}
          </div>

          {/* ---- Khối đăng ký (sticky trên desktop) ---- */}
          <aside className="lg:row-span-2">
            <Card className="animate-scale-in space-y-5 p-0 sm:p-0 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-t-[var(--radius-lg)]">
                {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="aspect-video w-full object-cover" /> : <CourseCover title={course.title} className="aspect-video w-full" />}
              </div>
              <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                {enrollment?.status === "active" && progress ? (
                  <>
                    <ProgressBar value={progress.percent} label={`Đã học ${progress.completed}/${progress.total} bài bắt buộc`} />
                    {enrollment.completedAt ? (
                      <Badge tone="success">
                        <IconCheck size={14} />
                        {enrollment.completedVersion !== null && enrollment.completedVersion < course.publishedVersion ? "Đã hoàn thành phiên bản trước — có nội dung mới" : "Đã hoàn thành khóa học"}
                      </Badge>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <p className="font-display text-3xl font-extrabold text-ink">Miễn phí</p>
                    <p className="text-sm text-ink-faint">Trong phạm vi demo</p>
                  </div>
                )}
                {enrollment?.status === "revoked" ? (
                  <Alert tone="danger">Quyền truy cập khóa học của bạn đã bị thu hồi{enrollment.revokedReason ? `: ${enrollment.revokedReason}` : "."}</Alert>
                ) : (
                  <div className="hidden lg:block">{cta}</div>
                )}
                {enrollment?.status === "active" && course.hasPlacementQuiz ? (
                  <Link href={`/courses/${course.slug}/placement`} className={buttonClass("soft", "w-full")}>
                    <IconTarget size={18} /> Làm bài đánh giá đầu vào
                  </Link>
                ) : null}
                <div className="flex gap-2">
                  {firstPreview && enrollment?.status !== "active" ? (
                    <Link href={`/learn/${course.slug}/${firstPreview.id}`} className={buttonClass("outline", "flex-1")}>
                      <IconPlay size={16} /> Học thử miễn phí
                    </Link>
                  ) : null}
                  <BookmarkButton type="course" id={course.id} initial={await isBookmarked(viewer, "course", courseId)} signedIn={Boolean(viewer)} nextPath={`/courses/${course.slug}`} />
                </div>
                <ul className="space-y-2 border-t border-line pt-4 text-sm text-ink-soft">
                  {["Lưu vị trí học tự động", "Ghi chú theo bài và thời điểm video", "Quiz chấm ngay, ôn lại câu sai"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <IconCheck size={16} className="text-success-600" /> {t}
                    </li>
                  ))}
                </ul>
                {isOwner || isAdmin ? (
                  <Link href={`/instructor/courses/${course.id}`} className={buttonClass("ghost", "w-full", "sm")}>
                    Mở trình soạn thảo
                  </Link>
                ) : null}
              </div>
            </Card>
          </aside>
        </Container>
      </section>

      <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-14">
          {course.learningObjectives.length ? (
            <Reveal as="section" aria-labelledby="objectives">
              <h2 id="objectives" className="text-h2 mb-5">
                Bạn sẽ học được
              </h2>
              <ul className="grid gap-3 rounded-[var(--radius-lg)] bg-brand-50/70 p-6 sm:grid-cols-2">
                {course.learningObjectives.map((o) => (
                  <li key={o} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                      <IconCheck size={14} />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          <Reveal as="section" aria-labelledby="curriculum">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <h2 id="curriculum" className="text-h2">
                Nội dung khóa học
              </h2>
              <p className="text-sm text-ink-faint">
                {course.chapters.length} chương · {course.lessonCount} bài · {course.requiredLessonCount} bài bắt buộc
              </p>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              {course.chapters.map((ch, i) => (
                <details key={ch.id} open={i === 0} className="smooth group border-b border-line last:border-b-0">
                  <summary className="flex cursor-pointer items-center gap-4 px-5 py-4 transition hover:bg-brand-50/60">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 font-bold text-brand-800">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{ch.title}</span>
                      <span className="text-xs text-ink-faint">
                        {ch.lessons.length} bài · {formatMinutes(ch.lessons.reduce((s, l) => s + l.durationSeconds, 0))}
                      </span>
                    </span>
                    <IconChevronDown size={18} className="chevron shrink-0 text-ink-faint transition-transform duration-200" />
                  </summary>
                  <ul className="pb-2">
                    {ch.lessons.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 pl-[4.25rem] text-sm">
                        <span className="text-ink-faint">{l.type === "video" ? <IconPlay size={14} /> : <IconBook size={15} />}</span>
                        <span className="sr-only">{l.type === "video" ? "Video:" : "Bài đọc:"}</span>
                        <span className="min-w-0 flex-1">
                          {l.isPreview ? (
                            <Link href={`/learn/${course.slug}/${l.id}`} className="font-medium text-brand-700 hover:underline">
                              {l.title}
                            </Link>
                          ) : (
                            <span className="text-ink">{l.title}</span>
                          )}
                          {!l.isRequired ? <span className="ml-2 text-xs text-ink-faint">(tùy chọn)</span> : null}
                        </span>
                        {l.isPreview ? (
                          <Badge tone="success">Học thử</Badge>
                        ) : enrollment?.status !== "active" ? (
                          <IconLock size={14} className="text-ink-faint" aria-label="Cần đăng ký" />
                        ) : null}
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-faint">{formatDuration(l.durationSeconds)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" aria-labelledby="about">
            <h2 id="about" className="text-h2 mb-5">
              Giới thiệu
            </h2>
            <Markdown>{course.description}</Markdown>
          </Reveal>

          <Reveal>
            <CourseReviews courseId={course.id} reviews={reviews} myReview={myReview ? { rating: myReview.rating, comment: myReview.comment } : null} canReview={reviewAllowed} loggedIn={Boolean(viewer)} />
          </Reveal>
        </div>

        <aside className="space-y-6">
          {course.prerequisites.length ? (
            <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
              <h2 className="text-h3 mb-3">Kiến thức đầu vào</h2>
              <ul className="space-y-2 text-sm text-ink-soft">
                {course.prerequisites.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="rounded-[var(--radius-lg)] bg-brand-50/70 p-6">
            <h2 className="text-caption mb-3 text-brand-700">Giảng viên</h2>
            <div className="flex items-center gap-3">
              <Avatar name={course.instructorName} size={48} />
              <p className="font-semibold">{course.instructorName}</p>
            </div>
            {course.instructorBio ? <p className="mt-3 text-sm text-ink-soft">{course.instructorBio}</p> : null}
          </section>
        </aside>
      </Container>

      {/* ---- CTA cố định trên mobile (không che nội dung nhờ pb-24 ở trên) ---- */}
      {cta ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 shadow-lg backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{course.title}</p>
              <p className="text-xs text-ink-faint">{progress ? `Đã học ${progress.percent}%` : "Miễn phí"}</p>
            </div>
            <div className="w-44 shrink-0">{cta}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
