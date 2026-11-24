import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { formatDuration } from "@/lib/text";
import { getViewer } from "@/server/auth";
import { BookmarkButton } from "@/components/bookmark-button";
import { isBookmarked } from "@/modules/bookmarks/service";
import { getLearnPageData } from "@/modules/learning/queries";
import { playbackSource } from "@/modules/media/delivery";
import { lessonNotes } from "@/modules/notes/service";
import { listQuestions } from "@/modules/discussions/service";
import { LessonMarkdown, extractToc } from "@/components/lesson-markdown";
import { Tabs } from "@/components/overlays";
import { IconArrowLeft, IconArrowRight, IconBook, IconChat, IconClock, IconNote, IconRubric, IconTarget } from "@/components/icons";
import { Alert, Badge, Container, ProgressBar, buttonClass } from "@/components/ui";
import { PlayerProvider } from "./player-context";
import { VideoPlayer } from "./video-player";
import { NotesPanel } from "./notes-panel";
import { LessonActions } from "./lesson-actions";
import { QaSection } from "./qa";
import { LearnShell } from "./learn-shell";
import { ReportIssue } from "./report-issue";
import { ISSUE_KINDS, myIssuesForLesson } from "@/modules/content-issues/service";

export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export default async function LearnPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const id = parseId(lessonId);
  if (!id) notFound();
  const viewer = await getViewer();
  let data;
  try {
    data = await getLearnPageData(viewer, slug, id);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "UNAUTHENTICATED") redirect(`/login?callbackUrl=${encodeURIComponent(`/learn/${slug}/${lessonId}`)}`);
      if (err.code === "NOT_FOUND") notFound();
      return (
        <Container className="py-16">
          <Alert
            tone="warning"
            title="Không thể mở bài học"
            action={
              <Link href={`/courses/${slug}`} className={buttonClass("soft", undefined, "sm")}>
                Về trang khóa học
              </Link>
            }
          >
            {err.message}
          </Alert>
        </Container>
      );
    }
    throw err;
  }

  const { lesson, course } = data;
  const toc = extractToc(lesson.content);
  const canTrack = Boolean(viewer && data.isEnrolled);
  const isVideo = lesson.type === "video";
  // Chỉ cấp URL video ngay khi render nếu KHÔNG bật tiết kiệm dữ liệu; vẫn preload="none".
  let initialSrc: string | null = null;
  let initialError: string | null = null;
  if (isVideo && data.media?.status === "ready" && !viewer?.dataSaver) {
    try {
      initialSrc = (await playbackSource(viewer, id)).url;
    } catch (err) {
      initialError = err instanceof AppError ? err.message : "Không tải được video.";
    }
  }
  const [notes, qa] = await Promise.all([
    viewer && canTrack ? lessonNotes(viewer, id) : Promise.resolve([]),
    viewer ? listQuestions(viewer, id).catch(() => null) : Promise.resolve(null),
  ]);

  const topBar = (
    <div className="flex items-center gap-4">
      <Link href={`/courses/${course.slug}`} className="min-w-0 truncate text-sm font-semibold text-ink hover:text-brand-700">
        {course.title}
      </Link>
      {canTrack ? (
        <div className="ml-auto hidden w-56 sm:block">
          <ProgressBar size="sm" value={data.courseProgress.percent} label={`${data.courseProgress.completed}/${data.courseProgress.total} bài`} />
        </div>
      ) : null}
    </div>
  );

  return (
    <PlayerProvider>
      <LearnShell outline={data.outline} slug={course.slug} topBar={topBar}>
        <article className="mx-auto max-w-3xl space-y-8">
          {data.isPreviewOnly ? (
            <Alert
              tone="brand"
              title="Bạn đang học thử"
              action={
                <Link href={`/courses/${course.slug}`} className={buttonClass("primary", undefined, "sm")}>
                  Đăng ký
                </Link>
              }
            >
              Đăng ký khóa học để học toàn bộ, lưu tiến độ và ghi chú.
            </Alert>
          ) : null}
          {course.status === "archived" ? <Alert tone="warning">Khóa học đã được lưu trữ. Bạn vẫn học tiếp được.</Alert> : null}

          <header className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <Badge tone="brand">{isVideo ? "Video" : "Bài đọc"}</Badge>
              <span className="inline-flex items-center gap-1">
                <IconClock size={15} /> {formatDuration(lesson.durationSeconds)}
              </span>
              {!lesson.isRequired ? <Badge>Tùy chọn</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-h1 min-w-0 flex-1">{lesson.title}</h1>
              <BookmarkButton compact type="lesson" id={lesson.id} initial={await isBookmarked(viewer, "lesson", id)} signedIn={Boolean(viewer)} nextPath={`/learn/${course.slug}/${lesson.id}`} />
            </div>
          </header>

          {lesson.objectives.length ? (
            <div className="rounded-[var(--radius-lg)] border-l-4 border-brand-300 bg-brand-50/70 px-5 py-4">
              <p className="text-caption mb-2 text-brand-800">Mục tiêu bài học</p>
              <ul className="space-y-1.5">
                {lesson.objectives.map((o) => (
                  <li key={o} className="flex gap-2 text-ink">
                    <IconTarget size={16} className="mt-1 shrink-0 text-brand-600" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isVideo && data.media ? (
            <VideoPlayer
              lessonId={lesson.id}
              media={data.media}
              initialSrc={initialSrc}
              initialError={initialError}
              resumeAt={data.progress?.lastPositionSeconds ?? 0}
              canTrack={canTrack}
              dataSaver={Boolean(viewer?.dataSaver)}
              transcriptAvailable={Boolean(lesson.transcript)}
            />
          ) : isVideo ? (
            <Alert tone="warning">Bài video chưa có video.</Alert>
          ) : null}

          {lesson.content.trim() ? (
            <div className="text-[1.0625rem] leading-[1.8]">
              {toc.length >= 3 ? (
                <nav aria-label="Mục lục bài" className="mb-6 rounded-[var(--radius-md)] border border-line bg-surface-muted px-5 py-4 text-sm">
                  <p className="mb-2 font-semibold text-ink">Trong bài này</p>
                  <ol className="space-y-1">
                    {toc.map((t) => (
                      <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                        <a href={`#${t.id}`} className="text-ink-soft hover:text-brand-700">
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              <LessonMarkdown>{lesson.content}</LessonMarkdown>
            </div>
          ) : null}

          {lesson.transcript ? (
            <details className="smooth group rounded-[var(--radius-lg)] border border-line bg-surface">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-semibold">
                Transcript / phụ đề dạng văn bản <span className="chevron text-ink-faint transition-transform">▾</span>
              </summary>
              <div className="whitespace-pre-line px-5 pb-5 text-sm leading-relaxed text-ink-soft">{lesson.transcript}</div>
            </details>
          ) : null}

          {viewer ? <ReportIssue lessonId={lesson.id} kinds={ISSUE_KINDS} headings={toc.filter((x) => x.level === 2).map((x) => x.text)} mine={await myIssuesForLesson(viewer, id)} /> : null}

          {data.quiz || (data.assignment && canTrack) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.quiz ? (
                <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                    <IconBook size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{data.quiz.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {data.quiz.questionCount} câu · đạt từ {data.quiz.passPercent}%
                      {data.quiz.best !== null ? ` · cao nhất ${data.quiz.best}%` : ""}
                    </p>
                  </div>
                  {canTrack ? (
                    <Link href={`/quiz/${data.quiz.id}`} className={buttonClass(data.quiz.best !== null ? "outline" : "primary", "mt-auto self-start", "sm")}>
                      {data.quiz.best !== null ? "Làm lại quiz" : "Làm quiz"}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {data.assignment && canTrack ? (
                <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                    <IconRubric size={20} />
                  </span>
                  <p className="font-semibold">{data.assignment.title}</p>
                  <Link href={`/projects/${data.assignment.id}`} className={buttonClass("outline", "mt-auto self-start", "sm")}>
                    Mở bài tập dự án
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {canTrack ? <LessonActions lessonId={lesson.id} completed={Boolean(data.progress?.completedAt)} isVideo={isVideo} understanding={data.progress?.understanding ?? null} nextHref={data.nextId ? `/learn/${course.slug}/${data.nextId}` : null} /> : null}

          <nav aria-label="Chuyển bài" className="flex justify-between gap-3 border-t border-line pt-6">
            {data.prevId ? (
              <Link href={`/learn/${course.slug}/${data.prevId}`} className={buttonClass("ghost")}>
                <IconArrowLeft size={16} /> Bài trước
              </Link>
            ) : (
              <span />
            )}
            {data.nextId ? (
              <Link href={`/learn/${course.slug}/${data.nextId}`} className={buttonClass("primary")}>
                Bài tiếp theo <IconArrowRight size={16} />
              </Link>
            ) : null}
          </nav>

          {viewer && (canTrack || qa) ? (
            <section aria-label="Ghi chú và hỏi đáp" className="rounded-[var(--radius-xl)] border border-line bg-surface p-4 shadow-sm sm:p-6">
              <Tabs
                initial={canTrack ? "notes" : "qa"}
                tabs={[
                  ...(canTrack ? [{
                    id: "notes",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <IconNote size={16} /> Ghi chú ({notes.length})
                      </span>
                    ),
                    content: <NotesPanel lessonId={lesson.id} isVideo={isVideo} initial={notes} />,
                  }] : []),
                  {
                    id: "qa",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <IconChat size={16} /> Hỏi đáp ({qa?.total ?? 0})
                      </span>
                    ),
                    content: qa ? <QaSection lessonId={lesson.id} data={qa} verified={viewer.emailVerified} /> : <p className="text-sm text-ink-faint">Hỏi đáp chưa khả dụng.</p>,
                  },
                ]}
              />
            </section>
          ) : null}
        </article>
      </LearnShell>
    </PlayerProvider>
  );
}
