import Link from "next/link";
import { HomeHero } from "@/components/home/hero";
import { GoalTabs } from "@/components/home/goal-tabs";
import { buildGoals, FeaturedEditorial, ProjectShowcase, TechMarquee } from "@/components/home/sections";
import { Reveal } from "@/components/motion";
import { safeLoad } from "@/components/safe-load";
import { IconArrowRight, IconClock, IconNote, IconRepeat, IconRoute, IconRubric, IconTarget } from "@/components/icons";
import { Container, EmptyState, Section, SectionHeading, buttonClass } from "@/components/ui";
import { listFeatured } from "@/modules/courses/catalog";
import { listFeaturedPaths } from "@/modules/learning-paths/service";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo";
import { getTechnologyDirectory } from "@/modules/technologies/service";
import { getPlatformStats, getProjectShowcase } from "@/modules/site/stats";

export const metadata = { alternates: { canonical: "/" } };

const STEPS = [
  { icon: <IconTarget size={20} />, title: "Đánh giá đầu vào", body: "Bài kiểm tra ngắn gợi ý chương nên học trước và chương chỉ cần ôn nhanh — theo quy tắc rõ ràng." },
  { icon: <IconClock size={20} />, title: "Học bài ngắn", body: "Bài đọc gọn, video vừa đủ. Tự lưu vị trí xem, quay lại là học tiếp." },
  { icon: <IconNote size={20} />, title: "Ghi chú tại chỗ", body: "Ghi đúng giây đang xem; bấm vào ghi chú để tua lại đoạn đó." },
  { icon: <IconRepeat size={20} />, title: "Quiz & ôn câu sai", body: "Chấm ngay, câu sai tự vào lịch ôn 1 → 3 → 7 → 14 ngày." },
  { icon: <IconRubric size={20} />, title: "Dự án có rubric", body: "Nộp link GitHub/demo, tự đánh giá rồi nhận phản hồi theo tiêu chí." },
];

const EMPTY_STATS = { courses: 0, lessons: 0, videoLessons: 0, videoMinutes: 0, quizzes: 0, projects: 0, technologies: 0 };

