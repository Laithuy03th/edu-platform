import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { managedPaths } from "@/modules/learning-paths/service";
import { formatDateTime } from "@/lib/time";
import { IconRoute } from "@/components/icons";
import { Badge, EmptyState, PageHeader, Table, Td, Th, Tr, buttonClass } from "@/components/ui";

export const metadata = { title: "Lộ trình" };

export default async function ManagePathsPage() {
  const viewer = await requireViewer();
  const paths = await managedPaths(viewer);
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { label: "Lộ trình" }]} title="Lộ trình học" actions={<Link href="/instructor/paths/new" className={buttonClass("primary")}>+ Tạo lộ trình</Link>} />
      {paths.length === 0 ? (
        <EmptyState icon={<IconRoute />} title="Chưa có lộ trình" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Lộ trình</Th>
              <Th>Trạng thái</Th>
              <Th>Số mục</Th>
              <Th>Cập nhật</Th>
            </tr>
          </thead>
          <tbody>
            {paths.map((p) => (
              <Tr key={p._id.toHexString()}>
                <Td>
                  <Link href={`/instructor/paths/${p._id.toHexString()}`} className="font-semibold hover:text-brand-700">
                    {p.title}
                  </Link>
                  {p.featured ? <Badge tone="brand" className="ml-2">Nổi bật</Badge> : null}
                </Td>
                <Td>
                  <Badge tone={p.status === "published" ? "success" : p.status === "draft" ? "neutral" : "warning"}>{p.status === "published" ? "Công khai" : p.status === "draft" ? "Nháp" : "Lưu trữ"}</Badge>
                </Td>
                <Td className="tabular-nums">{p.items.length}</Td>
                <Td className="text-ink-soft">{formatDateTime(p.updatedAt, viewer.timezone)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
