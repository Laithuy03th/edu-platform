import Link from "next/link";
import { adminStats } from "@/modules/admin/service";
import { budgetStatus } from "@/modules/media/usage";
import { formatBytes } from "@/lib/text";
import { IconAlert, IconChat, IconGrid, IconShield, IconUser } from "@/components/icons";
import { Alert, Card, PageHeader, ProgressBar, Stat, buttonClass } from "@/components/ui";

export const metadata = { title: "Tổng quan" };

export default async function AdminHome() {
  const [s, b] = await Promise.all([adminStats(), budgetStatus()]);
  const queues = [
    { href: "/admin/courses", label: "Khóa chờ duyệt", n: s.pending, icon: <IconGrid size={18} /> },
    { href: "/admin/instructor-applications", label: "Đơn giảng viên", n: s.pendingApps, icon: <IconShield size={18} /> },
    { href: "/admin/moderation", label: "Báo cáo nội dung", n: s.openReports, icon: <IconChat size={18} /> },
  ];
  return (
    <>
      <PageHeader title="Tổng quan quản trị" description={`Số liệu tổng hợp, làm mới tối đa mỗi 5 phút (lần cuối ${new Date(s.at).toLocaleTimeString("vi-VN")}).`} />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {queues.map((q) => (
          <Link key={q.href} href={q.href} className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-100 text-brand-700">{q.icon}</span>
            <span className="flex-1">
              <span className="block text-sm text-ink-soft">{q.label}</span>
              <span className="font-display text-2xl font-extrabold">{q.n}</span>
            </span>
            {q.n > 0 ? <span className="size-2.5 animate-pulse rounded-full bg-brand-600" aria-label="Cần xử lý" /> : null}
          </Link>
        ))}
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Người dùng" value={s.users} hint={`${s.instructors} giảng viên · ${s.blocked} bị khóa`} icon={<IconUser size={18} />} />
        <Stat label="Khóa đã xuất bản" value={s.published} />
        <Stat label="Enrollment đang hoạt động" value={s.enrollments} hint={`${s.completions} lượt hoàn thành`} />
        <Stat label="Ghi chú · Lượt quiz" value={`${s.notes} · ${s.attempts}`} hint="Ước tính (estimatedDocumentCount)" />
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h3">Ngân sách media (nội bộ)</h2>
          <Link href="/admin/media" className={buttonClass("ghost", undefined, "sm")}>
            Chi tiết →
          </Link>
        </div>
        {b.uploadsBlockedReason ? (
          <Alert tone="warning" className="mb-4">
            <span className="inline-flex items-center gap-1">
              <IconAlert size={14} /> {b.uploadsBlockedReason}
            </span>
          </Alert>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2">
          <ProgressBar value={b.creditPercent ?? 0} label={`Cloudinary: ${b.creditsUsed ?? "?"} / ${b.budget.cloudinaryCredits} credits ${b.snapshot?.authoritative ? "" : "(ước tính)"}`} />
          <ProgressBar value={b.storagePercent} label={`Lưu trữ nội bộ: ${formatBytes(b.localStorageBytes)} / ${formatBytes(b.limits.storageBytes)}`} />
        </div>
      </Card>
    </>
  );
}
