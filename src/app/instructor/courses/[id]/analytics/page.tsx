import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth";
import { parseId } from "@/lib/ids";
import { formatDate } from "@/lib/time";
import { getCourseAnalytics, MIN_GROUP } from "@/modules/courses/analytics";
import { IconChart, IconFlag } from "@/components/icons";
import { Card, EmptyState, PageHeader, Stat, buttonClass } from "@/components/ui";

export const metadata = { title: "Phân tích khóa học" };

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Một hàng thanh ngang: nhãn trái, giá trị (chữ màu mực — không dùng màu thanh) phải; title = chú thích khi rê chuột. */
function BarRow({ label, sub, value, max, display, note }: { label: string; sub?: string; value: number; max: number; display: string; note?: string }) {
  const w = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <li title={note ?? `${label}: ${display}`} className="grid grid-cols-[minmax(0,1fr)_minmax(90px,38%)_4.5rem] items-center gap-3 py-1.5 text-sm">
      <span className="min-w-0">
        <span className="block truncate text-ink">{label}</span>
        {sub ? <span className="block truncate text-xs text-ink-faint">{sub}</span> : null}
      </span>
      <span className="dv-track block h-2.5" aria-hidden>
        <span className="dv-bar block h-full" style={{ width: `${w}%` }} />
      </span>
      <span className="text-right tabular-nums text-ink-soft">{display}</span>
    </li>
  );
}

/**
 * Phân tích khóa học — chỉ số liệu tổng hợp (không danh sách học viên, không điểm từng người).
 * Nhóm < MIN_GROUP học viên thì ẩn điểm/tỉ lệ đúng để không suy ra kết quả của một người.
 */
