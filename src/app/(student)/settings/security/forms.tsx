"use client";

import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  logoutAllAction,
  requestSetPasswordAction,
  startGoogleLinkAction,
  unlinkGoogleAction,
} from "@/modules/auth/actions";
import { FormError } from "@/components/form-error";
import { Alert, Button, Field, Input } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";
import { useConfirm } from "@/components/overlays";

export function ChangePasswordForm() {
  const a = useAction(changePasswordAction);
  const fe = a.fieldErrors;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        a.run(formToObject(form)).then((r) => r?.ok && form.reset());
      }}
    >
      <FormError error={a.error} />
      {a.data && !a.pending ? <Alert tone="success">{a.data.message}</Alert> : null}
      <Field id="currentPassword" label="Mật khẩu hiện tại" errors={fe.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field id="newPassword" label="Mật khẩu mới" hint="Tối thiểu 12 ký tự." errors={fe.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirmPassword" label="Xác nhận mật khẩu mới" errors={fe.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" pending={a.pending}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}

export function SetPasswordButton() {
  const a = useAction(requestSetPasswordAction);
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      {a.data ? <Alert tone="success">{a.data.message}</Alert> : null}
      <Button variant="outline" pending={a.pending} onClick={() => a.run({})}>
        Gửi liên kết đặt mật khẩu
      </Button>
    </div>
  );
}

export function LinkGoogleForm({ needsPassword }: { needsPassword: boolean }) {
  const a = useAction(startGoogleLinkAction);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(formToObject(e.currentTarget));
      }}
    >
      <FormError error={a.error} />
      {needsPassword ? (
        <Field id="linkPassword" label="Nhập lại mật khẩu để xác nhận" errors={a.fieldErrors.currentPassword}>
          <Input id="linkPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
      ) : null}
      <Button type="submit" variant="outline" pending={a.pending}>
        Liên kết Google
      </Button>
    </form>
  );
}

export function UnlinkGoogleButton() {
  const confirm = useConfirm();
  const router = useRouter();
  const a = useAction(unlinkGoogleAction, { onSuccess: () => router.refresh() });
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      <Button
        variant="outline"
        pending={a.pending}
        onClick={() => {
          void confirm({ title: "Hủy liên kết Google?", description: "Bạn sẽ không đăng nhập bằng Google được nữa cho tới khi liên kết lại.", confirmLabel: "Hủy liên kết" }).then((r) => {
            if (r.ok) void a.run({});
          });
        }}
      >
        Hủy liên kết Google
      </Button>
    </div>
  );
}

export function LogoutAllForm() {
  const confirm = useConfirm();
  const a = useAction(logoutAllAction);
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      <Button
        variant="danger"
        pending={a.pending}
        onClick={() => {
          void confirm({ title: "Đăng xuất tất cả thiết bị?", description: "Mọi phiên đăng nhập, kể cả thiết bị này, sẽ bị vô hiệu ngay.", confirmLabel: "Đăng xuất tất cả" }).then((r) => {
            if (r.ok) void a.run({});
          });
        }}
      >
        Đăng xuất tất cả thiết bị
      </Button>
    </div>
  );
}
