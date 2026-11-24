import { requireRole } from "@/server/auth";
import { listApplications } from "@/modules/admin/service";
import { decideApplicationAction } from "@/modules/admin/actions";
import { formatDateTime } from "@/lib/time";
import { IconShield } from "@/components/icons";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { AdminAction } from "../client";

export const metadata = { title: "Đơn giảng viên" };

export default async function ApplicationsPage() {
  const admin = await requireRole("admin");
  const apps = await listApplications(admin);
  return (
    <>
      <PageHeader title="Đơn xin làm giảng viên" description="Không mở đăng ký giảng viên tự do — quyền tải media chỉ cấp sau khi duyệt." />
      {apps.length === 0 ? (
        <EmptyState icon={<IconShield />} title="Không có đơn nào đang chờ" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {apps.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div>
                <p className="font-semibold">{a.user?.displayName}</p>
                <p className="text-xs text-ink-faint">
                  {a.user?.email} · {formatDateTime(a.createdAt, admin.timezone)}
                </p>
              </div>
              <p className="whitespace-pre-line text-sm text-ink-soft">{a.motivation}</p>
              {a.sampleUrl ? (
                <a href={a.sampleUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-brand-700 underline">
                  Link minh họa ↗
                </a>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <AdminAction variant="danger" label="Từ chối" confirmTitle="Từ chối đơn?" reasonLabel="Lý do gửi người dùng" reasonField="reason" action={decideApplicationAction} input={{ applicationId: a.id, decision: "rejected" }} />
                <AdminAction variant="primary" tone="brand" label="Duyệt" confirmTitle="Cấp quyền giảng viên?" action={decideApplicationAction} input={{ applicationId: a.id, decision: "approved", reason: "" }} success="Đã cấp quyền giảng viên." />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
