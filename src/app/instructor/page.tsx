import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { instructorStats } from "@/modules/admin/service";
import { IconChat, IconGrid, IconRubric } from "@/components/icons";
import { EmptyState, PageHeader, Stat, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { CourseStatusBadges } from "./status";

export const metadata = { title: "Tổng quan" };

export default async function InstructorHome() {
  const viewer = await requireViewer();
  const s = await instructorStats(viewer);
  const totals = s.courses.reduce((a, c) => ({ e: a.e + c.enrollments, c: a.c + c.completions, w: a.w + c.active7d }), { e: 0, c: 0, w: 0 });
  return (
    <>
      <PageHeader title="Tổng quan giảng viên" description="Số liệu tổng hợp theo khóa — không hiển thị dữ liệu cá nhân của học viên." actions={<Link href="/instructor/courses" className={buttonClass("primary")}>Quản lý khóa học</Link>} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Học viên đang học" value={totals.e} icon={<IconGrid size={18} />} />
        <Stat label="Hoạt động 7 ngày" value={totals.w} hint="Học viên có truy cập trong 7 ngày" />
        <Stat label="Câu hỏi chờ trả lời" value={s.openQuestions} icon={<IconChat size={18} />} />
        <Stat label="Bài nộp chờ chấm" value={s.pendingSubs} icon={<IconRubric size={18} />} />
      </div>
      {s.courses.length === 0 ? (
        <EmptyState icon={<IconGrid />} title="Bạn chưa có khóa học" action={<Link href="/instructor/courses" className={buttonClass("primary")}>Tạo khóa học đầu tiên</Link>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Khóa học</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Đăng ký</Th>
              <Th className="text-right">Hoàn thành</Th>
              <Th className="text-right">Đánh giá</Th>
            </tr>
          </thead>
          <tbody>
            {s.courses.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/instructor/courses/${c.id}`} className="font-semibold hover:text-brand-700">
                    {c.title}
                  </Link>
                  {c.review.state === "rejected" && c.review.rejectReason ? <p className="mt-1 text-xs text-danger-700">Lý do từ chối: {c.review.rejectReason}</p> : null}
                </Td>
                <Td>
                  <CourseStatusBadges status={c.status} review={c.review} />
                </Td>
                <Td className="text-right tabular-nums">{c.enrollments}</Td>
                <Td className="text-right tabular-nums">{c.completions}</Td>
                <Td className="text-right tabular-nums">{c.ratingCount ? `${c.ratingAvg.toFixed(1)} (${c.ratingCount})` : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
