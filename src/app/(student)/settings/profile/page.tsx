import { requireViewer } from "@/server/auth";
import { getProfile, myInstructorApplication } from "@/modules/users/service";
import { Card } from "@/components/ui";
import { InstructorApplyForm, ProfileForm, PublicProfileForm } from "./forms";

export const metadata = { title: "Hồ sơ" };

const TIMEZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"];

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer();
  const profile = await getProfile(viewer.id);
  const application = await myInstructorApplication(viewer.id);
  const timezones = TIMEZONES.includes(profile.timezone) ? TIMEZONES : [profile.timezone, ...TIMEZONES];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Thông tin cá nhân</h2>
        <ProfileForm profile={profile} timezones={timezones} />
      </Card>
      <div className="space-y-6">
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Hồ sơ thành quả công khai</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Mặc định riêng tư. Khi bật, chỉ các khóa đã hoàn thành và dự án bạn chọn mới hiển thị — không có email, ghi chú hay điểm chi tiết.
          </p>
          <PublicProfileForm enabled={profile.publicProfile.enabled} handle={profile.publicProfile.handle ?? ""} emailVerified={profile.emailVerified} />

        </Card>
        {!profile.roles.includes("instructor") ? (
          <Card>
            <h2 className="mb-1 text-lg font-semibold">Trở thành giảng viên</h2>
            <p className="mb-4 text-sm text-ink-soft">
              Giảng viên được tạo khóa học và tải lên media trong hạn mức. Quyền này do quản trị viên duyệt.
            </p>
            <InstructorApplyForm
              status={application?.status ?? null}
              reason={application?.decisionReason ?? null}
              emailVerified={profile.emailVerified}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
