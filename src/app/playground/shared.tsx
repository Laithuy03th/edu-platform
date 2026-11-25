"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { deleteSnippetAction, getSnippetAction, listSnippetsAction, saveSnippetAction } from "@/modules/playground/actions";
import type { SnippetDto } from "@/modules/playground/service";
import { Dialog, Drawer, useConfirm, useToast } from "@/components/overlays";
import { Button, Input } from "@/components/ui";

/* ---------------- Khung chia đôi kéo được (chuột, cảm ứng, phím mũi tên) ---------------- */
export function SplitPane({ direction, first, second, storageKey, min = 20, initial = 50 }: { direction: "row" | "column"; first: ReactNode; second: ReactNode; storageKey: string; min?: number; initial?: number }) {
  const [pct, setPct] = useState(initial);
  const box = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const v = Number(localStorage.getItem(storageKey));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc tùy chọn đã lưu sau khi mount (localStorage không có ở server)
    if (v >= min && v <= 100 - min) setPct(v);
  }, [storageKey, min]);
  const commit = useCallback(
    (v: number) => {
      const c = Math.min(100 - min, Math.max(min, v));
      setPct(c);
      try {
        localStorage.setItem(storageKey, String(Math.round(c)));
      } catch {
        /* chế độ riêng tư */
      }
    },
    [storageKey, min],
  );
  return (
    <div ref={box} className={`flex min-h-0 min-w-0 ${direction === "row" ? "flex-row" : "flex-col"} h-full w-full ${dragging ? "select-none" : ""}`}>
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${pct}%`, flexGrow: 0, flexShrink: 0 }}>
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={direction === "row" ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={min}
        aria-valuemax={100 - min}
        aria-label="Kéo hoặc dùng phím mũi tên để đổi kích thước hai vùng"
        tabIndex={0}
        // Pointer capture: sự kiện kéo luôn về thanh chia, kể cả khi con trỏ đi qua iframe xem trước
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!dragging || !box.current) return;
          const r = box.current.getBoundingClientRect();
          commit(direction === "row" ? ((e.clientX - r.left) / r.width) * 100 : ((e.clientY - r.top) / r.height) * 100);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 3;
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            commit(pct - step);
          }
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            commit(pct + step);
          }
        }}
        className={`group relative z-10 shrink-0 bg-line transition-colors hover:bg-brand-300 focus-visible:bg-brand-500 focus-visible:outline-none ${direction === "row" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"}`}
      >
        <span aria-hidden className={`absolute rounded-full bg-ink-faint/40 group-hover:bg-brand-600 ${direction === "row" ? "left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2" : "left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2"}`} />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  );
}

