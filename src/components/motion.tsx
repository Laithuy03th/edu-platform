"use client";

import { useEffect, useRef, type ComponentProps, type ElementType, type ReactNode } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveal khi vào viewport — CHỈ MỘT LẦN, không lặp khi cuộn lại.
 * Phần tử đang trong màn hình lúc mount không bị ẩn (không nhấp nháy); không JS → luôn hiển thị.
 */
export function Reveal({ as, group, children, className, delayIndex, ...rest }: { as?: ElementType; group?: boolean; children: ReactNode; className?: string; delayIndex?: number } & Omit<ComponentProps<"div">, "children">) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = (as ?? "div") as ElementType;
  const attr = group ? "data-reveal-group" : "data-reveal";
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !("IntersectionObserver" in window)) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // đã trong viewport: giữ nguyên
    el.setAttribute(attr, "hidden");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.setAttribute(attr, "shown");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [attr]);
  return (
    <Tag ref={ref} className={className} style={delayIndex !== undefined ? ({ "--i": delayIndex } as React.CSSProperties) : undefined} {...rest}>
      {children}
    </Tag>
  );
}

/** Tạm dừng animation trang trí khi ngoài viewport hoặc tab ẩn (tiết kiệm CPU/pin). */
export function PauseOffscreen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = true;
    const apply = () => el.setAttribute("data-paused", String(!visible || document.hidden));
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      apply();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Đặt data-scrolled trên header khi cuộn (nền mờ + bóng nhẹ), dùng passive listener + rAF. */
export function ScrollState({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => el.setAttribute("data-scrolled", String(window.scrollY > 8)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div ref={ref} className={className} data-scrolled="false">
      {children}
    </div>
  );
}
