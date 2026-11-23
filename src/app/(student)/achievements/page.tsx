import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { myAchievements } from "@/modules/achievements/service";
import { getProfile } from "@/modules/users/service";
import { formatDate } from "@/lib/time";
import { IconCheck, IconRubric, IconSparkle } from "@/components/icons";
import { Alert, Badge, Container, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { VisibilityToggle } from "./toggle";

export const metadata = { title: "Hồ sơ thành quả" };

export default async function AchievementsPage() {
  const viewer = await requireViewer();
  const [a, profile] = await Promise.all([myAchievements(viewer), getProfile(viewer.id)]);
  const publicUrl = profile.publicProfile.enabled && profile.publicProfile.handle ? `/u/${profile.publicProfile.handle}` : null;
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader
        title="Hồ sơ thành quả"
        description="Kỹ năng ở đây là kỹ năng đã thực hành qua dự án — không phải chứng nhận kiểm định."
        actions={
          publicUrl ? (
            <Link href={publicUrl} className={buttonClass("outline")}>
              Xem hồ sơ công khai
            </Link>
          ) : (
            <Link href="/settings/profile" className={buttonClass("soft")}>
              Bật hồ sơ công khai
            </Link>
          )
        }
      />
      <Alert tone="info" className="mb-8">
        Mặc định mọi mục đều riêng tư. Bật công tắc “Hiển thị công khai” cho từng khóa/dự án bạn muốn chia sẻ. Hồ sơ công khai không có email, điểm chi tiết hay ghi chú.
      </Alert>

      {a.skills.length ? (
        <section className="mb-10">
          <h2 className="text-h3 mb-3">Kỹ năng đã thực hành</h2>
          <div className="flex flex-wrap gap-2">
            {a.skills.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">
                <IconSparkle size={14} /> {s.name} <span className="text-brand-600">×{s.count}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3 mb-3">Khóa học đã hoàn thành</h2>
          {a.courses.length === 0 ? (
            <EmptyState icon={<IconCheck />} title="Chưa hoàn thành khóa nào" />
          ) : (
            <ul className="space-y-3">
              {a.courses.map((c) => (
                <li key={c.enrollmentId} className="flex items-center gap-4 rounded-[var(--radius-md)] border border-line bg-surface p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-600 text-white">
                    <IconCheck size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.title}</p>
                    <p className="text-xs text-ink-faint">Hoàn thành {formatDate(c.completedAt, viewer.timezone)}</p>
                  </div>
                  <VisibilityToggle kind="course" id={c.enrollmentId} initial={c.showOnProfile} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-h3 mb-3">Dự án đã đạt</h2>
          {a.projects.length === 0 ? (
            <EmptyState icon={<IconRubric />} title="Chưa có dự án được đánh giá đạt" />
          ) : (
            <ul className="space-y-3">
              {a.projects.map((p) => (
                <li key={p.id} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.skills.map((s) => (
                          <Badge key={s} tone="brand">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {p.score ? <span className="text-sm font-bold tabular-nums">{p.score}</span> : null}
                    <VisibilityToggle kind="project" id={p.id} initial={p.showOnProfile} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}
