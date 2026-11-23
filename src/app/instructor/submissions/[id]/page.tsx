import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth";
import { getSubmission } from "@/modules/projects/service";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Chấm bài" };

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = parseId(id);
  if (!sid) notFound();
  const viewer = await requireViewer();
  let d;
  try {
    d = await getSubmission(viewer, sid);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const round = d.sub.rounds.at(-1);
  const rubric = d.assignment?.rubric ?? [];
  const waiting = d.sub.status === "submitted" || d.sub.status === "resubmitted";
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/submissions", label: "Bài nộp" }, { label: d.learnerName }]} title={d.assignment?.title ?? "Bài nộp"} description={`${d.learnerName} · ${d.course.published?.title ?? d.course.draft.title}`} />
      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-6">
          {round ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h3">Vòng {round.roundNo}</h2>
                <span className="text-sm text-ink-faint">{formatDateTime(round.submittedAt, viewer.timezone)}</span>
              </div>
              <p className="flex flex-wrap gap-4 text-sm">
                {round.repoUrl ? (
                  <a href={round.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 underline">
                    Mở repo ↗
                  </a>
                ) : null}
                {round.demoUrl ? (
                  <a href={round.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 underline">
                    Mở demo ↗
                  </a>
                ) : null}
              </p>
              <p className="text-xs text-ink-faint">Hệ thống không tự mở/chạy link của học viên. Hãy kiểm tra cẩn thận trước khi truy cập.</p>
              {round.description ? <p className="whitespace-pre-line rounded-[var(--radius-sm)] bg-surface-muted p-3 text-sm">{round.description}</p> : null}
              <div>
                <p className="text-caption mb-2 text-ink-faint">Học viên tự đánh giá</p>
                <ul className="space-y-1 text-sm">
                  {rubric.map((r) => {
                    const s = round.selfAssessment.find((x) => x.criterionId === r.criterionId);
                    return (
                      <li key={r.criterionId} className="flex justify-between gap-3">
                        <span>
                          {r.title}
                          {s?.note ? <span className="block text-xs text-ink-faint">“{s.note}”</span> : null}
                        </span>
                        <span className="tabular-nums">
                          {s?.points ?? "—"}/{r.maxPoints}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          ) : (
            <Alert tone="info">Học viên chưa nộp vòng nào.</Alert>
          )}
          {d.sub.rounds.slice(0, -1).length ? (
            <details className="smooth rounded-[var(--radius-lg)] border border-line bg-surface">
              <summary className="cursor-pointer px-5 py-4 font-semibold">Các vòng trước ({d.sub.rounds.length - 1})</summary>
              <ul className="space-y-3 px-5 pb-5">
                {d.sub.rounds.slice(0, -1).map((r) => (
                  <li key={r.roundNo} className="text-sm">
                    <Badge>Vòng {r.roundNo}</Badge> {r.feedback ? `${r.feedback.totalPoints}/${r.feedback.maxPoints} — ${r.feedback.summary}` : "chưa chấm"}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
        <aside>
          {waiting && round ? (
            <ReviewForm submissionId={id} roundNo={round.roundNo} rubric={rubric} />
          ) : (
            <Alert tone={d.sub.status === "reviewed" ? "success" : "info"}>{d.sub.status === "reviewed" ? "Bài đã được đánh giá đạt." : d.sub.status === "needs_changes" ? "Đang chờ học viên chỉnh sửa." : "Không có gì cần chấm."}</Alert>
          )}
        </aside>
      </div>
    </>
  );
}
