import Link from "next/link";
import { getViewer } from "@/server/auth";
import { Avatar } from "./avatar";
import { LogoutButton } from "./logout-button";
import { Container, buttonClass } from "./ui";

export async function SiteHeader() {
  const viewer = await getViewer();
  const isInstructor = viewer?.roles.includes("instructor");
  const isAdmin = viewer?.roles.includes("admin");

  const learnerLinks = viewer
    ? [
        { href: "/dashboard", label: "Tổng quan" },
        { href: "/my-courses", label: "Khóa học của tôi" },
        { href: "/review", label: "Ôn tập" },
        { href: "/notes", label: "Ghi chú" },
        { href: "/projects", label: "Dự án" },
        { href: "/my-paths", label: "Lộ trình của tôi" },
        { href: "/achievements", label: "Hồ sơ thành quả" },
        ...(isInstructor ? [{ href: "/instructor", label: "Khu giảng viên" }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
        { href: "/settings/profile", label: "Cài đặt" },
      ]
    : [];

  return (
    <header className="border-b border-slate-200 bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Tự Học
          </Link>
          <nav aria-label="Điều hướng chính" className="hidden gap-4 text-sm md:flex">
            <Link href="/courses" className="text-slate-700 hover:text-brand-700">
              Khóa học
            </Link>
            <Link href="/paths" className="text-slate-700 hover:text-brand-700">
              Lộ trình
            </Link>
            {viewer ? (
              <Link href="/dashboard" className="text-slate-700 hover:text-brand-700">
                Học tập
              </Link>
            ) : null}
          </nav>
        </div>

        {viewer ? (
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100" aria-label="Mở menu tài khoản">
              <Avatar name={viewer.displayName} url={viewer.avatarUrl} size={32} />
              <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{viewer.displayName}</span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-60 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              <nav aria-label="Menu tài khoản" className="flex flex-col">
                <Link href="/courses" className="rounded px-3 py-2 text-sm hover:bg-slate-100 md:hidden">
                  Khóa học
                </Link>
                <Link href="/paths" className="rounded px-3 py-2 text-sm hover:bg-slate-100 md:hidden">
                  Lộ trình
                </Link>
                {learnerLinks.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded px-3 py-2 text-sm hover:bg-slate-100">
                    {l.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-slate-200" />
                <LogoutButton />
              </nav>
            </div>
          </details>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/courses" className="text-sm text-slate-700 md:hidden">
              Khóa học
            </Link>
            <Link href="/login" className={buttonClass("ghost")}>
              Đăng nhập
            </Link>
            <Link href="/register" className={buttonClass("primary")}>
              Đăng ký
            </Link>
          </div>
        )}
      </Container>
      {viewer && !viewer.emailVerified ? (
        <div className="border-t border-amber-200 bg-amber-50">
          <Container className="py-2 text-sm text-amber-900">
            Email của bạn chưa được xác minh — cần xác minh để đăng ký khóa học, nộp bài và hỏi đáp.{" "}
            <Link href="/verify-email" className="font-medium underline">
              Xác minh ngay
            </Link>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-2 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <p>Tự Học — dự án demo học tập. Nội dung mẫu do dự án tự biên soạn.</p>
        <nav className="flex gap-4" aria-label="Liên kết chân trang">
          <Link href="/courses">Khóa học</Link>
          <Link href="/paths">Lộ trình</Link>
        </nav>
      </Container>
    </footer>
  );
}
