import type { SVGProps } from "react";

/* Bộ icon SVG nét mảnh do dự án tự vẽ (không thêm thư viện icon). Mặc định aria-hidden. */
type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20, props: P) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconArrowLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const IconChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconMenu = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" /></svg>
);
export const IconBook = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /></svg>
);
export const IconNote = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4M8 12h8M8 16h5" /></svg>
);
export const IconClock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconRepeat = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M17 3l3 3-3 3" /><path d="M4 12V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3" /><path d="M20 12v3a3 3 0 0 1-3 3H4" /></svg>
);
export const IconTarget = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
);
export const IconRubric = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8.5h8M8 12.5h8M8 16.5h4" /><path d="m15 16 1.2 1.2L18.5 15" /></svg>
);
export const IconRoute = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></svg>
);
export const IconLeaf = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19 13 11" /></svg>
);
export const IconSparkle = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const IconUser = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
);
export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.5" /></svg>
);
export const IconInfo = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5v.5" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const IconEdit = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
);
export const IconUpload = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const IconChat = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
);
export const IconLayout = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M9 4v16" /></svg>
);
export const IconGrid = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
);
export const IconShield = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z" /></svg>
);
export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconGoogle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Wordmark: chữ "Tự Học" với biểu tượng trang sách mở. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="grid size-9 place-items-center rounded-[0.7rem] bg-gradient-to-br from-brand-300 to-brand-600 text-white shadow-cta">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" />
          <path d="M12 6.5v13" />
        </svg>
      </span>
      <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-ink">
        Tự<span className="ml-[0.28em] text-brand-700">Học</span>
      </span>
    </span>
  );
}

export const IconEye = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconEyeOff = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.4 3.3M6.4 6.4C3.9 8.1 2.5 12 2.5 12S6 19 12 19c1.9 0 3.6-.7 5-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></svg>
);
