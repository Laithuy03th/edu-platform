import { requireRole } from "@/server/auth";
import { listUsers } from "@/modules/admin/service";
import { setUserRolesAction, setUserStatusAction } from "@/modules/admin/actions";
import { formatDate } from "@/lib/time";
import { Badge, PageHeader, Pagination, Select, Table, Td, Th, Tr, buttonClass } from "@/components/ui";
import { AdminAction } from "../client";

export const metadata = { title: "Người dùng" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const admin = await requireRole("admin");
  const role = sp.role === "instructor" || sp.role === "admin" || sp.role === "student" ? sp.role : null;
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1), 200);
  const q = (sp.q ?? "").slice(0, 100);
  const { items, total } = await listUsers(admin, { q, role, page });
  return (
    <>
      <PageHeader title="Người dùng" description={`${total} tài khoản. Khóa tài khoản sẽ vô hiệu mọi phiên ngay lập tức.`} />
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Tìm email hoặc tên…" aria-label="Tìm người dùng" className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        <Select name="role" defaultValue={role ?? ""} aria-label="Vai trò" className="w-44 rounded-full">
          <option value="">Mọi vai trò</option>
          <option value="instructor">Giảng viên</option>
          <option value="admin">Quản trị</option>
        </Select>
        <button className={buttonClass("primary", undefined, "sm")}>Lọc</button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>Người dùng</Th>
            <Th>Vai trò</Th>
            <Th>Trạng thái</Th>
            <Th>Tham gia</Th>
            <Th className="text-right">Thao tác</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => {
            const id = u._id.toHexString();
            const self = id === admin.idStr;
            const isInstructor = u.roles.includes("instructor");
            const isAdmin = u.roles.includes("admin");
            return (
              <Tr key={id}>
                <Td>
                  <p className="font-semibold">{u.displayName}</p>
                  <p className="text-xs text-ink-faint">
                    {u.email} {u.emailVerifiedAt ? "" : "· chưa xác minh"}
                  </p>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {isAdmin ? <Badge tone="brand">Admin</Badge> : null}
                    {isInstructor ? <Badge tone="info">Giảng viên</Badge> : null}
                    <Badge>Học viên</Badge>
                  </span>
                </Td>
                <Td>{u.status === "blocked" ? <Badge tone="danger">Bị khóa</Badge> : <Badge tone="success">Hoạt động</Badge>}</Td>
                <Td className="text-ink-soft">{formatDate(u.createdAt, admin.timezone)}</Td>
                <Td className="text-right">
                  <span className="inline-flex flex-wrap justify-end gap-1">
                    <AdminAction
                      variant="ghost"
                      label={isInstructor ? "Gỡ giảng viên" : "Cấp giảng viên"}
                      tone="brand"
                      confirmTitle={isInstructor ? "Gỡ quyền giảng viên?" : "Cấp quyền giảng viên?"}
                      action={setUserRolesAction}
                      input={{ userId: id, roles: isInstructor ? u.roles.filter((r) => r !== "instructor") : [...u.roles, "instructor"] }}
                    />
                    {!self ? (
                      u.status === "active" ? (
                        <AdminAction variant="danger" label="Khóa" confirmTitle={`Khóa tài khoản ${u.displayName}?`} confirmText="Mọi phiên đăng nhập bị vô hiệu ngay." reasonLabel="Lý do (ghi audit)" reasonField="reason" action={setUserStatusAction} input={{ userId: id, status: "blocked" }} success="Đã khóa tài khoản." />
                      ) : (
                        <AdminAction variant="outline" label="Mở khóa" tone="brand" confirmTitle="Mở khóa tài khoản?" action={setUserStatusAction} input={{ userId: id, status: "active", reason: "" }} success="Đã mở khóa." />
                      )
                    ) : null}
                  </span>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / 25)} href={(p) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), page: String(p) })}`} />
    </>
  );
}
