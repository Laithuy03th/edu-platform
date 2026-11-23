import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { myCourses } from "@/modules/enrollments/service";
import { needsReviewLessons } from "@/modules/learning/progress";
import { weeklyCompleted } from "@/modules/learning/queries";
import { reviewCounts } from "@/modules/review/service";
import { myPaths } from "@/modules/learning-paths/service";
import { getProfile } from "@/modules/users/service";
import { CourseCover } from "@/components/course-card";
import { Reveal } from "@/components/motion";
import { IconArrowRight, IconBook, IconPlay, IconRepeat, IconRoute, IconTarget } from "@/components/icons";
import { Badge, Container, EmptyState, ProgressBar, ProgressRing, buttonClass } from "@/components/ui";

export const metadata = { title: "Tổng quan" };

const WEEKLY_GOAL = 5;

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date()));
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const [courses, review, needs, weekly, paths, profile] = await Promise.all([
    myCourses(viewer),
    reviewCounts(viewer),
    needsReviewLessons(viewer.id, 6),
    weeklyCompleted(viewer.id, viewer.timezone),
    myPaths(viewer),
    getProfile(viewer.id),
  ]);
  const active = courses.filter((c) => c.enrollmentStatus === "active" && c.status !== "suspended");
  const current = active.find((c) => c.progress.percent < 100) ?? active[0];
  const firstName = viewer.displayName.trim().split(/\s+/).at(-1);

  return (
    <div className="bg-grain-warm">
      <Container className="py-10 sm:py-12">
        <div className="mb-8 animate-fade-up">
          <p className="text-caption text-brand-700">{greeting(viewer.timezone)}</p>
          <h1 className="text-h1 mt-1">{firstName}, hôm nay học gì nào?</h1>
          {profile.learningGoal ? (
            <p className="mt-2 inline-flex items-center gap-2 text-ink-soft">
              <IconTarget size={16} className="text-brand-600" /> Mục tiêu: {profile.learningGoal}
            </p>
          ) : (
            <Link href="/settings/profile" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
              + Đặt mục tiêu học tập
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Hành động ưu tiên cao nhất */}
          {current ? (
            <section aria-label="Tiếp tục học" className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-6 text-white shadow-lg sm:p-8">
              <div className="bg-dots absolute inset-0 opacity-20" aria-hidden />
              <div className="absolute -right-16 -top-16 size-64 rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-caption text-brand-200">Tiếp tục học</p>
                  <h2 className="text-h2 mt-2">{current.title}</h2>
                  {current.lastLessonTitle ? <p className="mt-1 text-white/80">Bài gần nhất: {current.lastLessonTitle}</p> : null}
                  <div className="mt-5 max-w-sm">
                    <div className="mb-1.5 flex justify-between text-xs text-white/80">
                      <span>
                        {current.progress.completed}/{current.progress.total} bài bắt buộc
                      </span>
                      <span className="font-semibold text-white">{current.progress.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={current.progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ khóa">
                      <div className="h-full rounded-full bg-white transition-[width] duration-1000" style={{ width: `${current.progress.percent}%` }} />
                    </div>
                  </div>
                </div>
                <Link
                  href={`/learn/${current.slug}/${current.lastLessonId ?? current.progress.nextLessonId}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-brand-800 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <IconPlay size={16} /> Học tiếp
                </Link>
              </div>
            </section>
          ) : (
            <EmptyState
              icon={<IconBook />}
              title="Bạn chưa đăng ký khóa học nào"
              action={
                <Link href="/courses" className={buttonClass("primary")}>
                  Khám phá khóa học
                </Link>
              }
            >
              Học thử vài bài miễn phí rồi chọn khóa phù hợp với mục tiêu.
            </EmptyState>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/review" className="group flex items-center gap-4 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-transform group-hover:-rotate-6">
                <IconRepeat size={26} />
              </span>
              <div className="flex-1">
                <p className="text-sm text-ink-soft">Cần ôn hôm nay</p>
                <p className="font-display text-3xl font-extrabold">
                  {review.due} <span className="text-base font-semibold text-ink-faint">câu</span>
                </p>
              </div>
              <IconArrowRight className="text-brand-600 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-sm">
              <ProgressRing value={Math.min(100, (weekly / WEEKLY_GOAL) * 100)} label="Mục tiêu tuần" />
              <div>
                <p className="text-sm text-ink-soft">Mục tiêu tuần này</p>
                <p className="font-semibold">
                  {weekly}/{WEEKLY_GOAL} bài hoàn thành
                </p>
                <p className="text-xs text-ink-faint">{weekly >= WEEKLY_GOAL ? "Đã đạt — tuyệt vời!" : `Còn ${WEEKLY_GOAL - weekly} bài nữa.`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="my-courses-h">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="my-courses-h" className="text-h2">
                Khóa đang học
              </h2>
              <Link href="/my-courses" className="text-sm font-semibold text-brand-700 hover:underline">
                Tất cả →
              </Link>
            </div>
            {active.length ? (
              <Reveal group className="space-y-3">
                {active.slice(0, 4).map((c) => (
                  <Link key={c.courseId} href={`/learn/${c.slug}/${c.lastLessonId ?? c.progress.nextLessonId}`} className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3 pr-5 transition hover:border-brand-200 hover:shadow-sm">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                      {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <CourseCover title={c.title} className="h-full w-full [&>div:last-child]:hidden" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold group-hover:text-brand-800">{c.title}</p>
                      <div className="mt-2">
                        <ProgressBar size="sm" value={c.progress.percent} label={`${c.progress.completed}/${c.progress.total} bài`} />
                      </div>
                    </div>
                    {c.completedAt ? <Badge tone="success">Hoàn thành</Badge> : null}
                  </Link>
                ))}
              </Reveal>
            ) : (
              <p className="text-sm text-ink-faint">Chưa có khóa học.</p>
            )}
          </section>

          <div className="space-y-10">
            <section aria-labelledby="needs-h">
              <h2 id="needs-h" className="text-h3 mb-3">
                Bài bạn đánh dấu cần ôn
              </h2>
              {needs.length ? (
                <ul className="space-y-2">
                  {needs.map((n) => (
                    <li key={n.lessonId}>
                      <Link href={`/learn/${n.courseSlug}/${n.lessonId}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-50">
                        <span className={`size-2 rounded-full ${n.understanding === "not_understood" ? "bg-danger-700" : "bg-warning-700"}`} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm">{n.title}</span>
                        <Badge tone={n.understanding === "not_understood" ? "danger" : "warning"}>{n.understanding === "not_understood" ? "Chưa hiểu" : "Cần ôn"}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">Chưa có bài nào. Sau mỗi bài, hãy tự đánh giá mức độ hiểu.</p>
              )}
            </section>
            <section aria-labelledby="paths-h">
              <h2 id="paths-h" className="text-h3 mb-3">
                Lộ trình đang theo
              </h2>
              {paths.length ? (
                <ul className="space-y-3">
                  {paths.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/paths/${p.slug}`} className="block rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-brand-200">
                        <p className="mb-2 flex items-center gap-2 font-semibold">
                          <IconRoute size={16} className="text-brand-600" /> {p.title}
                        </p>
                        <ProgressBar size="sm" value={p.progress.percent} label={`${p.progress.completed}/${p.progress.total} bài`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link href="/paths" className="text-sm font-semibold text-brand-700 hover:underline">
                  Chọn một lộ trình theo mục tiêu →
                </Link>
              )}
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
