import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { instructorInbox } from "@/modules/discussions/service";
import { formatDateTime } from "@/lib/time";
import { IconChat } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Hỏi đáp" };

export default async function QuestionsInbox() {
  const viewer = await requireViewer();
  const items = await instructorInbox(viewer);
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { label: "Hỏi đáp" }]} title="Câu hỏi chưa có phản hồi của giảng viên" />
      {items.length === 0 ? (
        <EmptyState icon={<IconChat />} title="Không có câu hỏi nào đang chờ" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          {items.map((q) => (
            <li key={q.id}>
              <Link href={q.href} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-brand-50/60">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <IconChat size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{q.title}</span>
                  <span className="text-xs text-ink-faint">
                    {q.courseTitle} · {q.answers} trả lời · {formatDateTime(q.createdAt, viewer.timezone)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brand-700">Trả lời →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
