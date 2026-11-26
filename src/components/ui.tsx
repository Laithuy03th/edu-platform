import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";

/*
 * Design system — primitive dùng được ở cả Server & Client Component (không hook).
 * Trạng thái: default / hover / focus-visible / active / disabled / loading / error.
 * Màu lấy từ token trong globals.css.
 */

export const cn = clsx;

/* ---------------- Button ---------------- */
export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger" | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg";

const btnBase =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-[var(--duration-micro)] ease-[var(--ease-out-soft)] active:translate-y-px disabled:pointer-events-none disabled:opacity-55";
const btnSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};
const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white shadow-cta hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-lg",
  soft: "bg-brand-100 text-brand-800 hover:bg-brand-200",
  outline: "border border-line-strong bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-ink",
  // Hành động nguy hiểm: viền + icon cảnh báo, khác biệt với CTA thương hiệu (nền đỏ đặc).
  danger: "border border-danger-200 bg-surface text-danger-700 hover:bg-danger-50",
  "danger-solid": "bg-danger-700 text-white hover:bg-danger-800",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string, size: ButtonSize = "md") {
  return cn(btnBase, btnSizes[size], btnVariants[variant], extra);
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  pending,
  icon,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; pending?: boolean; icon?: ReactNode }) {
  return (
    <button className={buttonClass(variant, className, size)} disabled={pending || props.disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <Spinner /> : icon ? <span className="transition-transform duration-200 group-hover/btn:scale-110">{icon}</span> : null}
      {variant === "danger" && !icon && !pending ? <IconAlert size={16} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", className, icon, children, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, className, size)} {...props}>
      {children}
      {icon ? <span className="transition-transform duration-200 group-hover/btn:translate-x-0.5">{icon}</span> : null}
    </Link>
  );
}

/** Nút chỉ có icon — luôn yêu cầu nhãn truy cập. */
export function IconButton({ label, className, children, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-brand-50 hover:text-brand-800 active:scale-95", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Form controls ---------------- */
const fieldBase =
  "block w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 text-[0.95rem] text-ink placeholder:text-ink-faint/80 shadow-xs transition-[border-color,box-shadow] duration-[var(--duration-micro)] hover:border-brand-300 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-surface-muted disabled:text-ink-faint aria-[invalid=true]:border-danger-700 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "min-h-11 py-2", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "py-2.5 leading-relaxed", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "min-h-11 py-2 pr-9", className)} {...props} />;
}
export function Checkbox({ label, description, className, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50", className)}>
      <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" {...props} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-soft">{description}</span> : null}
      </span>
    </label>
  );
}

/** Field: label + control + gợi ý + lỗi gắn với field (aria-describedby). */
export function Field({ id, label, hint, errors, children, optional }: { id: string; label: ReactNode; hint?: ReactNode; errors?: string[]; children: ReactNode; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-faint">Không bắt buộc</span> : null}
      </label>
      {children}
      {hint && !errors?.length ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger-700 animate-fade-in" role="alert">
          <IconAlert size={16} className="mt-0.5 shrink-0" />
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- Surfaces ---------------- */
export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-sm sm:p-6",
        interactive && "transition duration-[var(--duration-ui)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

/** Panel nhẹ (không viền đổ bóng) để tạo nhịp điệu khác card. */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-lg)] bg-brand-50/70 p-5 sm:p-6", className)} {...props} />;
}

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-soft border-line",
  brand: "bg-brand-100 text-brand-800 border-brand-200",
  info: "bg-info-50 text-info-700 border-info-200",
  success: "bg-success-50 text-success-700 border-success-200",
  warning: "bg-warning-50 text-warning-800 border-warning-200",
  danger: "bg-danger-50 text-danger-800 border-danger-200",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props} />;
}

const alertIcon: Partial<Record<Tone, ReactNode>> = {
  success: <IconCheck size={18} />,
  warning: <IconAlert size={18} />,
  danger: <IconAlert size={18} />,
  info: <IconInfo size={18} />,
  brand: <IconInfo size={18} />,
  neutral: <IconInfo size={18} />,
};

