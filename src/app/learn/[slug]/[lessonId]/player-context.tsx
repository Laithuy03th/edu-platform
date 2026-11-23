"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode, type RefObject } from "react";

type PlayerApi = {
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTime: () => number | null;
  seek: (seconds: number) => boolean;
};

const Ctx = createContext<PlayerApi | null>(null);

/** Chia sẻ player giữa trình phát và panel ghi chú (ghi chú theo timestamp, click để tua). */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentTime = useCallback(() => (videoRef.current && videoRef.current.readyState > 0 ? videoRef.current.currentTime : null), []);
  const seek = useCallback((s: number) => {
    const v = videoRef.current;
    // Không tự tải video chỉ vì bấm ghi chú trong chế độ tiết kiệm dữ liệu: chỉ tua khi video đã được tải.
    if (!v || !v.currentSrc) return false;
    v.currentTime = s;
    v.scrollIntoView({ behavior: "smooth", block: "center" });
    void v.play().catch(() => {});
    return true;
  }, []);
  return <Ctx value={{ videoRef, currentTime, seek }}>{children}</Ctx>;
}

export function usePlayer(): PlayerApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be inside PlayerProvider");
  return v;
}
