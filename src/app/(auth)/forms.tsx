"use client";

import Link from "next/link";
import { useState } from "react";
import {
  forgotPasswordAction,
  googleLoginAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/modules/auth/actions";
import { FormError } from "@/components/form-error";
import { PasswordInput } from "@/components/password-input";
import { IconGoogle } from "@/components/icons";
import { Alert, Button, Field, Input } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";

function aria(id: string, errors?: string[]) {
  return { id, name: id, "aria-invalid": errors?.length ? true : undefined, "aria-describedby": errors?.length ? `${id}-error` : undefined };
}

export function LoginForm({ callbackUrl, googleEnabled }: { callbackUrl?: string; googleEnabled: boolean }) {
  const login = useAction(loginAction);
  const google = useAction(googleLoginAction);
  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          login.run({ ...formToObject(e.currentTarget), callbackUrl });
        }}
      >
        <FormError error={login.error} />
        <Field id="email" label="Email" errors={login.fieldErrors.email}>
          <Input {...aria("email", login.fieldErrors.email)} type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label="Mật khẩu" errors={login.fieldErrors.password}>
          <PasswordInput {...aria("password", login.fieldErrors.password)} autoComplete="current-password" required />
        </Field>
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">
            Quên mật khẩu?
          </Link>
          <Button type="submit" pending={login.pending}>
            Đăng nhập
          </Button>
        </div>
      </form>
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-brand-100" />
            hoặc
            <span className="h-px flex-1 bg-brand-100" />
          </div>
          <FormError error={google.error} />
          <Button type="button" variant="outline" className="w-full" icon={<IconGoogle />} pending={google.pending} onClick={() => google.run({ callbackUrl })}>
            Tiếp tục với Google
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const reg = useAction(registerAction);
  if (reg.data) {
    return (
      <Alert tone="success" title="Đăng ký đã được ghi nhận">
        <p>{reg.data.message}</p>
        <p className="mt-2">
          <Link href="/login" className="font-medium underline">
            Đi tới trang đăng nhập
          </Link>
        </p>
      </Alert>
    );
  }
  const fe = reg.fieldErrors;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        reg.run(formToObject(e.currentTarget));
      }}
    >
      <FormError error={reg.error} />
      <Field id="displayName" label="Tên hiển thị" errors={fe.displayName}>
        <Input {...aria("displayName", fe.displayName)} autoComplete="name" maxLength={60} required />
      </Field>
      <Field id="email" label="Email" errors={fe.email}>
        <Input {...aria("email", fe.email)} type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Mật khẩu" hint="Tối thiểu 12 ký tự. Có thể dùng cụm từ dài, dấu cách và tiếng Việt có dấu." errors={fe.password}>
        <PasswordInput {...aria("password", fe.password)} autoComplete="new-password" minLength={12} maxLength={128} required meter />
      </Field>
      <Field id="confirmPassword" label="Xác nhận mật khẩu" errors={fe.confirmPassword}>
        <PasswordInput {...aria("confirmPassword", fe.confirmPassword)} autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" pending={reg.pending}>
        Tạo tài khoản
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const f = useAction(forgotPasswordAction);
  if (f.data) return <Alert tone="success">{f.data.message}</Alert>;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        f.run(formToObject(e.currentTarget));
      }}
    >
      <FormError error={f.error} />
      <Field id="email" label="Email đã đăng ký" errors={f.fieldErrors.email}>
        <Input {...aria("email", f.fieldErrors.email)} type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" pending={f.pending}>
        Gửi hướng dẫn
      </Button>
    </form>
  );
}

export function ResetForm({ token, mode }: { token: string; mode: "reset" | "set" }) {
  const r = useAction(resetPasswordAction);
  if (r.data) {
    return (
      <Alert tone="success" title={mode === "set" ? "Đã đặt mật khẩu" : "Đã đặt lại mật khẩu"}>
        Mọi phiên đăng nhập cũ đã bị đăng xuất.{" "}
        <Link href="/login" className="font-medium underline">
          Đăng nhập lại
        </Link>
      </Alert>
    );
  }
  const fe = r.fieldErrors;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        r.run({ ...formToObject(e.currentTarget), token });
      }}
    >
      <FormError error={r.error} />
      <Field id="password" label="Mật khẩu mới" hint="Tối thiểu 12 ký tự." errors={fe.password}>
        <PasswordInput {...aria("password", fe.password)} autoComplete="new-password" required meter />
      </Field>
      <Field id="confirmPassword" label="Xác nhận mật khẩu mới" errors={fe.confirmPassword}>
        <PasswordInput {...aria("confirmPassword", fe.confirmPassword)} autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" pending={r.pending}>
        {mode === "set" ? "Đặt mật khẩu" : "Đặt lại mật khẩu"}
      </Button>
    </form>
  );
}

export function VerifyForm({ token }: { token: string }) {
  // Xác minh cần bấm nút (POST) để trình quét link trong email không vô tình dùng token.
  const v = useAction(verifyEmailAction);
  if (v.data) {
    return (
      <Alert tone="success" title="Email đã được xác minh">
        Bạn có thể đăng ký khóa học ngay.{" "}
        <Link href="/dashboard" className="font-medium underline">
          Về trang học tập
        </Link>
      </Alert>
    );
  }
  return (
    <div className="space-y-4">
      <FormError error={v.error} />
      <Button className="w-full" pending={v.pending} onClick={() => v.run({ token })}>
        Xác minh email
      </Button>
    </div>
  );
}

export function ResendVerification() {
  const r = useAction(resendVerificationAction);
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-3">
      <FormError error={r.error} />
      {sent ? <Alert tone="success">Đã gửi lại email xác minh. Kiểm tra hộp thư (kể cả thư rác).</Alert> : null}
      <Button
        variant="outline"
        pending={r.pending}
        onClick={async () => {
          const res = await r.run({});
          if (res?.ok) setSent(true);
        }}
      >
        Gửi lại email xác minh
      </Button>
    </div>
  );
}
