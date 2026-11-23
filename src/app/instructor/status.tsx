import { Badge } from "@/components/ui";

/** Nhãn trạng thái khóa học + duyệt (dùng chung giảng viên/admin). */
export function CourseStatusBadges({ status, review, hasChanges }: { status: string; review: { state: string }; hasChanges?: boolean }) {
  const s: Record<string, [string, "neutral" | "success" | "warning" | "danger" | "info"]> = {
    draft: ["Bản nháp", "neutral"],
    published: ["Đã xuất bản", "success"],
    archived: ["Đã lưu trữ", "warning"],
    suspended: ["Bị đình chỉ", "danger"],
  };
  const r: Record<string, [string, "info" | "danger" | "success"] | null> = {
    none: null,
    pending: ["Chờ duyệt", "info"],
    rejected: ["Bị từ chối", "danger"],
    approved: null,
  };
  const [sl, st] = s[status] ?? ["?", "neutral"];
  const rv = r[review.state];
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <Badge tone={st}>{sl}</Badge>
      {rv ? <Badge tone={rv[1]}>{rv[0]}</Badge> : null}
      {hasChanges ? <Badge tone="warning">Có thay đổi chưa gửi duyệt</Badge> : null}
    </span>
  );
}
