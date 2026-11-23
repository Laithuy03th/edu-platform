"use client";

import { useRouter } from "next/navigation";
import { applyInstructorAction, updateProfileAction, updatePublicProfileAction } from "@/modules/users/actions";
import { FormError } from "@/components/form-error";
import { Alert, Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";

type Profile = { email: string; displayName: string; bio: string; timezone: string; learningGoal: string; dataSaver: boolean };

export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const router = useRouter();
  const a = useAction(updateProfileAction, { onSuccess: () => router.refresh() });
  const fe = a.fieldErrors;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = formToObject(e.currentTarget);
        a.run({ ...data, dataSaver: data.dataSaver === "on" });
      }}
    >
      <FormError error={a.error} />
      {a.data && !a.pending ? <Alert tone="success">{a.data.message}</Alert> : null}
      <Field id="email" label="Email" hint="Email chỉ đọc trong phiên bản này.">
        <Input id="email" value={profile.email} readOnly disabled />
      </Field>
      <Field id="displayName" label="Tên hiển thị" errors={fe.displayName}>
        <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={60} required />
      </Field>
      <Field id="bio" label="Giới thiệu ngắn" errors={fe.bio}>
        <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={500} rows={3} />
      </Field>
      <Field id="learningGoal" label="Mục tiêu học tập" errors={fe.learningGoal}>
        <Input id="learningGoal" name="learningGoal" defaultValue={profile.learningGoal} maxLength={200} placeholder="Ví dụ: làm được web app Next.js trong 3 tháng" />
      </Field>
      <Field id="timezone" label="Múi giờ" errors={fe.timezone}>
        <Select id="timezone" name="timezone" defaultValue={profile.timezone}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-start gap-3 rounded-md border border-line p-3">
        <input type="checkbox" name="dataSaver" defaultChecked={profile.dataSaver} className="mt-1 size-4" />
        <span>
          <span className="block text-sm font-medium">Chế độ tiết kiệm dữ liệu</span>
          <span className="block text-xs text-ink-soft">
            Không tải video cho tới khi bạn bấm phát, hiển thị dung lượng ước tính trước, ưu tiên bài đọc và transcript.
          </span>
        </span>
      </label>
      <Button type="submit" pending={a.pending}>
        Lưu hồ sơ
      </Button>
    </form>
  );
}

export function PublicProfileForm({ enabled, handle, emailVerified }: { enabled: boolean; handle: string; emailVerified: boolean }) {
  const router = useRouter();
  const a = useAction(updatePublicProfileAction, { onSuccess: () => router.refresh() });
  if (!emailVerified) return <Alert tone="warning">Cần xác minh email trước khi bật hồ sơ công khai.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = formToObject(e.currentTarget);
        a.run({ enabled: data.enabled === "on", handle: data.handle ?? "" });
      }}
    >
      <FormError error={a.error} />
      {a.data && !a.pending ? <Alert tone="success">{a.data.message}</Alert> : null}
      <Field id="handle" label="Đường dẫn hồ sơ" hint="Ví dụ: nguyen-van-a → /u/nguyen-van-a" errors={a.fieldErrors.handle}>
        <Input id="handle" name="handle" defaultValue={handle} pattern="[a-z0-9-]{3,30}" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" /> Bật hồ sơ công khai
      </label>
      <Button type="submit" variant="outline" pending={a.pending}>
        Lưu tùy chọn
      </Button>
      {enabled && handle ? (
        <p className="text-sm">
          Xem tại{" "}
          <a className="text-brand-700 underline" href={`/u/${handle}`}>
            /u/{handle}
          </a>
        </p>
      ) : null}
    </form>
  );
}

export function InstructorApplyForm({ status, reason, emailVerified }: { status: string | null; reason: string | null; emailVerified: boolean }) {
  const router = useRouter();
  const a = useAction(applyInstructorAction, { onSuccess: () => router.refresh() });
  if (status === "pending") return <Badge tone="info">Đơn của bạn đang chờ duyệt</Badge>;
  if (!emailVerified) return <Alert tone="warning">Cần xác minh email trước khi gửi đơn.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(formToObject(e.currentTarget));
      }}
    >
      {status === "rejected" ? <Alert tone="warning" title="Đơn trước bị từ chối">{reason}</Alert> : null}
      <FormError error={a.error} />
      <Field id="motivation" label="Bạn muốn dạy gì và vì sao?" hint="50–2000 ký tự." errors={a.fieldErrors.motivation}>
        <Textarea id="motivation" name="motivation" rows={4} minLength={50} maxLength={2000} required />
      </Field>
      <Field id="sampleUrl" label="Link minh họa (không bắt buộc)" errors={a.fieldErrors.sampleUrl}>
        <Input id="sampleUrl" name="sampleUrl" type="url" placeholder="https://" />
      </Field>
      <Button type="submit" variant="outline" pending={a.pending}>
        Gửi đơn
      </Button>
    </form>
  );
}
