import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { instructorCourses } from "@/modules/courses/authoring";
import { listCategories } from "@/modules/courses/catalog";
import { formatDateTime } from "@/lib/time";
import { IconGrid } from "@/components/icons";
import { EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { CourseStatusBadges } from "../status";
import { CreateCourseButton } from "./create";

export const metadata = { title: "Khóa học" };

export default async function InstructorCourses() {
  const viewer = await requireViewer();
  const [courses, categories] = await Promise.all([instructorCourses(viewer), listCategories()]);
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { label: "Khóa học" }]} title="Khóa học của bạn" actions={<CreateCourseButton categories={categories} />} />
      {courses.length === 0 ? (
        <EmptyState icon={<IconGrid />} title="Chưa có khóa học">
          Tạo bản nháp, thêm chương và bài, rồi gửi quản trị viên duyệt.
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Tên khóa học</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Học viên</Th>
              <Th>Cập nhật</Th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <Tr key={c._id.toHexString()}>
                <Td>
                  <Link href={`/instructor/courses/${c._id.toHexString()}`} className="font-semibold hover:text-brand-700">
                    {c.draft.title}
                  </Link>
                  <p className="text-xs text-ink-faint">/{c.slug}</p>
                </Td>
                <Td>
                  <CourseStatusBadges status={c.status} review={c.review} hasChanges={c.publishedVersion > 0 && c.review.state === "none"} />
                </Td>
                <Td className="text-right tabular-nums">{c.enrollmentCount}</Td>
                <Td className="text-ink-soft">{formatDateTime(c.updatedAt, viewer.timezone)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
