"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "./avatar";
import { IconMenu } from "./icons";
import { LogoutButton } from "./logout-button";
import { Drawer } from "./overlays";
import { buttonClass, cn } from "./ui";

/** Link điều hướng có trạng thái đang chọn (gạch chân chuyển động). */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold transition-colors after:absolute after:inset-x-2.5 xl:px-3.5 xl:after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-700 after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100",
        active ? "text-brand-800 after:scale-x-100" : "text-ink-soft",
      )}
    >
      {children}
    </Link>
  );
}

type L = { href: string; label: string };

/** Menu mobile dạng drawer: nút lớn, dễ bấm, đóng khi điều hướng. */
export function MobileMenu({ main, account, user }: { main: L[]; account: L[]; user: { name: string; email: string; avatarUrl: string | null } | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <button type="button" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full text-ink hover:bg-brand-50 lg:hidden">
        <IconMenu size={22} />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu">
        {user ? (
          <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-brand-50 p-3">
            <Avatar name={user.name} url={user.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink-faint">{user.email}</p>
            </div>
          </div>
        ) : null}
        <nav aria-label="Menu chính (mobile)" className="flex flex-col gap-1" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          {[...main, ...account.filter((a) => !main.some((m) => m.href === a.href))].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("rounded-[var(--radius-sm)] px-3 py-3 text-base font-medium transition", pathname.startsWith(l.href) ? "bg-brand-100 text-brand-800" : "text-ink-soft hover:bg-brand-50")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-line pt-4">
          {user ? (
            <LogoutButton />
          ) : (
            <div className="grid gap-2">
              <Link href="/register" className={buttonClass("primary", "w-full")}>
                Đăng ký miễn phí
              </Link>
              <Link href="/login" className={buttonClass("outline", "w-full")}>
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