/* ---------------- Thanh chọn loại playground ---------------- */
export function PlaygroundTabs({ current }: { current: "web" | "sql" | "python" }) {
  const tabs = [
    { k: "web", href: "/playground", label: "HTML · CSS · JS" },
    { k: "sql", href: "/playground/sql", label: "SQL" },
    { k: "python", href: "/playground/python", label: "Python" },
  ] as const;
  return (
    <nav aria-label="Loại playground" className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1 shadow-xs">
      {tabs.map((t) =>
        t.k === current ? (
          <span key={t.k} aria-current="page" className="rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white shadow-cta">
            {t.label}
          </span>
        ) : (
          <Link key={t.k} href={t.href} className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink-soft transition hover:bg-brand-50 hover:text-ink">
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}

/* ---------------- Lưu / mở bản lưu trong tài khoản ---------------- */
type Current = { id: string; title: string } | null;
export function SnippetsMenu({ kind, signedIn, loginNext, current, setCurrent, getFiles, onOpen }: { kind: "web" | "sql" | "python"; signedIn: boolean; loginNext: string; current: Current; setCurrent(c: Current): void; getFiles(): Record<string, string>; onOpen(s: SnippetDto): void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [askTitle, setAskTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [list, setList] = useState<{ id: string; title: string; updatedAt: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doSave = useCallback(
    async (id: string | null, t: string) => {
      setBusy(true);
      const r = await saveSnippetAction({ id, snippet: { kind, title: t, files: getFiles() } }).catch(() => null);
      setBusy(false);
      if (r?.ok) {
        setCurrent({ id: r.data.id, title: r.data.title });
        toast({ tone: "success", message: id ? "Đã lưu thay đổi." : "Đã lưu vào tài khoản." });
        setAskTitle(false);
      } else toast({ tone: "error", message: r && !r.ok ? (r.error.fieldErrors?.["snippet.files"]?.[0] ?? r.error.message) : "Không kết nối được máy chủ." });
    },
    [getFiles, kind, setCurrent, toast],
  );

  // Ctrl+S trong editor gọi window event này
  useEffect(() => {
    const h = () => {
      if (!signedIn) return toast({ tone: "info", message: "Đăng nhập để lưu vào tài khoản. Bản nháp vẫn được tự lưu trên máy này." });
      if (current) void doSave(current.id, current.title);
      else setAskTitle(true);
    };
    window.addEventListener("playground:save", h);
    return () => window.removeEventListener("playground:save", h);
  }, [current, doSave, signedIn, toast]);

  if (!signedIn) {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent(loginNext)}`} className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold text-ink-soft hover:border-brand-300">
        Đăng nhập để lưu
      </Link>
    );
  }
  return (
    <>
      <Button size="sm" variant="outline" pending={busy} onClick={() => (current ? void doSave(current.id, current.title) : (setTitle(""), setAskTitle(true)))}>
        {current ? "Lưu" : "Lưu vào tài khoản"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          setOpen(true);
          const r = await listSnippetsAction({ kind }).catch(() => null);
          setList(r?.ok ? r.data : []);
        }}
      >
        Bản lưu của tôi
      </Button>
      <Dialog
        open={askTitle}
        onClose={() => setAskTitle(false)}
        title="Lưu vào tài khoản"
        description="Bản lưu là riêng tư — chỉ bạn xem được, mở lại trên mọi thiết bị khi đăng nhập."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAskTitle(false)}>
              Hủy
            </Button>
            <Button pending={busy} disabled={!title.trim()} onClick={() => void doSave(null, title)}>
              Lưu
            </Button>
          </>
        }
      >
        <label htmlFor="snippet-title" className="text-sm font-semibold">
          Tên bản lưu
        </label>
        <Input id="snippet-title" className="mt-1.5" value={title} maxLength={80} autoFocus onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && void doSave(null, title)} />
      </Dialog>
      <Drawer open={open} onClose={() => setOpen(false)} title="Bản lưu của tôi">
        {list === null ? (
          <p className="text-sm text-ink-faint">Đang tải…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-ink-soft">Chưa có bản lưu nào. Bấm “Lưu vào tài khoản” hoặc Ctrl+S.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id} className={`flex items-center gap-2 rounded-[var(--radius-md)] border p-3 ${current?.id === s.id ? "border-brand-300 bg-brand-50" : "border-line"}`}>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={async () => {
                    const r = await getSnippetAction({ id: s.id }).catch(() => null);
                    if (r?.ok) {
                      onOpen(r.data);
                      setCurrent({ id: r.data.id, title: r.data.title });
                      setOpen(false);
                      toast({ tone: "success", message: `Đã mở “${r.data.title}”.` });
                    }
                  }}
                >
                  <span className="block truncate font-semibold text-ink">{s.title}</span>
                  <span className="text-xs text-ink-faint">{new Date(s.updatedAt).toLocaleString("vi-VN")}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Xóa ${s.title}`}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-danger-700 hover:bg-danger-50"
                  onClick={async () => {
                    if (!(await confirm({ title: `Xóa “${s.title}”?`, description: "Không khôi phục được.", tone: "danger", confirmLabel: "Xóa" })).ok) return;
                    const r = await deleteSnippetAction({ id: s.id }).catch(() => null);
                    if (r?.ok) {
                      setList((l) => (l ?? []).filter((x) => x.id !== s.id));
                      if (current?.id === s.id) setCurrent(null);
                    }
                  }}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}

/* ---------------- Tiến độ thử thách (localStorage của máy người học) ---------------- */
const PROGRESS_KEY = "tuhoc:challenges:v1";
export function useChallengeProgress() {
  const [done, setDone] = useState<Record<string, true>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc tiến độ đã lưu sau khi mount
      setDone(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}"));
    } catch {
      /* dữ liệu hỏng → bỏ qua */
    }
  }, []);
  const mark = useCallback((id: string) => {
    setDone((d) => {
      const n = { ...d, [id]: true as const };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(n));
      } catch {
        /* chế độ riêng tư */
      }
      return n;
    });
  }, []);
  return { done, mark };
}

/** Tải dữ liệu thành file (xuất .html/.sql/.csv/.sqlite) — chạy hoàn toàn ở trình duyệt. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadText(filename: string, text: string, type = "text/plain") {
  downloadBlob(filename, new Blob([text], { type: `${type};charset=utf-8` }));
}

/** Màn hình hẹp hơn `px` (vd điện thoại): xếp chồng editor và kết quả theo chiều dọc. Server render coi là rộng. */
export function useIsNarrow(px = 768) {
  const q = `(max-width: ${px - 1}px)`;
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}

/** CSV chuẩn RFC 4180 + BOM để Excel đọc đúng tiếng Việt. */
export function toCsv(columns: string[], rows: unknown[][]) {
  const esc = (v: unknown) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + [columns, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
