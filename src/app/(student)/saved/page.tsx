import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { listBookmarks } from "@/modules/bookmarks/service";
import { formatDateTime } from "@/lib/time";
import { BookmarkButton } from "@/components/bookmark-button";
import { IconBook, IconBookmark, IconPlay } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader, buttonClass } from "@/components/ui";

export const metadata = { title: "Đánh dấu của tôi" };

export default async function SavedPage() {
  const viewer = await requireViewer();
  const items = await listBookmarks(viewer);
  const courses = items.filter((i) => i.type === "course");
  const lessons = items.filter((i) => i.type === "lesson");
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title="Đánh dấu của tôi" description="Khóa học và bài học bạn đánh dấu để quay lại. Riêng tư — chỉ bạn thấy." />
      {items.length === 0 ? (
        <EmptyState
          icon={<IconBookmark />}
          title="Chưa lưu mục nào"
          action={
            <Link href="/courses" className={buttonClass("primary")}>
              Khám phá khóa học
            </Link>
          }
        >
          Bấm “Lưu” ở trang khóa học hoặc bài học để thêm vào đây.
        </EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          {[
            { title: "Bài học", icon: <IconPlay size={16} />, rows: lessons },
            { title: "Khóa học", icon: <IconBook size={16} />, rows: courses },
          ].map((g) => (
            <section key={g.title} aria-labelledby={`saved-${g.title}`}>
              <h2 id={`saved-${g.title}`} className="text-h3 mb-4 flex items-center gap-2">
                {g.title} <Badge>{g.rows.length}</Badge>
              </h2>
              {g.rows.length === 0 ? (
                <p className="text-sm text-ink-faint">Chưa có.</p>
              ) : (
                <ul className="space-y-3">
                  {g.rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-xs">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">{g.icon}</span>
                      <div className="min-w-0 flex-1">
                        {r.available ? (
                          <Link href={r.href} className="font-semibold text-ink hover:text-brand-700">
                            {r.title}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink-faint">{r.title}</span>
                        )}
                        <p className="truncate text-xs text-ink-faint">
                          {r.type === "lesson" ? `${r.courseTitle} · ` : ""}Lưu {formatDateTime(r.savedAt, viewer.timezone)}
                          {r.available ? "" : " · không còn khả dụng"}
                        </p>
                      </div>
                      <BookmarkButton compact type={r.type} id={r.id} initial signedIn nextPath="/saved" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
