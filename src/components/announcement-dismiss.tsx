"use client";

import { ANN_COOKIE } from "@/lib/site-cookies";

/** Đóng banner: nhớ phiên bản đã đóng 30 ngày bằng cookie (không chứa dữ liệu cá nhân). */
export function AnnouncementDismiss({ version }: { version: string }) {
  return (
    <button
      type="button"
      aria-label="Đóng thông báo"
      className="grid size-7 shrink-0 place-items-center rounded-full opacity-80 transition hover:bg-black/10 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      onClick={() => {
        document.cookie = `${ANN_COOKIE}=${version}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax`;
        document.getElementById("site-announcement")?.remove();
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
