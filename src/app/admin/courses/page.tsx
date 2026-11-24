import Link from "next/link";
import { requireRole } from "@/server/auth";
import { allCoursesAdmin, reviewQueueCourses } from "@/modules/admin/service";
import { setCourseStatusAction, setFeaturedAction } from "@/modules/courses/actions";
import { formatDateTime } from "@/lib/time";
import { Badge, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { CourseStatusBadges } from "@/app/instructor/status";
import { AdminAction } from "../client";

export const metadata = { title: "Khóa học & duyệt" };

export default async function AdminCourses() {
  const admin = await requireRole("admin");
  const [queue, all] = await Promise.all([reviewQueueCourses(admin), allCoursesAdmin(admin)]);
  return (
    <>
      <PageHeader title="Khóa học & duyệt" />
      <section className="mb-10">
        <h2 className="text-h3 mb-3">Hàng chờ duyệt ({queue.length})</h2>
        {queue.length === 0 ? (
          <EmptyState title="Không có khóa học nào chờ duyệt" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Khóa học</Th>
                <Th>Giảng viên</Th>
                <Th>Loại</Th>
                <Th>Gửi lúc</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-semibold">{c.title}</Td>
                  <Td>{c.instructor}</Td>
                  <Td>{c.isUpdate ? <Badge tone="warning">Cập nhật bản đã xuất bản</Badge> : <Badge tone="info">Xuất bản lần đầu</Badge>}</Td>
                  <Td className="text-ink-soft">{c.submittedAt ? formatDateTime(c.submittedAt, admin.timezone) : "—"}</Td>
                  <Td className="text-right">
                    <Link href={`/admin/courses/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                      Xem & duyệt
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <section>
        <h2 className="text-h3 mb-3">Tất cả khóa học</h2>
        <Table>
          <thead>
            <tr>
              <Th>Khóa học</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Học viên</Th>
              <Th>Nổi bật</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {all.map((c) => {
              const id = c._id.toHexString();
              return (
                <Tr key={id}>
                  <Td>
                    <Link href={`/admin/courses/${id}`} className="font-semibold hover:text-brand-700">
                      {c.draft.title}
                    </Link>
                  </Td>
                  <Td>
                    <CourseStatusBadges status={c.status} review={c.review} />
                  </Td>
                  <Td className="text-right tabular-nums">{c.enrollmentCount}</Td>
                  <Td>
                    {c.status === "published" ? (
                      <AdminAction variant="ghost" label={c.featuredRank ? `★ #${c.featuredRank} — bỏ` : "☆ Đặt nổi bật"} success="Đã cập nhật nổi bật." action={setFeaturedAction} input={{ courseId: id, rank: c.featuredRank ? null : 1 }} />
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="text-right">
                    {c.status === "suspended" ? (
                      <AdminAction label="Bỏ đình chỉ" tone="brand" confirmTitle="Bỏ đình chỉ khóa học?" action={setCourseStatusAction} input={{ courseId: id, action: "unsuspend", reason: "" }} />
                    ) : c.status === "published" || c.status === "archived" ? (
                      <AdminAction label="Đình chỉ" variant="danger" confirmTitle="Đình chỉ khóa học?" confirmText="Chặn toàn bộ truy cập nội dung, kể cả học viên đã đăng ký." reasonLabel="Lý do (ghi vào audit)" success="Đã đình chỉ." action={setCourseStatusAction} input={{ courseId: id, action: "suspend" }} reasonField="reason" />
                    ) : null}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </section>
    </>
  );
}