export default async function HomePage() {
  const [featured, paths, techDir, stats, project] = await Promise.all([
    safeLoad(() => listFeatured(), []),
    safeLoad(() => listFeaturedPaths(), []),
    safeLoad(() => getTechnologyDirectory(), { hubs: [], planned: [] }),
    safeLoad(() => getPlatformStats(), EMPTY_STATS),
    safeLoad(() => getProjectShowcase(), null),
  ]);
  const allTech = [...techDir.hubs, ...techDir.planned];
  const goals = buildGoals(featured, techDir.hubs, allTech);
  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <HomeHero stats={stats} teaching={techDir.hubs.map((h) => h.name)} />
      <TechMarquee hubs={techDir.hubs} planned={techDir.planned} />

      {/* ---------------- CHỌN MỤC TIÊU ---------------- */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Bắt đầu từ mục tiêu" title="Bạn muốn làm được gì?" description="Chọn hướng đi — chỉ hiện khóa học đã xuất bản; kỹ năng ghi “sắp có” đang được biên soạn và review." />
          </Reveal>
          <GoalTabs goals={goals} />
        </Container>
      </Section>

      {/* ---------------- KHÓA HỌC NỔI BẬT ---------------- */}
      <Section className="bg-surface">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Khóa học"
              title="Khóa học nổi bật"
              description="Đã qua duyệt nội dung, mỗi bài có video minh họa và bài đọc kèm code; học thử được vài bài trước khi đăng ký."
              action={
                <Link href="/courses" className={buttonClass("ghost")}>
                  Xem tất cả <IconArrowRight size={16} />
                </Link>
              }
            />
          </Reveal>
          {featured.length ? <FeaturedEditorial courses={featured} /> : <EmptyState title="Chưa có khóa học nào được xuất bản">Khóa học sẽ xuất hiện ở đây sau khi được quản trị viên duyệt.</EmptyState>}
        </Container>
      </Section>

      {/* ---------------- KHÁC BIỆT (bento) ---------------- */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Vì sao khác" title="Được thiết kế để bạn nhớ và làm được" description="Ba thói quen giúp kiến thức ở lại lâu hơn — đều có sẵn trong mỗi khóa học." />
          </Reveal>
          <Reveal group className="grid gap-5 md:grid-cols-6">
            <article className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface p-7 shadow-sm transition hover:shadow-md md:col-span-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-transform group-hover:-rotate-6">
                  <IconNote />
                </span>
                <h3 className="text-h3">Ghi chú theo thời điểm video</h3>
              </div>
              <p className="mt-3 max-w-lg text-ink-soft">Bấm “Lấy thời điểm hiện tại” để ghi đúng giây đang xem. Danh sách ghi chú là mục lục riêng của bạn — bấm vào là tua tới.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3" aria-hidden>
                {[
                  ["01:05", "useState chỉ chạy ở client"],
                  ["04:30", "fetch trong Server Component"],
                  ["07:12", "loading.tsx tạo Suspense"],
                ].map(([t, x]) => (
                  <div key={t} className="rounded-[var(--radius-md)] border border-line bg-canvas p-3 transition group-hover:border-brand-200">
                    <span className="rounded-md bg-brand-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-800">▶ {t}</span>
                    <p className="mt-2 text-sm text-ink">{x}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-md md:col-span-2">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 transition-transform group-hover:rotate-6">
                <IconRepeat />
              </span>
              <h3 className="text-h3 mt-4">Ôn tập câu sai</h3>
              <p className="mt-2 text-sm text-white/85">Câu trả lời sai tự vào lịch ôn theo quy tắc cố định. Trả lời đúng liên tiếp thì giãn dần.</p>
              <div className="mt-6 flex items-end gap-2" aria-hidden>
                {[1, 3, 7, 14].map((d, i) => (
                  <div key={d} className="flex-1 text-center">
                    <div className="mx-auto rounded-t-lg bg-white/25 transition-all duration-500 group-hover:bg-white/40" style={{ height: 18 + i * 16 }} />
                    <p className="mt-1 text-xs font-semibold">{d} ngày</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="group rounded-[var(--radius-xl)] border border-line bg-brand-50/60 p-7 md:col-span-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-surface text-brand-700 shadow-xs transition-transform group-hover:scale-110">
                <IconRubric />
              </span>
              <h3 className="text-h3 mt-4">Bài tập dự án có rubric</h3>
              <p className="mt-2 text-ink-soft">Tiêu chí rõ đạt/chưa đạt, tự đánh giá trước khi nộp, giảng viên phản hồi và có thể yêu cầu sửa.</p>
            </article>
            <article className="group rounded-[var(--radius-xl)] border border-line bg-surface p-7 md:col-span-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-transform group-hover:scale-110">
                <IconTarget />
              </span>
              <h3 className="text-h3 mt-4">Tự đánh giá mức độ hiểu</h3>
              <p className="mt-2 text-ink-soft">Học xong chưa chắc đã hiểu. Đánh dấu “Cần ôn” hay “Chưa hiểu” để quay lại đúng chỗ — tách khỏi tiến độ.</p>
            </article>
          </Reveal>
        </Container>
      </Section>


      {/* ---------------- DỰ ÁN TIÊU BIỂU ---------------- */}
      {project ? (
        <Section className="bg-surface">
          <Container>
            <ProjectShowcase p={project} />
          </Container>
        </Section>
      ) : null}

      {/* ---------------- CÁCH HỌC (timeline) ---------------- */}
      <Section className="bg-surface">
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <SectionHeading eyebrow="Cách học" title="Một vòng học trọn vẹn cho mỗi chương" description="Không cần làm đủ mọi bước — bạn có thể bỏ qua đánh giá đầu vào và học theo thứ tự thông thường." />
          </Reveal>
          <Reveal group as="ol" className="relative space-y-6 border-l-2 border-brand-100 pl-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[3.05rem] top-0 grid size-10 place-items-center rounded-full border-4 border-surface bg-brand-100 text-brand-700 shadow-xs">{s.icon}</span>
                <p className="text-caption text-brand-700">Bước {i + 1}</p>
                <p className="text-h3 mt-0.5">{s.title}</p>
                <p className="mt-1 text-ink-soft">{s.body}</p>
              </li>
            ))}
          </Reveal>
        </Container>
      </Section>

      {/* ---------------- LỘ TRÌNH ---------------- */}
      {paths.length ? (
        <Section>
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Lộ trình"
                title="Lộ trình theo mục tiêu"
                description="Ghép các khóa, chương và cột mốc theo thứ tự đề xuất. Thời gian ước tính lấy từ thời lượng bài học thật."
                action={
                  <Link href="/paths" className={buttonClass("ghost")}>
                    Mọi lộ trình <IconArrowRight size={16} />
                  </Link>
                }
              />
            </Reveal>
            <Reveal group className="grid gap-5 md:grid-cols-3">
              {paths.map((p) => (
                <Link key={p.id} href={`/paths/${p.slug}`} className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-transform group-hover:rotate-6">
                    <IconRoute />
                  </span>
                  <p className="text-h3 mt-4">{p.title}</p>
                  <p className="mt-1.5 line-clamp-3 text-sm text-ink-soft">{p.goal}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    {p.itemCount} mục <IconArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              ))}
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ---------------- CTA ---------------- */}
      <Section className="pb-4">
        <Container>
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 py-14 text-center text-white shadow-lg sm:px-12">
            <div className="bg-dots absolute inset-0 opacity-30" aria-hidden />
            <div className="absolute -left-20 -top-20 size-72 rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-h1">Bắt đầu buổi học đầu tiên hôm nay</h2>
              <p className="mt-3 text-white/85">Tạo tài khoản miễn phí, học thử vài bài, rồi quyết định khóa phù hợp với mục tiêu của bạn.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/register" className={buttonClass("outline", "border-transparent bg-white text-brand-800 hover:bg-brand-50", "lg")}>
                  Tạo tài khoản miễn phí
                </Link>
                <Link href="/courses" className={buttonClass("ghost", "text-white hover:bg-white/10 hover:text-white", "lg")}>
                  Xem khóa học
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
