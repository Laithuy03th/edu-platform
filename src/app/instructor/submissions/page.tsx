import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { reviewQueue } from "@/modules/projects/service";
import { formatDateTime } from "@/lib/time";
import { IconRubric } from "@/components/icons";
import { Badge, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";

export const metadata = { title: "Bài nộp" };

export default async function SubmissionsPage() {
  const viewer = await requireViewer();
  const q = await reviewQueue(viewer);
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { label: "Bài nộp" }]} title="Bài nộp chờ chấm" description="Chỉ hiển thị tên hiển thị học viên — không có email." />
      {q.length === 0 ? (
        <EmptyState icon={<IconRubric />} title="Không có bài nào chờ chấm" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Học viên</Th>
              <Th>Khóa học</Th>
              <Th>Vòng</Th>
              <Th>Nộp lúc</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {q.map((s) => (
              <Tr key={s.id}>
                <Td className="font-semibold">{s.learner}</Td>
                <Td>{s.course}</Td>
                <Td>
                  <Badge tone={s.status === "resubmitted" ? "warning" : "info"}>Vòng {s.round}</Badge>
                </Td>
                <Td className="text-ink-soft">{s.submittedAt ? formatDateTime(s.submittedAt, viewer.timezone) : "—"}</Td>
                <Td className="text-right">
                  <Link href={`/instructor/submissions/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                    Chấm bài
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
