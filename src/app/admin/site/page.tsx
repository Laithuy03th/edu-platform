import { requireRole } from "@/server/auth";
import { __uncachedAnnouncement } from "@/modules/site/announcement";
import { PageHeader } from "@/components/ui";
import { AnnouncementForm } from "./form";

export const metadata = { title: "Banner & giao diện" };

export default async function AdminSitePage() {
  await requireRole("admin");
  const a = await __uncachedAnnouncement();
  return (
    <>
      <PageHeader title="Banner thông báo" description="Dải thông báo trên đầu mọi trang (ra mắt khóa mới, lịch bảo trì…). Chỉ chữ thuần và một link nội bộ hoặc https. Người dùng đóng thì không thấy lại cho tới khi bạn lưu nội dung mới." />
      <AnnouncementForm initial={a} />
    </>
  );
}
