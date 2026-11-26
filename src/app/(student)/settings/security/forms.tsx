"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "@/modules/users/actions";
import {
  changePasswordAction,
  logoutAllAction,
  requestSetPasswordAction,
  startGoogleLinkAction,
  unlinkGoogleAction,
} from "@/modules/auth/actions";
import { FormError } from "@/components/form-error";
import { PasswordInput } from "@/components/password-input";
import { Alert, Button, Field, Input } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";
import { Dialog, useConfirm, useToast } from "@/components/overlays";

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
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
      </Field>
      <Field id="newPassword" label="Mật khẩu mới" hint="Tối thiểu 12 ký tự." errors={fe.newPassword}>
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" required meter />
      </Field>
      <Field id="confirmPassword" label="Xác nhận mật khẩu mới" errors={fe.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
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
          <PasswordInput id="linkPassword" name="currentPassword" autoComplete="current-password" required />
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

/** Quyền với dữ liệu cá nhân: tải toàn bộ dữ liệu (JSON) và tự xóa tài khoản. */
export function DataPrivacyCard({ hasPassword, canDelete }: { hasPassword: boolean; canDelete: boolean }) {
  const router = useRouter();
  const a = useAction(deleteAccountAction);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const fe = a.fieldErrors;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-ink-soft">Tải mọi dữ liệu gắn với tài khoản: hồ sơ, khóa đã đăng ký, tiến độ, ghi chú, kết quả quiz, bài nộp, bản lưu playground… (tệp JSON).</p>
        <a href="/api/me/export" download className="mt-2 inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700">
          Tải dữ liệu của tôi (.json)
        </a>
      </div>
      <div className="border-t border-line pt-4">
        <p className="font-semibold text-ink">Xóa tài khoản</p>
        {canDelete ? (
          <>
            <p className="mt-1 text-ink-soft">Xóa vĩnh viễn ghi chú, tiến độ, kết quả quiz, bài nộp, bản lưu playground và liên kết đăng nhập. Đánh giá và hỏi đáp bạn đã đăng được giữ nhưng hiển thị là “Người dùng đã xóa”. Không hoàn tác được.</p>
            <Button variant="danger" className="mt-3" onClick={() => setOpen(true)}>
              Xóa tài khoản…
            </Button>
          </>
        ) : (
          <p className="mt-1 text-ink-soft">Tài khoản giảng viên/quản trị đang gắn với khóa học và quyền duyệt nên không tự xóa được — hãy liên hệ quản trị viên.</p>
        )}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Xóa vĩnh viễn tài khoản?" description="Nên tải dữ liệu của bạn trước khi xóa." size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            a.run(formToObject(e.currentTarget)).then((r) => {
              if (r?.ok) {
                setOpen(false);
                toast({ tone: "success", message: "Tài khoản của bạn đã được xóa. Cảm ơn bạn đã học cùng Tự Học." });
                router.replace("/");
                router.refresh();
              }
            });
          }}
        >
          <FormError error={a.error} />
          {hasPassword ? (
            <Field id="delete-password" label="Mật khẩu hiện tại" errors={fe.currentPassword}>
              <PasswordInput id="delete-password" name="currentPassword" autoComplete="current-password" required />
            </Field>
          ) : (
            <Field id="delete-email" label="Gõ email của tài khoản" errors={fe.confirmEmail}>
              <Input id="delete-email" name="confirmEmail" type="email" autoComplete="off" required />
            </Field>
          )}
          <Field id="delete-confirm" label="Gõ XÓA TÀI KHOẢN để xác nhận" errors={fe.confirmText}>
            <Input id="delete-confirm" name="confirmText" autoComplete="off" required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="danger" pending={a.pending}>
              Xóa vĩnh viễn
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
