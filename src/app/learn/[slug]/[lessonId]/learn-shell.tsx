"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";

const FOCUS_KEY = "tuhoc.focus";
const FOCUS_EVENT = "tuhoc:focus-change";
function subscribeFocus(cb: () => void) {
  window.addEventListener(FOCUS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(FOCUS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
import { IconCheck, IconLayout, IconLock, IconMenu, IconPlay } from "@/components/icons";
import { Drawer } from "@/components/overlays";
import { cn } from "@/components/ui";

type Outline = {
  id: string;
  title: string;
  lessons: { id: string; title: string; type: string; isPreview: boolean; completed: boolean; current: boolean; locked: boolean }[];
}[];

function OutlineNav({ outline, slug }: { outline: Outline; slug: string }) {
  return (
    <nav aria-label="Mục lục khóa học" className="space-y-5">
      {outline.map((ch, i) => (
        <div key={ch.id}>
          <p className="text-caption mb-1.5 px-2 text-ink-faint">
            Chương {i + 1} · {ch.title}
          </p>
          <ul className="space-y-0.5">
            {ch.lessons.map((l) =>
              l.locked ? (
                <li key={l.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-ink-faint">
                  <IconLock size={15} />
                  <span className="flex-1">{l.title}</span>
                </li>
              ) : (
                <li key={l.id}>
                  <Link
                    href={`/learn/${slug}/${l.id}`}
                    aria-current={l.current ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition",
                      l.current ? "bg-brand-100 font-semibold text-brand-900" : "text-ink-soft hover:bg-brand-50 hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition",
                        l.completed ? "border-success-600 bg-success-600 text-white" : l.current ? "border-brand-700 bg-surface" : "border-line-strong bg-surface",
                      )}
                    >
                      {l.completed ? <IconCheck size={12} /> : l.current ? <span className="size-2 rounded-full bg-brand-700" /> : null}
                    </span>
                    <span className="sr-only">{l.completed ? "Đã hoàn thành:" : l.current ? "Đang học:" : ""}</span>
                    <span className="min-w-0 flex-1 leading-snug">{l.title}</span>
                    {l.type === "video" ? <IconPlay size={12} className="shrink-0 text-ink-faint" aria-label="video" /> : null}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Khung trang học: sidebar (desktop) có thể thu gọn = chế độ tập trung; mục lục là drawer trên mobile. */
export function LearnShell({ outline, slug, topBar, children }: { outline: Outline; slug: string; topBar: ReactNode; children: ReactNode }) {
  // Tùy chọn "chế độ tập trung" lưu trong localStorage, đọc qua useSyncExternalStore (không lệch hydrate).
  const focus = useSyncExternalStore(subscribeFocus, () => localStorage.getItem(FOCUS_KEY) === "1", () => false);
  const [drawer, setDrawer] = useState(false);
  const toggle = () => {
    localStorage.setItem(FOCUS_KEY, focus ? "0" : "1");
    window.dispatchEvent(new Event(FOCUS_EVENT));
  };
  return (
    <>
      <div className="sticky top-14 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-brand-50 lg:hidden" aria-label="Mở mục lục">
            <IconMenu size={20} />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={focus}
            className="hidden size-9 place-items-center rounded-full text-ink-soft transition hover:bg-brand-50 aria-pressed:bg-brand-100 aria-pressed:text-brand-800 lg:grid"
            aria-label={focus ? "Tắt chế độ tập trung (hiện mục lục)" : "Chế độ tập trung (ẩn mục lục)"}
            title={focus ? "Hiện mục lục" : "Chế độ tập trung"}
          >
            <IconLayout size={19} />
          </button>
          <div className="min-w-0 flex-1">{topBar}</div>
        </div>
      </div>
      <div className={cn("mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:transition-[grid-template-columns] lg:duration-300", focus ? "lg:grid-cols-[0px_1fr]" : "lg:grid-cols-[300px_1fr]")}>
        <aside className={cn("hidden lg:block", focus && "invisible")} aria-hidden={focus || undefined}>
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-2">
            <OutlineNav outline={outline} slug={slug} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Mục lục khóa học" side="left">
        <div onClick={(e) => (e.target as HTMLElement).closest("a") && setDrawer(false)}>
          <OutlineNav outline={outline} slug={slug} />
        </div>
      </Drawer>
    </>
  );
}
