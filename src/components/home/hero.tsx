import Link from "next/link";
import { codeToHtml } from "shiki";
import type { PlatformStats } from "@/modules/site/stats";
import { CountUp } from "../count-up";
import { PauseOffscreen } from "../motion";
import { IconArrowRight, IconCheck, IconNote, IconPlay, IconRepeat, IconRubric, IconSparkle, IconTerminal } from "../icons";
import { buttonClass, Container } from "../ui";

/* Đoạn code minh họa: đúng cú pháp Next.js App Router hiện hành (params là Promise từ Next 15). */
const HERO_CODE = `type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  return <CourseView course={course} />;
}`;

// Tô màu một lần cho mỗi tiến trình server (không lặp lại mỗi request).
let heroHtml: Promise<string> | null = null;
function heroCodeHtml() {
  heroHtml ??= codeToHtml(HERO_CODE, { lang: "tsx", theme: "github-dark-default" }).then((h) => {
    let n = 0;
    return h.replace(/<span class="line">/g, () => `<span class="line" style="--i:${n++}">`);
  });
  return heroHtml;
}

const JOURNEY = ["Hiểu khái niệm", "Đọc code", "Thực hành", "Nhận phản hồi", "Làm dự án"];

export async function HomeHero({ stats, teaching }: { stats: PlatformStats; teaching: string[] }) {
  const code = await heroCodeHtml();
  const ticker = teaching.length ? teaching : ["lập trình web"];
  const statItems = [
    { v: stats.courses, l: "khóa học đã duyệt" },
    { v: stats.lessons, l: "bài học" },
    { v: stats.videoMinutes, l: "phút video bài giảng" },
    { v: stats.quizzes, l: "bài quiz chấm tự động" },
  ].filter((s) => s.v > 0);

  return (
    <section className="hero-stage relative isolate overflow-hidden" aria-labelledby="hero-title">
      <PauseOffscreen className="pointer-events-none absolute inset-0 -z-10">
        <div aria-hidden className="absolute inset-0">
          <div className="hero-grid absolute inset-0" />
          <div className="hero-blob -right-24 top-10 size-[28rem] bg-brand-300" />
          <div className="hero-blob -left-32 top-64 size-[22rem] bg-rose-200 [animation-delay:-6s]" />
          <div className="hero-blob bottom-0 right-1/3 size-[18rem] bg-orange-200 [animation-delay:-11s]" />
        </div>
      </PauseOffscreen>

      <Container className="grid items-center gap-14 pb-14 pt-10 sm:pt-14 lg:min-h-[min(86vh,820px)] lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-20">
        <div className="stagger-in relative">
          <p style={{ "--i": 0 } as React.CSSProperties} className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 py-1 pl-1 pr-3.5 text-sm font-medium text-brand-800 shadow-xs backdrop-blur">
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">Mới</span>
            Bài học có video minh họa và code tô màu
          </p>
          <h1 id="hero-title" style={{ "--i": 1 } as React.CSSProperties} className="mt-6 font-display text-[clamp(2.5rem,4.8vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink">
            Hiểu sâu <span className="text-gradient-brand">từng dòng code</span>.
            <br className="hidden sm:block" /> Làm được dự án thật.
          </h1>
          <p style={{ "--i": 2 } as React.CSSProperties} className="mt-5 flex flex-wrap items-baseline gap-x-2 text-xl font-semibold text-ink-soft">
            <span>Đang dạy:</span>
            <span className="sr-only">{ticker.join(", ")}</span>
            <span aria-hidden className="ticker font-bold text-brand-700" style={{ "--ticker-dur": `${ticker.length * 2}s` } as React.CSSProperties}>
              {ticker.map((t, i) => (
                <span key={t} style={{ "--i": i } as React.CSSProperties}>
                  {t}
                </span>
              ))}
            </span>
          </p>
          <p style={{ "--i": 3 } as React.CSSProperties} className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
            Lộ trình tiếng Việt từ khái niệm tới dự án: bài đọc có code đọc được, video ngắn, quiz chấm ngay, lịch ôn câu sai và bài tập dự án có rubric.
          </p>
          <div style={{ "--i": 4 } as React.CSSProperties} className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className={buttonClass("primary", "group/btn shadow-cta", "lg")}>
              Bắt đầu học miễn phí <IconArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
            </Link>
            <Link href="/paths" className={buttonClass("outline", "bg-surface/80 backdrop-blur", "lg")}>
              Xem lộ trình
            </Link>
          </div>
          {statItems.length ? (
            <dl style={{ "--i": 5 } as React.CSSProperties} className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 border-t border-brand-100 pt-6 sm:grid-cols-4">
              {statItems.map((s) => (
                <div key={s.l}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-display text-3xl font-extrabold tracking-tight text-ink">
                    <CountUp value={s.v} />
                  </dd>
                  <dd className="mt-0.5 text-xs font-medium leading-snug text-ink-faint">{s.l}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {/* ---------- Minh họa "learning studio" (chỉ tính năng có thật) ---------- */}
        <PauseOffscreen className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
          <p className="sr-only">Minh họa: trình soạn code, terminal, thẻ quiz, ghi chú theo thời điểm video và rubric dự án.</p>
          <div aria-hidden className="studio-tilt relative pb-10 pt-6 sm:px-6">
            {/* Cửa sổ code */}
            <div className="layer-in overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0d1117] shadow-[0_40px_80px_-30px_rgb(127_29_29/0.55)]" style={{ "--d": "150ms" } as React.CSSProperties}>
              <div className="flex items-center gap-2 border-b border-white/5 bg-[#161b22] px-4 py-3">
                <span className="size-3 rounded-full bg-[#ff5f56]" />
                <span className="size-3 rounded-full bg-[#ffbd2e]" />
                <span className="size-3 rounded-full bg-[#27c93f]" />
                <span className="ml-3 rounded-md bg-white/5 px-2.5 py-1 font-mono text-xs text-[#c9d1d9]">app/courses/[slug]/page.tsx</span>
              </div>
              <div className="code-typing overflow-hidden px-5 py-4 text-[12.5px] leading-[1.7] sm:text-[13.5px] [&_pre]:!bg-transparent [&_pre]:font-mono" dangerouslySetInnerHTML={{ __html: code }} />
              <div className="border-t border-white/5 bg-black/30 px-5 py-3 font-mono text-[12px] leading-6 text-[#8b949e]">
                <p className="flex items-center gap-2 text-[#c9d1d9]">
                  <IconTerminal size={14} /> npm run dev
                </p>
                <p>
                  <span className="text-[#7ee787]">✓</span> Ready — <span className="text-[#79c0ff]">http://localhost:3000</span>
                </p>
                <p className="caret">
                  GET /courses/nextjs-co-ban <span className="text-[#7ee787]">200</span>
                </p>
              </div>
            </div>

            {/* Thẻ quiz */}
            <div className="layer-in absolute -bottom-6 -left-2 w-56 sm:-left-10" style={{ "--d": "650ms" } as React.CSSProperties}>
              <div className="float-a rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lg backdrop-blur">
                <p className="flex items-center justify-between text-[11px] font-semibold text-ink-faint">
                  <span>Kiểm tra nhanh · câu 2/5</span>
                  <span className="rounded-full bg-success-50 px-1.5 text-success-700">+1</span>
                </p>
                <p className="mt-1.5 text-[13px] font-semibold leading-snug text-ink">Từ Next.js 15, `params` trong page là gì?</p>
                <div className="mt-2 space-y-1 text-[12px]">
                  <p className="rounded-lg border border-line px-2 py-1 text-ink-soft">Object thường</p>
                  <p className="flex items-center justify-between rounded-lg border border-success-200 bg-success-50 px-2 py-1 font-semibold text-success-700">
                    Promise <IconCheck size={13} />
                  </p>
                </div>
              </div>
            </div>

            {/* Thẻ ghi chú theo thời điểm */}
            <div className="layer-in absolute -right-2 -top-2 w-60 sm:-right-6" style={{ "--d": "900ms" } as React.CSSProperties}>
              <div className="float-b rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lg backdrop-blur">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
                  <IconNote size={13} className="text-brand-600" /> Ghi chú của tôi
                </p>
                <p className="mt-2 flex gap-2 text-[12.5px] leading-snug text-ink">
                  <span className="inline-flex h-fit shrink-0 items-center gap-0.5 rounded-md bg-brand-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-800">
                    <IconPlay size={9} /> 02:14
                  </span>
                  Nhớ `await params` trước khi đọc slug
                </p>
              </div>
            </div>

            {/* Rubric dự án + ôn tập */}
            <div className="layer-in absolute -bottom-10 right-0 hidden w-64 sm:-right-8 sm:block" style={{ "--d": "1150ms" } as React.CSSProperties}>
              <div className="float-c rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lg backdrop-blur">
                <p className="flex items-center justify-between text-[11px] font-semibold text-ink-faint">
                  <span className="flex items-center gap-1.5">
                    <IconRubric size={13} className="text-brand-600" /> Rubric dự án
                  </span>
                  <span className="flex items-center gap-1 text-brand-700">
                    <IconRepeat size={12} /> ôn sau 3 ngày
                  </span>
                </p>
                {[
                  ["Routing đúng", 0.9],
                  ["Server/Client Component", 0.7],
                  ["Validate ở server", 0.55],
                ].map(([t, v], i) => (
                  <div key={t as string} className="mt-2">
                    <p className="text-[11.5px] font-medium text-ink">{t}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-50">
                      <div className="grow-x h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(v as number) * 100}%`, "--d": `${1500 + i * 200}ms` } as React.CSSProperties} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hành trình học: từng bước sáng lần lượt */}
          <div className="layer-in relative mt-12" style={{ "--d": "1300ms" } as React.CSSProperties}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
              <IconSparkle size={14} /> Một vòng học
            </p>
            <ol className="flex flex-wrap gap-1.5 xl:grid xl:grid-cols-5">
              {JOURNEY.map((s, i) => (
                <li key={s} className="journey-step whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-center text-xs font-semibold text-ink-soft" style={{ "--i": i } as React.CSSProperties}>
                  <span className="mr-1 opacity-60">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-brand-100" aria-hidden>
              <div className="journey-bar h-full w-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700" />
            </div>
          </div>
        </PauseOffscreen>
      </Container>
    </section>
  );
}