export function Alert({ tone = "info", title, children, className, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--radius-md)] border p-3.5 text-sm animate-fade-in", tones[tone], className)}>
      <span className="mt-0.5 shrink-0">{alertIcon[tone]}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, breadcrumb }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; breadcrumb?: { href?: string; label: string }[] }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb?.length ? (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-faint">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {b.href ? (
                  <Link href={b.href} className="hover:text-brand-700">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-soft">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <p className="text-caption mb-2 text-brand-700">{eyebrow}</p> : null}
        <h1 className="text-h1 text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">{icon ?? <IconSparkle />}</div>
        <p className="text-h3 text-ink">{title}</p>
        {children ? <div className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">{children}</div> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
function IconSparkle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

export function ProgressBar({ value, label, size = "md", hideLabel }: { value: number; label: string; size?: "sm" | "md"; hideLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {!hideLabel ? (
        <div className="mb-1.5 flex justify-between gap-2 text-xs font-medium text-ink-soft">
          <span>{label}</span>
          <span className="tabular-nums text-ink">{v}%</span>
        </div>
      ) : null}
      <div className={cn("overflow-hidden rounded-full bg-brand-100", size === "sm" ? "h-1.5" : "h-2.5")} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700 transition-[width] duration-700 ease-[var(--ease-out-soft)]" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** Vòng tiến độ SVG — dùng cho dashboard. */
export function ProgressRing({ value, size = 64, label }: { value: number; size?: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-brand-100)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-brand-700)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out-soft)]" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums text-ink">{Math.round(v)}%</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  // cn = clsx (không gộp class xung đột): trang tự đặt max-w-* thì bỏ max-w-7xl mặc định, nếu không 7xl luôn thắng
  const customWidth = /(^|\s)max-w-/.test(className ?? "");
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", !customWidth && "max-w-7xl", className)} {...props} />;
}

export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("py-14 sm:py-20", className)} {...props} />;
}

export function SectionHeading({ eyebrow, title, description, action, align = "left" }: { eyebrow?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; align?: "left" | "center" }) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:mb-10", align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")}>
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? <p className="text-caption mb-2 text-brand-700">{eyebrow}</p> : null}
        <h2 className="text-h2 text-ink">{title}</h2>
        {description ? <p className="mt-2 text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Table ---------------- */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    // relative: phần tử absolute bên trong (vd nhãn sr-only ở cột cuối) bị cắt theo khung cuộn, không kéo rộng trang
    <div className="relative overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface shadow-xs">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}
export const Th = ({ className, ...p }: ComponentProps<"th">) => <th className={cn("border-b border-line bg-surface-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft", className)} {...p} />;
export const Td = ({ className, ...p }: ComponentProps<"td">) => <td className={cn("border-b border-line px-4 py-3 align-top text-ink", className)} {...p} />;
export const Tr = ({ className, ...p }: ComponentProps<"tr">) => <tr className={cn("transition-colors hover:bg-brand-50/60", className)} {...p} />;

/* ---------------- Pagination ---------------- */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center justify-center gap-1.5 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass("ghost", undefined, "sm")}>
          ← Trước
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1]! > 1 ? <span className="px-1 text-ink-faint">…</span> : null}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn("grid size-9 place-items-center rounded-full font-semibold transition", n === page ? "bg-brand-700 text-white shadow-cta" : "text-ink-soft hover:bg-brand-50")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={buttonClass("ghost", undefined, "sm")}>
          Sau →
        </Link>
      ) : null}
    </nav>
  );
}

/** Tooltip CSS thuần (hover + focus), không thay thế nhãn truy cập. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white opacity-0 shadow-md transition duration-150 group-focus-within/tt:translate-y-0 group-focus-within/tt:opacity-100 group-hover/tt:translate-y-0 group-hover/tt:opacity-100">
        {content}
      </span>
    </span>
  );
}

/** Ô số liệu phụ (dashboard/admin). */
export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-sm text-ink-soft">
        {label}
        {icon ? <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
