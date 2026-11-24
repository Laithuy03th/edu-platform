import { requireRole } from "@/server/auth";
import { budgetStatus, latestSnapshot } from "@/modules/media/usage";
import { formatBytes } from "@/lib/text";
import { formatDateTime } from "@/lib/time";
import { env } from "@/lib/env";
import { cols } from "@/server/db/models";
import { Alert, Badge, Card, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { KillSwitchForm, LimitsForm, MaintenancePanel, RefreshUsageButton } from "./client";

export const metadata = { title: "Media & quota" };

const LEVEL: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
  ok: ["Bình thường", "success"],
  warn: ["≥ 60% — cảnh báo", "info"],
  strict: ["≥ 80% — tiết kiệm mạnh", "warning"],
  stop: ["≥ 90% — dừng upload", "danger"],
};

export default async function AdminMediaPage() {
  const admin = await requireRole("admin");
  const [b, mongo] = await Promise.all([budgetStatus(), latestSnapshot("mongodb_dbstats")]);
  const c = await cols();
  const [pendingRes, deletionQueue, ready] = await Promise.all([
    c.uploadReservations.countDocuments({ status: { $in: ["active", "finalizing"] } }),
    c.mediaAssets.countDocuments({ status: "deletion_pending" }),
    c.mediaAssets.countDocuments({ status: "ready" }),
  ]);
  const snap = b.snapshot;
  const mongoBytes = mongo ? (mongo.data.dataSize ?? 0) + (mongo.data.indexSize ?? 0) : null;
  const [levelLabel, levelTone] = LEVEL[b.level] ?? ["?", "info"];
  return (
    <>
      <PageHeader title="Media & quota" description="Ngân sách nội bộ thấp hơn hạn mức gói miễn phí. Số liệu provider có độ trễ." actions={<RefreshUsageButton />} />
      {!env().cloudinaryEnabled ? <Alert tone="warning" className="mb-6" title="Cloudinary chưa cấu hình">Upload và phát video bị tắt. Bài đọc vẫn hoạt động.</Alert> : null}
      {b.uploadsBlockedReason ? <Alert tone="warning" className="mb-6" title="Upload đang bị chặn (fail-closed)">{b.uploadsBlockedReason}</Alert> : null}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h3">Cloudinary</h2>
            <Badge tone={levelTone}>{levelLabel}</Badge>
          </div>
          <ProgressBar value={b.creditPercent ?? 0} label={`Credits: ${b.creditsUsed ?? "chưa có số liệu"} / ${b.budget.cloudinaryCredits} (ngân sách nội bộ; gói Free ghi 25)`} />
          <ProgressBar value={b.storagePercent} label={`Lưu trữ theo bộ đếm nội bộ: ${formatBytes(b.localStorageBytes)} / ${formatBytes(b.limits.storageBytes)}`} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-faint">Lần đồng bộ cuối</dt>
              <dd className="font-medium">{snap ? formatDateTime(snap.takenAt, admin.timezone) : "Chưa có"}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Provider cập nhật</dt>
              <dd className="font-medium">{snap?.providerLastUpdated ? formatDateTime(snap.providerLastUpdated, admin.timezone) : "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Độ tin cậy</dt>
              <dd>{snap ? <Badge tone={snap.authoritative ? "success" : "warning"}>{snap.authoritative ? "Số liệu provider" : "Ước tính"}</Badge> : "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Băng thông (cửa sổ 30 ngày)</dt>
              <dd className="font-medium">{snap?.data.bandwidthBytes !== undefined ? formatBytes(snap.data.bandwidthBytes) : "—"}</dd>
            </div>
          </dl>
          {b.lastAttempt && !b.lastAttempt.ok ? <Alert tone="danger">Lần đồng bộ gần nhất lỗi: {b.lastAttempt.error}</Alert> : null}
        </Card>
        <Card className="space-y-4">
          <h2 className="text-h3">MongoDB & media</h2>
          <ProgressBar value={mongoBytes !== null ? (mongoBytes / b.budget.mongodbBytes) * 100 : 0} label={`Data + index: ${mongoBytes !== null ? formatBytes(mongoBytes) : "chưa đo"} / ${formatBytes(b.budget.mongodbBytes)}`} />
          <p className="text-xs text-ink-faint">{mongo ? `Đo bằng dbStats lúc ${formatDateTime(mongo.takenAt, admin.timezone)}.` : "Bấm “Đồng bộ số liệu” để đo; nếu user DB thiếu quyền dbStats, ghi nhận thủ công từ Atlas UI."}</p>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Media sẵn sàng" value={ready} />
            <Stat label="Upload dở dang" value={pendingRes} />
            <Stat label="Chờ xóa" value={deletionQueue} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <KillSwitchForm initial={b.killSwitches} />
        <LimitsForm limits={b.limits} budget={b.budget} />
      </div>
      <div className="mt-6">
        <MaintenancePanel />
      </div>

      <Card className="mt-8 space-y-2 text-sm text-ink-soft">
        <h2 className="text-h3 text-ink">Giới hạn cần biết</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Chặn upload không chặn băng thông từ video đã có.</li>
          <li>Tắt cấp link phát mới không thu hồi link có chữ ký đã cấp (link không hết hạn trên gói Free) hoặc video học thử công khai.</li>
          <li>Số liệu Cloudinary có độ trễ; nhiều người xem cùng lúc hoặc link bị chia sẻ có thể vượt ngân sách trước khi dashboard kịp thấy.</li>
          <li>Gói Free không có hard cap — ứng dụng không bảo đảm tuyệt đối không vượt hạn mức. Không tự nâng gói.</li>
        </ul>
      </Card>
    </>
  );
}