export default async function CourseAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = parseId(id);
  if (!courseId) notFound();
  const viewer = await requireViewer();
  const { title, slug, status, data: a } = await getCourseAnalytics(viewer, courseId);
  const required = a.lessons.filter((l) => l.isRequired);
  // Điểm rơi lớn nhất giữa hai bài bắt buộc liên tiếp (nơi học viên bỏ dở nhiều nhất)
  let drop: { index: number; amount: number } | null = null;
  for (let i = 1; i < required.length; i++) {
    const amount = required[i - 1]!.completed - required[i]!.completed;
    if (amount > 0 && (!drop || amount > drop.amount)) drop = { index: i, amount };
  }
  const dropLesson = drop ? required[drop.index]! : null;
  const ratingTotal = a.ratings.reduce((s, r) => s + r.count, 0);
  const ratingMax = Math.max(0, ...a.ratings.map((r) => r.count));

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { href: "/instructor/courses", label: "Khóa học" }, { href: `/instructor/courses/${id}`, label: title }, { label: "Phân tích" }]}
        title="Phân tích khóa học"
        description={`Số liệu tổng hợp, tính lại mỗi 10 phút (lần gần nhất: ${formatDate(a.generatedAt, viewer.timezone)}). Không hiển thị dữ liệu của từng học viên.`}
        actions={
          status === "published" ? (
            <Link href={`/courses/${slug}`} className={buttonClass("outline", undefined, "sm")}>
              Xem trang công khai
            </Link>
          ) : undefined
        }
      />
      {a.enrolled === 0 ? (
        <EmptyState icon={<IconChart />} title="Chưa có học viên đăng ký">
          Số liệu sẽ xuất hiện khi khóa học được xuất bản và có người học.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Phễu học tập: 4 ô số (không cần biểu đồ cho 4 con số) */}
          <section aria-label="Phễu học tập" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Đang đăng ký" value={a.enrolled} hint={`${a.active7d} hoạt động 7 ngày · ${a.active30d} trong 30 ngày`} />
            <Stat label="Đã bắt đầu học" value={`${pct(a.started, a.enrolled)}%`} hint={`${a.started} người hoàn thành ≥ 1 bài`} />
            <Stat label="Qua nửa chặng" value={`${pct(a.halfway, a.enrolled)}%`} hint={`${a.halfway} người xong ≥ ${Math.ceil(a.requiredLessons / 2)}/${a.requiredLessons} bài bắt buộc`} />
            <Stat label="Hoàn thành khóa" value={`${pct(a.completed, a.enrolled)}%`} hint={`${a.completed} người`} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <h2 className="text-lg font-semibold">Tỉ lệ hoàn thành từng bài</h2>
              <p className="mt-1 text-sm text-ink-soft">% học viên đang đăng ký đã hoàn thành bài, theo thứ tự trong khóa.</p>
              {dropLesson && drop ? (
                <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">
                  <IconFlag size={16} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>Điểm rơi lớn nhất:</strong> {drop.amount} người dừng trước bài “{dropLesson.title}”. Cân nhắc chia nhỏ bài, thêm ví dụ hoặc bài tập ở đoạn này.
                  </span>
                </p>
              ) : null}
              <ol className="mt-3 divide-y divide-line/60">
                {a.lessons.map((l) => (
                  <BarRow
                    key={l.id}
                    label={`${l.title}${l.isRequired ? "" : " (tự chọn)"}`}
                    sub={`${l.chapter} · ${l.type === "video" ? "Video" : "Bài đọc"}`}
                    value={l.completed}
                    max={a.enrolled}
                    display={`${pct(l.completed, a.enrolled)}%`}
                    note={`${l.title}: ${l.completed}/${a.enrolled} học viên đã hoàn thành (${pct(l.completed, a.enrolled)}%)`}
                  />
                ))}
              </ol>
            </Card>

            <div className="space-y-6">
              <Card>
                <h2 className="text-lg font-semibold">Quiz</h2>
                {a.quizzes.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-faint">Khóa chưa có quiz trong bài.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm">
                    {a.quizzes.map((q) => (
                      <li key={q.id} className="rounded-[var(--radius-sm)] border border-line p-3">
                        <p className="font-semibold text-ink">{q.title}</p>
                        <p className="mt-1 text-ink-soft">
                          {q.learners} người làm · {q.attempts} lượt
                          {q.avgBest !== null ? ` · điểm cao nhất trung bình ${q.avgBest}% · ${q.passRate}% đạt` : q.learners ? ` · cần ≥ ${MIN_GROUP} người để hiện điểm` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {a.hardestQuestions.length ? (
                  <>
                    <h3 className="mt-5 text-sm font-semibold">Câu khó nhất (lần làm gần nhất của mỗi người)</h3>
                    <ol className="mt-2 divide-y divide-line/60">
                      {a.hardestQuestions.map((x, i) => (
                        <BarRow key={i} label={x.prompt} sub={x.quizTitle} value={x.correctRate} max={100} display={`${x.correctRate}% đúng`} note={`${x.prompt} — ${x.correctRate}% trả lời đúng (${x.answered} người)`} />
                      ))}
                    </ol>
                    <p className="mt-2 text-xs text-ink-faint">Câu đúng dưới 50%: xem lại đề, các đáp án nhiễu hoặc phần giải thích trong bài.</p>
                  </>
                ) : null}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold">Đánh giá</h2>
                {ratingTotal === 0 ? (
                  <p className="mt-2 text-sm text-ink-faint">Chưa có đánh giá.</p>
                ) : (
                  <ol className="mt-2">
                    {a.ratings.map((r) => (
                      <BarRow key={r.star} label={`${r.star} sao`} value={r.count} max={ratingMax} display={`${r.count}`} note={`${r.star} sao: ${r.count} đánh giá`} />
                    ))}
                  </ol>
                )}
              </Card>

              <Card className="space-y-2 text-sm">
                <h2 className="text-lg font-semibold">Việc cần làm</h2>
                <p>
                  <Link href="/instructor/issues" className="font-semibold text-brand-700 hover:underline">
                    {a.openIssues} báo lỗi nội dung đang mở
                  </Link>
                </p>
                <p>
                  <Link href="/instructor/questions" className="font-semibold text-brand-700 hover:underline">
                    {a.unansweredQuestions} câu hỏi chưa có giảng viên trả lời
                  </Link>
                </p>
                {a.revoked ? <p className="text-ink-faint">{a.revoked} lượt đăng ký đã bị thu hồi (không tính vào tỉ lệ).</p> : null}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
