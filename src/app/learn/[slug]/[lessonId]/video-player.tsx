"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlaybackSourceAction } from "@/modules/media/actions";
import { saveProgressAction } from "@/modules/learning/actions";
import { Alert, Button } from "@/components/ui";
import { fmtClock, type Chapter } from "@/lib/transcript";
import { usePlayer } from "./player-context";

const SAVE_EVERY_MS = 30_000;
const MIN_DELTA_SECONDS = 5;

function fmtBytes(b: number) {
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MiB`;
}

type Props = {
  lessonId: string;
  media: { status: "ready" | "missing" | "removed"; bytes: number; durationSeconds: number; posterUrl: string | null };
  initialSrc: string | null;
  initialError: string | null;
  resumeAt: number;
  canTrack: boolean;
  dataSaver: boolean;
  transcriptAvailable: boolean;
  chapters?: Chapter[];
  captionsVtt?: string | null;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Trình phát video (§9.1, §16.5): không autoplay, preload="none", chế độ tiết kiệm dữ liệu chỉ tải khi bấm.
 * Autosave ~30 giây khi có thay đổi ≥ 5 giây; thêm khi pause/kết thúc; beacon khi ẩn tab (best effort).
 */
export function VideoPlayer({ lessonId, media, initialSrc, initialError, resumeAt, canTrack, dataSaver, transcriptAvailable, chapters = [], captionsVtt }: Props) {
  const { videoRef } = usePlayer();
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const lastSaved = useRef<{ pos: number; at: number }>({ pos: resumeAt, at: 0 });
  const resumed = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [now, setNow] = useState(0);
  // Phụ đề do giảng viên cung cấp (đã validate ở server) → blob URL cho <track> (CSP media-src có blob:)
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!captionsVtt) return;
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: "text/vtt" }));
    // blob: chỉ tạo được trên trình duyệt sau khi mount (không render ở server) → setState trong effect là chủ đích.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captionsVtt]);
  const activeChapter = chapters.reduce((a, c, i) => (c.start <= now + 0.5 ? i : a), -1);

  function seekTo(t: number) {
    const v = videoRef.current;
    if (v && src) {
      v.currentTime = t;
      void v.play().catch(() => {});
    } else {
      pendingSeek.current = t;
      void load();
    }
  }

  const save = useCallback(
    async (force = false) => {
      const v = videoRef.current;
      if (!canTrack || !v || !Number.isFinite(v.currentTime)) return;
      const pos = v.currentTime;
      const moved = Math.abs(pos - lastSaved.current.pos) >= MIN_DELTA_SECONDS;
      if (!force && (!moved || Date.now() - lastSaved.current.at < SAVE_EVERY_MS)) return;
      if (!moved && !force) return;
      lastSaved.current = { pos, at: Date.now() };
      setSaveState("saving");
      const r = await saveProgressAction({ lessonId, positionSeconds: pos, clientAt: Date.now() }).catch(() => null);
      setSaveState(r?.ok ? "idle" : "error");
    },
    [canTrack, lessonId, videoRef],
  );

  // Beacon khi rời trang/ẩn tab — không đảm bảo luôn tới server.
  useEffect(() => {
    if (!canTrack) return;
    const onHide = () => {
      const v = videoRef.current;
      if (document.visibilityState !== "hidden" || !v || !v.currentSrc) return;
      if (Math.abs(v.currentTime - lastSaved.current.pos) < 1) return;
      lastSaved.current = { pos: v.currentTime, at: Date.now() };
      navigator.sendBeacon?.("/api/progress", new Blob([JSON.stringify({ lessonId, positionSeconds: v.currentTime, clientAt: Date.now() })], { type: "text/plain" }));
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [canTrack, lessonId, videoRef]);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await getPlaybackSourceAction({ lessonId }).catch(() => null);
    setLoading(false);
    if (r?.ok) setSrc(r.data.url);
    else setError(r?.error.message ?? "Không tải được video. Kiểm tra mạng và thử lại.");
  }

  if (media.status !== "ready") {
    return (
      <Alert tone="warning" title={media.status === "removed" ? "Video đã bị gỡ" : "Video chưa sẵn sàng"}>
        {transcriptAvailable ? "Bạn vẫn có thể học qua transcript bên dưới." : "Vui lòng quay lại sau."}
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg bg-black">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={media.posterUrl ?? undefined}
            controls
            preload="none"
            playsInline
            className="aspect-video w-full"
            aria-label="Video bài học"
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = speed;
              if (pendingSeek.current !== null) {
                e.currentTarget.currentTime = pendingSeek.current;
                pendingSeek.current = null;
              } else if (!resumed.current && resumeAt > 3 && resumeAt < (e.currentTarget.duration || Infinity) - 3) {
                e.currentTarget.currentTime = resumeAt;
              }
              resumed.current = true;
            }}
            onTimeUpdate={(e) => {
              setNow(e.currentTarget.currentTime);
              void save(false);
            }}
            onPause={() => void save(true)}
            onEnded={() => void save(true)}
            onError={() => setError("Trình duyệt không phát được video này (mạng lỗi hoặc liên kết không còn hiệu lực).")}
          >
            {trackUrl ? <track kind="captions" srcLang="vi" label="Tiếng Việt" src={trackUrl} /> : null}
          </video>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-ink p-4 text-center text-white">
            {media.posterUrl && !dataSaver ? <img src={media.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
            <p className="relative text-sm">
              Video ~{fmtBytes(media.bytes)} · {Math.round(media.durationSeconds / 60)} phút
              {dataSaver ? " · Chế độ tiết kiệm dữ liệu đang bật" : ""}
            </p>
            <Button className="relative" pending={loading} onClick={load}>
              ▶ Tải và phát video
            </Button>
          </div>
        )}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <label htmlFor={`speed-${lessonId}`}>Tốc độ</label>
        <select
          id={`speed-${lessonId}`}
          value={speed}
          onChange={(e) => {
            const s = Number(e.target.value);
            setSpeed(s);
            if (videoRef.current) videoRef.current.playbackRate = s;
          }}
          className="h-8 rounded-full border border-line bg-surface px-2 text-xs"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s === 1 ? "Bình thường" : `${String(s).replace(".", ",")}×`}
            </option>
          ))}
        </select>
        {captionsVtt ? <span className="rounded-full bg-surface-muted px-2 py-0.5">Có phụ đề (nút CC)</span> : null}
      </div>
      {chapters.length ? (
        <nav aria-label="Mục lục video" className="rounded-[var(--radius-md)] border border-line bg-surface">
          <p className="border-b border-line px-4 py-2 text-xs font-semibold text-ink-soft">Mục lục video</p>
          <ol className="max-h-56 overflow-auto py-1">
            {chapters.map((c, i) => (
              <li key={c.start}>
                <button
                  type="button"
                  onClick={() => seekTo(c.start)}
                  aria-current={i === activeChapter ? "true" : undefined}
                  className={`flex w-full items-baseline gap-3 px-4 py-1.5 text-left text-sm transition hover:bg-brand-50 ${i === activeChapter ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-soft"}`}
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-ink-faint">{fmtClock(c.start)}</span>
                  <span className="min-w-0 truncate">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <p className="text-xs text-ink-faint" aria-live="polite">
        {canTrack
          ? saveState === "saving"
            ? "Đang lưu vị trí xem…"
            : saveState === "error"
              ? "Chưa lưu được vị trí xem (sẽ thử lại)."
              : resumeAt > 3
                ? `Tiếp tục từ ${Math.floor(resumeAt / 60)}:${String(Math.floor(resumeAt % 60)).padStart(2, "0")}`
                : ""
          : "Đăng ký khóa học để lưu vị trí xem."}
      </p>
    </div>
  );
}
