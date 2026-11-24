import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { KIND_LABEL, listMyArticles } from "@/modules/articles/service";
import { formatDateTime } from "@/lib/time";
import { Badge, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { IconBook } from "@/components/icons";
import { NewArticle } from "./new-article";

export const metadata = { title: "Bài hướng dẫn" };

const STATE: Record<string, { label: string; tone: "neutral" | "warning" | "success" | "danger" | "info" }> = {
  none: { label: "Nháp", tone: "neutral" },
  pending: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Bị từ chối", tone: "danger" },
};

export default async function InstructorArticlesPage() {
  const viewer = await requireViewer();
  const items = await listMyArticles(viewer);
  const isAdmin = viewer.roles.includes("admin");
  const pending = items.filter((a) => a.review.state === "pending");
  return (
    <>
      <PageHeader
        title="Bài hướng dẫn & tham khảo"
        description="Hướng dẫn, cài đặt môi trường, xử lý lỗi, cheatsheet — trang công khai /huong-dan. Mỗi bài cần ghi môi trường đã chạy thử; admin duyệt trước khi xuất bản."
        actions={<NewArticle />}
      />
      {isAdmin && pending.length ? (
        <p className="mb-4 rounded-[var(--radius-md)] border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {pending.length} bài đang chờ bạn duyệt.
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState icon={<IconBook />} title="Chưa có bài nào">
          Bấm “Bài mới” để bắt đầu.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Bài</Th>
                <Th>Loại</Th>
                <Th>Trạng thái</Th>
                <Th>Sửa lần cuối</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <Tr key={a._id.toHexString()}>
                  <Td>
                    <Link href={`/instructor/articles/${a._id.toHexString()}`} className="font-semibold text-ink hover:text-brand-700">
                      {a.draft.title}
                    </Link>
                    <span className="block text-xs text-ink-faint">/huong-dan/{a.slug}</span>
                  </Td>
                  <Td className="text-sm">{KIND_LABEL[a.draft.kind]}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={STATE[a.review.state]!.tone}>{STATE[a.review.state]!.label}</Badge>
                      {a.status === "published" ? <Badge tone="success">Công khai</Badge> : a.status === "archived" ? <Badge>Lưu trữ</Badge> : null}
                    </span>
                  </Td>
                  <Td className="text-sm text-ink-soft">{formatDateTime(a.updatedAt, viewer.timezone)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
