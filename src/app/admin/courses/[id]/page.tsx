import { notFound } from "next/navigation";
import { parseId } from "@/lib/ids";
import { formatDuration } from "@/lib/text";
import { formatDate } from "@/lib/time";
import { requireRole } from "@/server/auth";
import { cols } from "@/server/db/models";
import { publishProblems } from "@/modules/courses/authoring";
import { courseEnrollmentsAdmin } from "@/modules/admin/service";
import { approveCourseAction, rejectCourseAction } from "@/modules/courses/actions";
import { setEnrollmentStatusAction } from "@/modules/admin/actions";
import { Markdown } from "@/components/markdown";
import { Alert, Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { CourseStatusBadges } from "@/app/instructor/status";
import { AdminAction } from "../../client";

export const metadata = { title: "Duyệt khóa học" };

export default async function AdminCourseReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = parseId(id);
  if (!courseId) notFound();
  const admin = await requireRole("admin");
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  if (!course) notFound();
  const [chapters, lessons, problems, enrollments, instructor] = await Promise.all([
    c.chapters.find({ courseId, "draft.deleted": false }).sort({ "draft.order": 1 }).toArray(),
    c.lessons.find({ courseId, "draft.deleted": false }).sort({ "draft.order": 1 }).toArray(),
    publishProblems(courseId),
    courseEnrollmentsAdmin(admin, courseId),
    c.users.findOne({ _id: course.instructorId }, { projection: { displayName: 1 } }),
  ]);
  const pending = course.review.state === "pending";
  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/admin/courses", label: "Khóa học" }, { label: course.draft.title }]}
        title={course.draft.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <CourseStatusBadges status={course.status} review={course.review} /> Giảng viên: {instructor?.displayName ?? "?"} · Bản nháp rev {course.draftRevision}
          </span>
        }
        actions={
          pending ? (
            <>
              <AdminAction label="Từ chối" variant="danger" confirmTitle="Từ chối khóa học?" reasonLabel="Lý do gửi giảng viên (≥ 10 ký tự)" success="Đã từ chối." action={rejectCourseAction} input={{ courseId: id }} reasonField="reason" />
              <AdminAction label="Duyệt & xuất bản" variant="primary" tone="brand" confirmTitle="Duyệt và xuất bản bản nháp này?" confirmText="Nội dung bản nháp (đúng revision đã nộp) sẽ trở thành bản công khai." success="Đã xuất bản." action={approveCourseAction} input={{ courseId: id, submittedRevision: course.review.submittedRevision ?? course.draftRevision }} />
            </>
          ) : null
        }
      />
      {problems.length ? (
        <Alert tone="warning" className="mb-6" title="Chưa đủ điều kiện xuất bản">
          <ul className="list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="text-h3 mb-2">Mô tả</h2>
            <p className="mb-3 text-ink-soft">{course.draft.shortDescription}</p>
            <Markdown>{course.draft.description || "_(trống)_"}</Markdown>
          </Card>
          {chapters.map((ch, i) => (
            <section key={ch._id.toHexString()} className="rounded-[var(--radius-lg)] border border-line bg-surface">
              <p className="border-b border-line px-5 py-3 font-semibold">
                {i + 1}. {ch.draft!.title}
              </p>
              {lessons
                .filter((l) => l.draft!.chapterId.equals(ch._id))
                .map((l) => (
                  <details key={l._id.toHexString()} className="smooth border-b border-line last:border-b-0">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-5 py-3 text-sm hover:bg-brand-50/50">
                      <span className="flex-1 font-medium">{l.draft!.title}</span>
                      <Badge>{l.draft!.type === "video" ? "Video" : "Bài đọc"}</Badge>
                      {l.draft!.isPreview ? <Badge tone="success">Học thử</Badge> : null}
                      <span className="text-xs text-ink-faint">{formatDuration(l.draft!.durationSeconds)}</span>
                    </summary>
                    <div className="px-5 pb-5">
                      <Markdown>{l.draft!.content || "_(không có nội dung đọc)_"}</Markdown>
                    </div>
                  </details>
                ))}
            </section>
          ))}
        </div>
        <aside>
          <Card className="space-y-3">
            <h2 className="text-h3">Học viên ({enrollments.length})</h2>
            <p className="text-xs text-ink-faint">Thu hồi có lý do; học viên mất quyền ở request kế tiếp nhưng vẫn xem được ghi chú của mình.</p>
            {enrollments.length === 0 ? (
              <p className="text-sm text-ink-faint">Chưa có.</p>
            ) : (
              <Table className="min-w-0">
                <thead>
                  <tr>
                    <Th>Học viên</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <Tr key={e.id}>
                      <Td>
                        <p className="font-medium">{e.user?.displayName}</p>
                        <p className="text-xs text-ink-faint">
                          {e.user?.email} · {formatDate(e.enrolledAt, admin.timezone)}
                        </p>
                        {e.status === "revoked" ? <Badge tone="danger">Đã thu hồi</Badge> : e.completedAt ? <Badge tone="success">Hoàn thành</Badge> : null}
                      </Td>
                      <Td className="text-right">
                        {e.status === "active" ? (
                          <AdminAction label="Thu hồi" variant="ghost" confirmTitle="Thu hồi quyền học?" reasonLabel="Lý do" action={setEnrollmentStatusAction} input={{ enrollmentId: e.id, action: "revoke" }} reasonField="reason" />
                        ) : (
                          <AdminAction label="Khôi phục" variant="ghost" tone="brand" confirmTitle="Khôi phục quyền học?" action={setEnrollmentStatusAction} input={{ enrollmentId: e.id, action: "restore" }} />
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
