"use client";

import { useEffect, useRef } from "react";

/**
 * Số đếm tăng dần khi vào viewport. HTML server đã có SỐ THẬT (không JS/bot vẫn đọc đúng);
 * client chỉ chạy hiệu ứng một lần, bỏ qua khi reduced-motion.
 */
export function CountUp({ value, durationMs = 1100 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const fmt = new Intl.NumberFormat("vi-VN");
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / durationMs);
        el.textContent = fmt.format(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);
  return (
    <span ref={ref} className="tabular-nums">
      {new Intl.NumberFormat("vi-VN").format(value)}
    </span>
  );
}
