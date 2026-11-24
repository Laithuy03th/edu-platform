import { requireRole } from "@/server/auth";
import { moderationQueue } from "@/modules/discussions/service";
import { moderateAction } from "@/modules/discussions/actions";
import { formatDateTime } from "@/lib/time";
import { IconChat } from "@/components/icons";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { AdminAction } from "../client";

export const metadata = { title: "Kiểm duyệt" };

const TYPE: Record<string, string> = { question: "Câu hỏi", answer: "Câu trả lời", review: "Đánh giá khóa học" };

export default async function ModerationPage() {
  const admin = await requireRole("admin");
  const queue = await moderationQueue(admin);
  return (
    <>
      <PageHeader title="Kiểm duyệt nội dung" description="Ẩn nội dung vi phạm kèm lý do (ghi audit). Không xóa cứng hàng loạt." />
      {queue.length === 0 ? (
        <EmptyState icon={<IconChat />} title="Không có báo cáo nào đang mở" />
      ) : (
        <div className="space-y-4">
          {queue.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{TYPE[r.targetType]}</Badge>
                <Badge tone="warning">{r.reason}</Badge>
                {r.targetStatus === "hidden" ? <Badge tone="danger">Đang ẩn</Badge> : null}
                <span className="ml-auto text-xs text-ink-faint">{formatDateTime(r.createdAt, admin.timezone)}</span>
              </div>
              <blockquote className="whitespace-pre-line rounded-[var(--radius-sm)] border-l-4 border-brand-300 bg-surface-muted p-3 text-sm">{r.preview}</blockquote>
              {r.note ? <p className="text-sm text-ink-soft">Ghi chú người báo cáo: {r.note}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <AdminAction variant="ghost" tone="brand" label="Bỏ qua" confirmTitle="Đóng báo cáo, giữ nội dung?" reasonLabel="Lý do" reasonField="reason" action={moderateAction} input={{ targetType: r.targetType, targetId: r.targetId, action: "dismiss" }} />
                {r.targetStatus === "hidden" ? (
                  <AdminAction variant="outline" tone="brand" label="Hiện lại" confirmTitle="Hiện lại nội dung?" reasonLabel="Lý do" reasonField="reason" action={moderateAction} input={{ targetType: r.targetType, targetId: r.targetId, action: "unhide" }} />
                ) : (
                  <AdminAction variant="danger" label="Ẩn nội dung" confirmTitle="Ẩn nội dung này?" reasonLabel="Lý do (ghi audit)" reasonField="reason" action={moderateAction} input={{ targetType: r.targetType, targetId: r.targetId, action: "hide" }} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
