import Link from "next/link";
import { getViewer } from "@/server/auth";
import { Avatar } from "./avatar";
import { LogoutButton } from "./logout-button";
import { MobileMenu, NavLink } from "./nav-client";
import { ScrollState } from "./motion";
import { IconChevronDown, IconSearch, Logo } from "./icons";
import { Container, buttonClass } from "./ui";

export async function SiteHeader() {
  const viewer = await getViewer();
  const isInstructor = viewer?.roles.includes("instructor");
  const isAdmin = viewer?.roles.includes("admin");

  const main = [
    { href: "/courses", label: "Khóa học" },
    { href: "/technologies", label: "Công nghệ" },
    { href: "/paths", label: "Lộ trình" },
    ...(viewer ? [{ href: "/dashboard", label: "Học tập" }, { href: "/review", label: "Ôn tập" }] : []),
  ];
  const account = viewer
    ? [
        { href: "/dashboard", label: "Tổng quan" },
        { href: "/my-courses", label: "Khóa học của tôi" },
        { href: "/notes", label: "Ghi chú" },
        { href: "/saved", label: "Đã lưu" },
        { href: "/projects", label: "Dự án" },
        { href: "/my-paths", label: "Lộ trình của tôi" },
        { href: "/achievements", label: "Hồ sơ thành quả" },
        ...(isInstructor ? [{ href: "/instructor", label: "Khu giảng viên" }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
        { href: "/settings/profile", label: "Cài đặt" },
      ]
    : [];

  return (
    <>
      <ScrollState className="group/header sticky top-0 z-40 border-b border-transparent bg-canvas/70 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 data-[scrolled=true]:border-line data-[scrolled=true]:bg-surface/85 data-[scrolled=true]:shadow-sm">
        <header>
          <Container className="flex h-16 items-center justify-between gap-3 transition-[height] duration-300 group-data-[scrolled=true]/header:h-14">
            <div className="flex items-center gap-8">
              <Link href="/" aria-label="Tự Học — trang chủ" className="transition-transform hover:scale-[1.02]">
                <Logo />
              </Link>
              <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
                {main.map((l) => (
                  <NavLink key={l.href} href={l.href}>
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <form action="/courses" role="search" className="relative hidden lg:block">
                <label htmlFor="header-search" className="sr-only">
                  Tìm khóa học
                </label>
                <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  id="header-search"
                  name="q"
                  type="search"
                  placeholder="Tìm khóa học…"
                  maxLength={100}
                  className="h-10 w-56 rounded-full border border-line bg-surface/80 pl-10 pr-4 text-sm transition-[width,border-color,box-shadow] duration-300 placeholder:text-ink-faint focus:w-72 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </form>
              <Link href="/courses" aria-label="Tìm khóa học" className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-brand-50 lg:hidden">
                <IconSearch size={20} />
              </Link>

              {viewer ? (
                <details className="group relative hidden lg:block">
                  <summary className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-brand-50" aria-label="Mở menu tài khoản">
                    <Avatar name={viewer.displayName} url={viewer.avatarUrl} size={34} />
                    <span className="max-w-36 truncate text-sm font-semibold">{viewer.displayName}</span>
                    <IconChevronDown size={16} className="chevron text-ink-faint transition-transform duration-200" />
                  </summary>
                  <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-[var(--radius-md)] border border-line bg-surface p-2 shadow-lg animate-scale-in">
                    <div className="border-b border-line px-3 pb-2.5 pt-1.5">
                      <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
                      <p className="truncate text-xs text-ink-faint">{viewer.email}</p>
                    </div>
                    <nav aria-label="Menu tài khoản" className="flex flex-col py-1.5">
                      {account.map((l) => (
                        <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-brand-50 hover:text-ink">
                          {l.label}
                        </Link>
                      ))}
                    </nav>
                    <div className="border-t border-line pt-1.5">
                      <LogoutButton />
                    </div>
                  </div>
                </details>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link href="/login" className={buttonClass("ghost", undefined, "sm")}>
                    Đăng nhập
                  </Link>
                  <Link href="/register" className={buttonClass("primary", undefined, "sm")}>
                    Đăng ký miễn phí
                  </Link>
                </div>
              )}
              <MobileMenu
                main={main}
                account={account}
                user={viewer ? { name: viewer.displayName, email: viewer.email, avatarUrl: viewer.avatarUrl } : null}
              />
            </div>
          </Container>
        </header>
      </ScrollState>
      {viewer && !viewer.emailVerified ? (
        <div className="border-b border-warning-200 bg-warning-50">
          <Container className="flex flex-wrap items-center gap-x-2 py-2 text-sm text-warning-800">
            Email chưa được xác minh — cần xác minh để đăng ký khóa học, nộp bài và hỏi đáp.
            <Link href="/verify-email" className="font-semibold underline underline-offset-2">
              Xác minh ngay
            </Link>
          </Container>
        </div>
      ) : null}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-ink-soft">
            Học lập trình theo lộ trình rõ ràng: bài đọc ngắn, video vừa đủ, quiz chấm ngay, ôn tập câu sai và dự án có rubric.
          </p>
          <p className="text-xs text-ink-faint">Dự án demo học tập — nội dung mẫu do dự án tự biên soạn, miễn phí trong phạm vi demo.</p>
        </div>
        <nav aria-label="Khám phá" className="space-y-2 text-sm">
          <p className="text-caption text-ink-faint">Khám phá</p>
          <Link href="/courses" className="block text-ink-soft hover:text-brand-700">Khóa học</Link>
          <Link href="/technologies" className="block text-ink-soft hover:text-brand-700">Học theo công nghệ</Link>
          <Link href="/paths" className="block text-ink-soft hover:text-brand-700">Lộ trình theo mục tiêu</Link>
          <Link href="/register" className="block text-ink-soft hover:text-brand-700">Tạo tài khoản</Link>
        </nav>
        <nav aria-label="Học tập" className="space-y-2 text-sm">
          <p className="text-caption text-ink-faint">Học tập</p>
          <Link href="/dashboard" className="block text-ink-soft hover:text-brand-700">Tổng quan</Link>
          <Link href="/review" className="block text-ink-soft hover:text-brand-700">Ôn tập hôm nay</Link>
          <Link href="/notes" className="block text-ink-soft hover:text-brand-700">Ghi chú</Link>
          <Link href="/saved" className="block text-ink-soft hover:text-brand-700">Đã lưu</Link>
          <Link href="/settings/profile" className="block text-ink-soft hover:text-brand-700">Tiết kiệm dữ liệu</Link>
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="py-4 text-xs text-ink-faint">© {new Date().getFullYear()} Tự Học · Demo</Container>
      </div>
    </footer>
  );
}
