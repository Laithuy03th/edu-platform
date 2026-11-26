import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { viewerOrRedirect } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
import { IconBook, IconChart, IconChat, IconFlag, IconGrid, IconLayout, IconRoute, IconShield, IconSparkle, IconUpload, IconUser, IconSearch } from "@/components/icons";

export const metadata: Metadata = { title: { default: "Quản trị", template: "%s · Quản trị" }, robots: { index: false } };

/** Chỉ admin — trả 404 cho người khác (không lộ sự tồn tại). Mọi action vẫn tự kiểm tra role. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const v = await viewerOrRedirect("/admin");
  if (!v.roles.includes("admin")) notFound();
  return (
    <AppShell
      title="Quản trị"
      links={[
        { href: "/admin", label: "Tổng quan", icon: <IconChart size={18} />, exact: true },
        { href: "/admin/courses", label: "Khóa học & duyệt", icon: <IconGrid size={18} /> },
        { href: "/admin/users", label: "Người dùng", icon: <IconUser size={18} /> },
        { href: "/admin/instructor-applications", label: "Đơn giảng viên", icon: <IconShield size={18} /> },
        { href: "/admin/categories", label: "Chủ đề", icon: <IconLayout size={18} /> },
        { href: "/admin/technologies", label: "Công nghệ", icon: <IconGrid size={18} /> },
        { href: "/admin/coverage", label: "Độ phủ nội dung", icon: <IconChart size={18} /> },
        { href: "/admin/seo", label: "Kiểm tra SEO", icon: <IconSearch size={18} /> },
        { href: "/admin/site", label: "Banner thông báo", icon: <IconSparkle size={18} /> },
        { href: "/instructor/articles", label: "Bài hướng dẫn", icon: <IconBook size={18} /> },
        { href: "/instructor/issues", label: "Báo lỗi nội dung", icon: <IconFlag size={18} /> },
        { href: "/instructor/paths", label: "Lộ trình", icon: <IconRoute size={18} /> },
        { href: "/admin/moderation", label: "Kiểm duyệt", icon: <IconChat size={18} /> },
        { href: "/admin/media", label: "Media & quota", icon: <IconUpload size={18} /> },
        { href: "/admin/audit", label: "Nhật ký audit", icon: <IconShield size={18} /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
