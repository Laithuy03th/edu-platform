import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { mySubmissions } from "@/modules/projects/service";
import { IconRubric } from "@/components/icons";
import { Badge, Container, EmptyState, PageHeader, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE } from "./status";

export const metadata = { title: "Bài tập dự án" };

export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const subs = await mySubmissions(viewer);
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title="Bài tập dự án" description="Bài nộp của bạn chỉ bạn, giảng viên khóa học và quản trị viên xem được." />
      {subs.length === 0 ? (
        <EmptyState icon={<IconRubric />} title="Chưa có bài nộp" action={<Link href="/my-courses" className={buttonClass("primary")}>Về khóa học của tôi</Link>}>
          Bài tập dự án nằm ở cuối các chương có đánh dấu “Bài tập dự án”.
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Bài tập</Th>
              <Th>Khóa học</Th>
              <Th>Trạng thái</Th>
              <Th>Vòng nộp</Th>
              <Th>Điểm gần nhất</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <Tr key={s.id}>
                <Td className="font-semibold">{s.title}</Td>
                <Td className="text-ink-soft">{s.courseTitle}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </Td>
                <Td className="tabular-nums">{s.rounds}</Td>
                <Td className="tabular-nums">{s.lastScore ?? "—"}</Td>
                <Td className="text-right">
                  <Link href={`/projects/${s.assignmentId}`} className="font-semibold text-brand-700 hover:underline">
                    Mở
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
