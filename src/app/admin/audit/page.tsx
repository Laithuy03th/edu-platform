import { requireRole } from "@/server/auth";
import { listAudit } from "@/modules/admin/service";
import { formatDateTime } from "@/lib/time";
import { Badge, PageHeader, Pagination, Table, Td, Th, Tr, buttonClass } from "@/components/ui";

export const metadata = { title: "Nhật ký audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  const sp = await searchParams;
  const admin = await requireRole("admin");
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1), 200);
  const action = (sp.action ?? "").slice(0, 50);
  const { items, total } = await listAudit(admin, { action, page });
  return (
    <>
      <PageHeader title="Nhật ký audit" description="Giữ 180 ngày (TTL). Không chứa mật khẩu, token hay nội dung ghi chú." />
      <form className="mb-6 flex gap-2" role="search">
        <input name="action" defaultValue={action} placeholder="Lọc theo action, vd: course. hoặc auth." aria-label="Lọc action" className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        <button className={buttonClass("primary", undefined, "sm")}>Lọc</button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>Thời điểm</Th>
            <Th>Người thực hiện</Th>
            <Th>Hành động</Th>
            <Th>Đối tượng</Th>
            <Th>Kết quả</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <Tr key={i._id.toHexString()}>
              <Td className="whitespace-nowrap text-ink-soft">{formatDateTime(i.at, admin.timezone)}</Td>
              <Td>{i.actorName}</Td>
              <Td className="font-mono text-xs">{i.action}</Td>
              <Td className="font-mono text-xs text-ink-soft">
                {i.targetType}:{i.targetId?.slice(-8)}
              </Td>
              <Td>
                <Badge tone={i.outcome === "success" ? "success" : i.outcome === "denied" ? "warning" : "danger"}>{i.outcome}</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / 50)} href={(p) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(p) })}`} />
    </>
  );
}
