import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { env } from "@/lib/env";
import { formatBytes, formatDuration } from "@/lib/text";
import { formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth";
import { loadEditableCourse } from "@/modules/courses/authoring";
import { listCourseMedia } from "@/modules/media/service";
import { getSettings } from "@/modules/media/settings";
import { budgetStatus } from "@/modules/media/usage";
import { Alert, Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { MediaActions, UploadPanel } from "./client";

export const metadata = { title: "Thư viện media" };

export default async function MediaLibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = parseId(id);
  if (!courseId) notFound();
  const viewer = await requireViewer();
  let course;
  try {
    course = await loadEditableCourse(viewer, courseId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const [media, settings, budget] = await Promise.all([listCourseMedia(viewer, courseId), getSettings(), budgetStatus()]);
  const videos = media.filter((m) => m.resourceType === "video" && m.status === "ready").length;
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/courses", label: "Khóa học" }, { href: `/instructor/courses/${id}`, label: course.draft.title }, { label: "Media" }]} title="Thư viện media" description={`Video: ${videos}/${settings.limits.videosPerCourse} · Ảnh tối đa ${formatBytes(settings.limits.imageMaxBytes)} · Video tối đa ${formatBytes(settings.limits.videoMaxBytes)}, ${Math.round(settings.limits.videoMaxSeconds / 60)} phút.`} />
      {!env().cloudinaryEnabled ? <Alert tone="warning" className="mb-6" title="Cloudinary chưa được cấu hình">Điền CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env để tải media.</Alert> : budget.uploadsBlockedReason ? <Alert tone="warning" className="mb-6" title="Tạm dừng tải lên">{budget.uploadsBlockedReason}</Alert> : null}
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {media.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-8 text-center text-sm text-ink-faint">Chưa có media nào.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tên file</Th>
                  <Th>Loại</Th>
                  <Th className="text-right">Dung lượng</Th>
                  <Th>Trạng thái</Th>
                  <Th>Tải lên</Th>
                  <Th className="text-right">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {media.map((m) => (
                  <Tr key={m.id}>
                    <Td className="max-w-[14rem] truncate font-medium">{m.filename}</Td>
                    <Td>
                      {m.resourceType === "video" ? `Video · ${formatDuration(m.durationSeconds ?? 0)}` : `Ảnh ${m.width}×${m.height}`}
                      <span className="block text-xs text-ink-faint">{m.deliveryType === "authenticated" ? "Có chữ ký" : "Công khai"}</span>
                    </Td>
                    <Td className="text-right tabular-nums">{formatBytes(m.bytes)}</Td>
                    <Td>{m.status === "deletion_pending" ? <Badge tone="warning">Đang xóa</Badge> : m.inUse ? <Badge tone="success">Đang dùng</Badge> : <Badge>Chưa dùng</Badge>}</Td>
                    <Td className="text-xs text-ink-soft">{formatDateTime(m.createdAt, viewer.timezone)}</Td>
                    <Td className="text-right">{m.status === "ready" ? <MediaActions mediaId={m.id} courseId={id} inUse={m.inUse} /> : null}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
        <aside>
          <Card className="space-y-4 xl:sticky xl:top-24">
            <h2 className="text-h3">Tải lên</h2>
            {env().cloudinaryEnabled && !budget.uploadsBlockedReason ? (
              <UploadPanel courseId={id} limits={{ imageMaxBytes: settings.limits.imageMaxBytes, videoMaxBytes: settings.limits.videoMaxBytes, videoMaxSeconds: settings.limits.videoMaxSeconds }} />
            ) : (
              <p className="text-sm text-ink-faint">Chưa thể tải lên lúc này.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
