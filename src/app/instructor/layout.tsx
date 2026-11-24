import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { viewerOrRedirect } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
import { IconChart, IconChat, IconFlag, IconGrid, IconRoute, IconRubric } from "@/components/icons";

export const metadata: Metadata = { title: { default: "Khu giảng viên", template: "%s · Giảng viên" }, robots: { index: false } };

/** Chỉ giảng viên (hoặc admin). Mọi action/service vẫn tự kiểm tra quyền sở hữu. */
export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const v = await viewerOrRedirect("/instructor");
  if (!v.roles.includes("instructor") && !v.roles.includes("admin")) redirect("/settings/profile?need=instructor");
  return (
    <AppShell
      title="Giảng viên"
      links={[
        { href: "/instructor", label: "Tổng quan", icon: <IconChart size={18} />, exact: true },
        { href: "/instructor/courses", label: "Khóa học", icon: <IconGrid size={18} /> },
        { href: "/instructor/submissions", label: "Bài nộp", icon: <IconRubric size={18} /> },
        { href: "/instructor/questions", label: "Hỏi đáp", icon: <IconChat size={18} /> },
        { href: "/instructor/issues", label: "Báo lỗi nội dung", icon: <IconFlag size={18} /> },
        { href: "/instructor/paths", label: "Lộ trình", icon: <IconRoute size={18} /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
