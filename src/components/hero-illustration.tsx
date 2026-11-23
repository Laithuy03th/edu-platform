import { IconCheck, IconNote, IconPlay, IconRepeat } from "./icons";
import { PauseOffscreen } from "./motion";

/**
 * Minh họa hero: giao diện học tập thu nhỏ dựng bằng HTML/CSS (không ảnh, không video).
 * Chỉ thể hiện tính năng có thật: player + ghi chú timestamp, ôn tập 1–3–7–14, tiến độ, rubric.
 * Chuyển động "float" tạm dừng khi ngoài viewport/tab ẩn; tắt khi reduced-motion.
 */
export function HeroIllustration() {
  return (
    <PauseOffscreen className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
      <div className="absolute inset-[8%] rounded-[2.5rem] bg-gradient-to-br from-brand-200/70 via-brand-100/60 to-transparent blur-2xl" aria-hidden />
      <p className="sr-only">Minh họa giao diện học: video bài học, ghi chú theo thời điểm, thẻ ôn tập và tiến độ khóa học.</p>

      {/* Lớp 1: player bài học */}
      <div aria-hidden className="absolute left-[4%] top-[8%] w-[78%] animate-scale-in rounded-[1.5rem] border border-line bg-surface p-3 shadow-lg [animation-delay:200ms]">
        <div className="relative aspect-video overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-ink via-[#2a1f22] to-brand-900">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_70%_30%,rgb(252_165_165/0.55),transparent_55%)]" />
          <div className="absolute left-4 top-4 space-y-1.5">
            <div className="h-2 w-28 rounded-full bg-white/70" />
            <div className="h-2 w-20 rounded-full bg-white/35" />
            <div className="mt-3 space-y-1 font-mono text-[10px] leading-4 text-brand-200/90">
              <p>{"export default async function Page() {"}</p>
              <p className="pl-3">{"const posts = await getPosts()"}</p>
              <p>{"}"}</p>
            </div>
          </div>
          <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-brand-700 shadow-lg animate-pulse-ring">
            <IconPlay size={20} />
          </span>
          <div className="absolute inset-x-4 bottom-3">
            <div className="relative h-1.5 rounded-full bg-white/25">
              <div className="h-full w-[42%] rounded-full bg-brand-300" />
              <span className="absolute left-[24%] top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500" />
              <span className="absolute left-[42%] top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pb-1 pt-3">
          <div>
            <p className="text-xs font-semibold text-ink">Bài 4 · Server Components</p>
            <p className="text-[11px] text-ink-faint">Next.js cơ bản · 4:12 / 9:58</p>
          </div>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800">Đang học</span>
        </div>
      </div>

      {/* Lớp 2: ghi chú theo timestamp */}
      <div aria-hidden className="absolute bottom-[14%] left-0 w-[52%] animate-fade-up [animation-delay:450ms]">
        <div className="animate-float rounded-[1.25rem] border border-line bg-surface p-3.5 shadow-lg">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <IconNote size={14} className="text-brand-600" /> Ghi chú của tôi
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="h-fit rounded-md bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-800">▶ 02:15</span>
              <p className="text-[11px] leading-4 text-ink">Server Component không gửi JS xuống trình duyệt</p>
            </div>
            <div className="flex gap-2">
              <span className="h-fit rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">▶ 03:48</span>
              <p className="text-[11px] leading-4 text-ink-soft">Dùng &quot;use client&quot; khi cần tương tác</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lớp 3: ôn tập câu sai */}
      <div aria-hidden className="absolute right-0 top-[2%] w-[40%] animate-fade-up [animation-delay:600ms]">
        <div className="animate-float-slow rounded-[1.25rem] border border-line bg-surface p-3.5 shadow-lg [animation-delay:-3s]">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <IconRepeat size={14} className="text-brand-600" /> Ôn tập hôm nay
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">
            3 <span className="text-xs font-semibold text-ink-faint">câu</span>
          </p>
          <div className="mt-2 flex items-center gap-1">
            {["1", "3", "7", "14"].map((d, i) => (
              <span key={d} className={`grid h-5 flex-1 place-items-center rounded-md text-[9px] font-bold ${i < 2 ? "bg-brand-700 text-white" : "bg-brand-100 text-brand-800"}`}>
                {d}n
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Lớp 4: tiến độ + rubric */}
      <div aria-hidden className="absolute bottom-[2%] right-[2%] w-[46%] animate-fade-up [animation-delay:750ms]">
        <div className="animate-float rounded-[1.25rem] border border-line bg-surface p-3.5 shadow-lg [animation-delay:-5s]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-ink-soft">Tiến độ khóa</p>
            <p className="text-xs font-bold text-brand-700">64%</p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-brand-400 to-brand-700" />
          </div>
          <ul className="mt-3 space-y-1.5">
            {["Có README rõ ràng", "Có trang lỗi 404", "Deploy được bản demo"].map((t, i) => (
              <li key={t} className="flex items-center gap-1.5 text-[11px] text-ink">
                <span className={`grid size-4 place-items-center rounded-full ${i < 2 ? "bg-success-600 text-white" : "border border-line-strong"}`}>{i < 2 ? <IconCheck size={10} /> : null}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PauseOffscreen>
  );
}
