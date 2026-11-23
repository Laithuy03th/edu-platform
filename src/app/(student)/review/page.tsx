import Link from "next/link";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { dueReviews, reviewCounts } from "@/modules/review/service";
import { IconRepeat } from "@/components/icons";
import { Container, EmptyState, PageHeader, Stat, buttonClass, cn } from "@/components/ui";
import { ReviewSession } from "./review-session";

export const metadata = { title: "Ôn tập hôm nay" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ course?: string; topic?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const courseId = parseId(sp.course);
  const topic = typeof sp.topic === "string" && /^[a-z0-9-]{1,40}$/.test(sp.topic) ? sp.topic : undefined;
  const [counts, items] = await Promise.all([reviewCounts(viewer), dueReviews(viewer, { courseId: courseId ?? undefined, topicKey: topic, limit: 20 })]);
  const chip = (active: boolean) => cn("inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition", active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:bg-brand-50");
  return (
    <div className="bg-grain-warm">
      <Container className="py-10 sm:py-12">
        <PageHeader eyebrow="Ôn tập" title="Hôm nay cần ôn" description="Lịch ôn theo quy tắc cố định 1 → 3 → 7 → 14 ngày: đúng thì giãn ra, sai thì quay về 1 ngày. Không phải thuật toán AI." />
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Đến hạn hôm nay" value={counts.due} icon={<IconRepeat size={18} />} />
          <Stat label="Đang trong lịch ôn" value={counts.active} />
          <Stat label="Đã thuộc (qua mốc 14 ngày)" value={counts.mastered} />
        </div>
        {counts.byCourse.length > 1 || counts.topics.length ? (
          <div className="mb-6 flex flex-wrap gap-2" aria-label="Bộ lọc">
            <Link href="/review" className={chip(!courseId && !topic)}>
              Tất cả
            </Link>
            {counts.byCourse.map((c) => (
              <Link key={c.courseId} href={`/review?course=${c.courseId}`} className={chip(courseId?.toHexString() === c.courseId)}>
                {c.title} ({c.n})
              </Link>
            ))}
            {counts.topics.map((t) => (
              <Link key={t} href={`/review?topic=${t}`} className={chip(topic === t)}>
                #{t}
              </Link>
            ))}
          </div>
        ) : null}
        {items.length === 0 ? (
          <EmptyState icon={<IconRepeat />} title="Không có câu nào đến hạn" action={<Link href="/dashboard" className={buttonClass("outline")}>Về tổng quan</Link>}>
            Câu trả lời sai trong quiz sẽ tự xuất hiện ở đây vào ngày cần ôn.
          </EmptyState>
        ) : (
          <ReviewSession items={items} />
        )}
      </Container>
    </div>
  );
}
