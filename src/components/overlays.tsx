"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconAlert, IconCheck, IconClose, IconInfo } from "./icons";
import { Button, cn } from "./ui";

/* ======================= Dialog (native <dialog>: focus trap + Escape có sẵn) ======================= */

export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn("ui-dialog m-auto w-[calc(100%-2rem)] rounded-[var(--radius-xl)] border border-line bg-surface p-0 text-ink shadow-lg", size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl")}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-h3">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-brand-50 hover:text-ink">
            <IconClose size={18} />
          </button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      {footer ? <div className="flex flex-wrap justify-end gap-2 rounded-b-[var(--radius-xl)] border-t border-line bg-surface-muted px-6 py-4">{footer}</div> : null}
    </dialog>
  );
}

/* ======================= Confirm (thay window.confirm) ======================= */

type ConfirmOpts = { title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "brand"; requireReason?: string };
type ConfirmResult = { ok: boolean; reason: string };
const ConfirmCtx = createContext<((o: ConfirmOpts) => Promise<ConfirmResult>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (r: ConfirmResult) => void }) | null>(null);
  const [reason, setReason] = useState("");
  const confirm = useCallback((o: ConfirmOpts) => new Promise<ConfirmResult>((resolve) => {
    setReason("");
    setState({ ...o, resolve });
  }), []);
  const close = (ok: boolean) => {
    state?.resolve({ ok, reason });
    setState(null);
  };
  const needReason = Boolean(state?.requireReason);
  return (
    <ConfirmCtx value={confirm}>
      {children}
      <Dialog
        open={Boolean(state)}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <span className={cn("grid size-8 place-items-center rounded-full", state?.tone === "brand" ? "bg-brand-100 text-brand-700" : "bg-danger-50 text-danger-700")}>
              {state?.tone === "brand" ? <IconInfo size={18} /> : <IconAlert size={18} />}
            </span>
            {state?.title}
          </span>
        }
        description={state?.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? "Hủy"}
            </Button>
            <Button variant={state?.tone === "brand" ? "primary" : "danger-solid"} disabled={needReason && reason.trim().length < 5} onClick={() => close(true)}>
              {state?.confirmLabel ?? "Xác nhận"}
            </Button>
          </>
        }
      >
        {needReason ? (
          <label className="block text-sm font-semibold">
            {state?.requireReason}
            <textarea
              className="mt-1.5 block w-full rounded-[var(--radius-sm)] border border-line-strong px-3 py-2 text-sm font-normal focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tối thiểu 5 ký tự"
            />
          </label>
        ) : null}
      </Dialog>
    </ConfirmCtx>
  );
}

/** const confirm = useConfirm(); if ((await confirm({...})).ok) ... */
export function useConfirm() {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error("useConfirm must be inside ConfirmProvider");
  return c;
}

/* ======================= Drawer ======================= */

export function Drawer({ open, onClose, title, children, side = "right" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: "left" | "right" }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      style={{ ["--drawer-from" as string]: side === "left" ? "-100%" : "100%" }}
      className={cn("ui-drawer m-0 h-dvh max-h-dvh w-[min(88vw,24rem)] max-w-none border-line bg-surface p-0 text-ink shadow-lg", side === "left" ? "mr-auto border-r" : "ml-auto border-l")}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-h3">{title}</p>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-brand-50 hover:text-ink">
            <IconClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </dialog>
  );
}

/* ======================= Toast ======================= */

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
const ToastCtx = createContext<((t: Omit<Toast, "id">) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx value={push}>
      {children}
      {/* Góc dưới, không che thao tác chính; aria-live đọc cho trình đọc màn hình. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full border bg-surface py-2.5 pl-3 pr-4 text-sm font-medium shadow-lg animate-toast-in",
              t.tone === "success" ? "border-success-200" : t.tone === "error" ? "border-danger-200" : "border-line",
            )}
          >
            <span className={cn("grid size-6 place-items-center rounded-full text-white", t.tone === "success" ? "bg-success-600" : t.tone === "error" ? "bg-danger-700" : "bg-brand-700")}>
              {t.tone === "success" ? <IconCheck size={14} /> : t.tone === "error" ? <IconAlert size={14} /> : <IconInfo size={14} />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx>
  );
}

export function useToast() {
  const t = useContext(ToastCtx);
  if (!t) throw new Error("useToast must be inside ToastProvider");
  return t;
}

/* ======================= Tabs với indicator chuyển động ======================= */

export function Tabs({ tabs, initial }: { tabs: { id: string; label: ReactNode; content: ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const baseId = useId();
  useLayoutEffect(() => {
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, tabs.length]);
  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        className="relative flex gap-1 overflow-x-auto border-b border-line"
        onKeyDown={(e) => {
          const i = tabs.findIndex((t) => t.id === active);
          const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : -1;
          if (next >= 0) {
            e.preventDefault();
            setActive(tabs[next]!.id);
            listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tabs[next]!.id}"]`)?.focus();
          }
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            data-tab={t.id}
            id={`${baseId}-${t.id}-tab`}
            aria-selected={active === t.id}
            aria-controls={`${baseId}-${t.id}-panel`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={cn("relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors", active === t.id ? "text-brand-800" : "text-ink-faint hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
        <span aria-hidden className="absolute bottom-0 h-0.5 rounded-full bg-brand-700 transition-all duration-[var(--duration-ui)] ease-[var(--ease-out-soft)]" style={{ left: indicator.left, width: indicator.width }} />
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${baseId}-${t.id}-panel`} aria-labelledby={`${baseId}-${t.id}-tab`} hidden={active !== t.id} className="animate-fade-in pt-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
