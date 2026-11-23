import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth";
import { getAssignmentForStudent } from "@/modules/projects/service";
import { Markdown } from "@/components/markdown";
import { IconCheck } from "@/components/icons";
import { Alert, Badge, Container, PageHeader } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE } from "../status";
import { SubmissionForm } from "./submission-form";

export const metadata = { title: "Bài tập dự án" };

export default async function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const id = parseId(assignmentId);
  if (!id) notFound();
  const viewer = await requireViewer();
  let data;
  try {
    data = await getAssignmentForStudent(viewer, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    if (err instanceof AppError)
      return (
        <Container className="py-16">
          <Alert tone="warning">{err.message}</Alert>
        </Container>
      );
    throw err;
  }
  const { assignment: a, submission: s } = data;
  const editable = !s || s.status === "draft" || s.status === "needs_changes";
  const roundsLeft = a.maxRounds - (s?.rounds.length ?? 0);
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader
        breadcrumb={[{ href: `/courses/${data.course.slug}`, label: data.course.title }, { href: `/learn/${data.course.slug}/${data.lessonId}`, label: "Bài học" }, { label: "Dự án" }]}
        title={a.title}
        actions={s ? <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge> : <Badge>Chưa nộp</Badge>}
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-10">
          <section>
            <Markdown>{a.brief}</Markdown>
          </section>
          {a.requirements.length ? (
            <section>
              <h2 className="text-h3 mb-3">Yêu cầu</h2>
              <ul className="space-y-2">
                {a.requirements.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="text-h3 mb-3">Rubric chấm điểm</h2>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line">
              {a.rubric.map((r) => (
                <div key={r.criterionId} className="grid gap-3 border-b border-line bg-surface p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <p className="mt-1 text-sm text-success-700">✓ Đạt: {r.passDescription}</p>
                    <p className="text-sm text-danger-700">✗ Chưa đạt: {r.failDescription}</p>
                  </div>
                  <span className="h-fit rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-800">{r.maxPoints} điểm</span>
                </div>
              ))}
            </div>
          </section>
          {s?.rounds.length ? (
            <section>
              <h2 className="text-h3 mb-3">Lịch sử nộp & phản hồi</h2>
              <ol className="relative space-y-5 border-l-2 border-brand-100 pl-6">
                {[...s.rounds].reverse().map((r) => (
                  <li key={r.roundNo} className="relative">
                    <span className="absolute -left-[2.05rem] top-1 grid size-6 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{r.roundNo}</span>
                    <p className="text-sm text-ink-faint">Nộp lúc {formatDateTime(r.submittedAt, viewer.timezone)}</p>
                    <p className="mt-1 text-sm">
                      {r.repoUrl ? (
                        <a href={r.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline">
                          Repo
                        </a>
                      ) : null}
                      {r.repoUrl && r.demoUrl ? " · " : ""}
                      {r.demoUrl ? (
                        <a href={r.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline">
                          Demo
                        </a>
                      ) : null}
                    </p>
                    {r.feedback ? (
                      <div className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={r.feedback.decision === "accepted" ? "success" : "warning"}>{r.feedback.decision === "accepted" ? "Đạt" : "Cần chỉnh sửa"}</Badge>
                          <span className="font-bold tabular-nums">
                            {r.feedback.totalPoints}/{r.feedback.maxPoints} điểm
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{r.feedback.summary}</p>
                        <ul className="mt-3 space-y-1 text-sm">
                          {r.feedback.scores.map((sc) => (
                            <li key={sc.criterionId} className="flex justify-between gap-3">
                              <span>
                                {a.rubric.find((x) => x.criterionId === sc.criterionId)?.title}
                                {sc.comment ? <span className="block text-xs text-ink-faint">{sc.comment}</span> : null}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums">{sc.points}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-ink-faint">Đang chờ giảng viên chấm.</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <aside className="space-y-6">
          {a.checklist.length ? (
            <section className="rounded-[var(--radius-lg)] bg-brand-50/70 p-5">
              <h2 className="text-caption mb-3 text-brand-800">Checklist trước khi nộp</h2>
              <ul className="space-y-2 text-sm">
                {a.checklist.map((c) => (
                  <li key={c} className="flex gap-2">
                    <IconCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="lg:sticky lg:top-24">
            {editable ? (
              <SubmissionForm assignmentId={assignmentId} rubric={a.rubric} initial={s?.draftFields ?? null} roundsLeft={roundsLeft} hasDraft={Boolean(s)} needsChanges={s?.status === "needs_changes"} verified={viewer.emailVerified} />
            ) : (
              <Alert tone={s?.status === "reviewed" ? "success" : "info"} title={STATUS_LABEL[s!.status]}>
                {s?.status === "reviewed" ? (
                  <>
                    Bạn có thể hiển thị dự án này trên{" "}
                    <Link href="/achievements" className="underline">
                      hồ sơ thành quả
                    </Link>
                    .
                  </>
                ) : (
                  "Bạn sẽ thấy phản hồi tại đây khi giảng viên chấm xong."
                )}
              </Alert>
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}
