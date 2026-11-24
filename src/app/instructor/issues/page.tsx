import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { ISSUE_KINDS, listIssues } from "@/modules/content-issues/service";
import { formatDateTime } from "@/lib/time";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { IconFlag } from "@/components/icons";
import { IssueActions } from "./issue-actions";

export const metadata = { title: "Báo lỗi nội dung" };
const FILTERS = [
  ["open", "Đang mở"],
  ["resolved", "Đã sửa"],
  ["wont_fix", "Không sửa"],
  ["all", "Tất cả"],
] as const;

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const status = (FILTERS.find(([k]) => k === sp.status)?.[0] ?? "open") as (typeof FILTERS)[number][0];
  const items = await listIssues(viewer, { status });
  return (
    <>
      <PageHeader title="Báo lỗi nội dung" description="Người học báo code sai, nội dung lỗi thời hoặc khó hiểu. Sửa bài trong trình soạn thảo, gửi duyệt, rồi đánh dấu “Đã sửa” kèm ghi chú — người báo thấy ghi chú này trên trang bài học." />
      <nav aria-label="Lọc trạng thái" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/instructor/issues?status=${k}`} aria-current={status === k ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${status === k ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-ink-soft hover:border-brand-300"}`}>
            {label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState icon={<IconFlag />} title="Không có báo lỗi nào">
          {status === "open" ? "Tuyệt — chưa có báo lỗi đang chờ xử lý." : "Không có mục nào ở trạng thái này."}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={i.status === "open" ? "warning" : i.status === "resolved" ? "success" : "neutral"}>{i.status === "open" ? "Đang mở" : i.status === "resolved" ? "Đã sửa" : "Không sửa"}</Badge>
                <Badge tone="brand">{ISSUE_KINDS[i.kind]}</Badge>
                <span className="text-ink-faint">
                  {i.reporterName} · {formatDateTime(i.createdAt, viewer.timezone)}
                </span>
                {i.reportedOnVersion < i.currentVersion ? <Badge tone="info">Báo trên bản cũ (v{i.reportedOnVersion}, hiện v{i.currentVersion})</Badge> : null}
              </div>
              <p className="mt-2 font-semibold text-ink">
                {i.courseTitle} › {i.lessonTitle}
                {i.location ? <span className="font-normal text-ink-soft"> · {i.location}</span> : null}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink">{i.message}</p>
              {i.environment ? <p className="mt-1 text-xs text-ink-faint">Môi trường: {i.environment}</p> : null}
              {i.resolution ? <p className="mt-2 rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2 text-sm text-ink-soft">Ghi chú xử lý: {i.resolution}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href={i.href} className="font-semibold text-brand-700 hover:underline">
                  Xem bài
                </Link>
                <Link href={i.editHref} className="font-semibold text-brand-700 hover:underline">
                  Sửa bài
                </Link>
                <IssueActions id={i.id} status={i.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
