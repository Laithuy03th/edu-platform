import Link from "next/link";
import { parseId } from "@/lib/ids";
import { formatDateTime } from "@/lib/time";
import { formatDuration } from "@/lib/text";
import { requireViewer } from "@/server/auth";
import { NOTES_PAGE_SIZE, myNoteCourses, searchNotes } from "@/modules/notes/service";
import { Markdown } from "@/components/markdown";
import { IconNote, IconPlay, IconSearch } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader, Pagination, Select, buttonClass } from "@/components/ui";

export const metadata = { title: "Ghi chú của tôi" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ q?: string; course?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const courseId = parseId(sp.course);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1), 100);
  const [result, courses] = await Promise.all([searchNotes(viewer, { courseId, q, page }), myNoteCourses(viewer)]);
  const pages = Math.ceil(result.total / NOTES_PAGE_SIZE);
  const href = (p: number) => `/notes?${new URLSearchParams({ ...(q ? { q } : {}), ...(courseId ? { course: courseId.toHexString() } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader
        title="Ghi chú của tôi"
        description="Riêng tư — chỉ bạn thấy. Tìm kiếm không phân biệt dấu."
        actions={
          <a href={`/api/notes/export${courseId ? `?courseId=${courseId.toHexString()}` : ""}`} className={buttonClass("outline")}>
            Xuất Markdown
          </a>
        }
      />
      <form className="mb-8 grid gap-3 sm:grid-cols-[1fr_260px_auto]" role="search">
        <div className="relative">
          <IconSearch size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <label htmlFor="nq" className="sr-only">
            Tìm trong ghi chú
          </label>
          <input id="nq" name="q" defaultValue={q} placeholder="Tìm trong ghi chú…" maxLength={100} className="h-11 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        </div>
        <label htmlFor="nc" className="sr-only">
          Khóa học
        </label>
        <Select id="nc" name="course" defaultValue={courseId?.toHexString() ?? ""} className="rounded-full">
          <option value="">Mọi khóa học</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass("primary")}>
          Lọc
        </button>
      </form>
      {result.items.length === 0 ? (
        <EmptyState icon={<IconNote />} title={q ? "Không tìm thấy ghi chú phù hợp" : "Chưa có ghi chú"}>
          Trong trang học, mở tab “Ghi chú” để ghi lại điều quan trọng — với video, ghi đúng giây đang xem.
        </EmptyState>
      ) : (
        <ul className="columns-1 gap-5 md:columns-2 [&>li]:mb-5 [&>li]:break-inside-avoid">
          {result.items.map((n) => (
            <li key={n.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                <span className="font-semibold text-brand-700">{n.courseTitle}</span>
                <span aria-hidden>·</span>
                <span className="truncate">{n.lessonTitle}</span>
                {!n.available ? <Badge tone="warning">Không còn học được</Badge> : null}
              </div>
              <Markdown className="prose prose-sm max-w-none">{n.content}</Markdown>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
                <span>{formatDateTime(n.updatedAt, viewer.timezone)}</span>
                {n.available ? (
                  <Link href={`/learn/${n.courseSlug}/${n.lessonId}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800 hover:bg-brand-100">
                    {n.timestampSeconds !== null ? (
                      <>
                        <IconPlay size={10} /> {formatDuration(n.timestampSeconds)}
                      </>
                    ) : (
                      "Mở bài"
                    )}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={pages} href={href} />
    </Container>
  );
}
