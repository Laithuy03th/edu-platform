import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { ResetForm } from "../forms";

export const metadata = { title: "Đặt lại mật khẩu" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; mode?: string }> }) {
  const { token, mode } = await searchParams;
  const m = mode === "set" ? "set" : "reset";
  return (
    <Card className="space-y-5">
      <h1 className="text-2xl font-bold">{m === "set" ? "Đặt mật khẩu" : "Đặt lại mật khẩu"}</h1>
      {token ? (
        <ResetForm token={token} mode={m} />
      ) : (
        <Alert tone="warning">
          Liên kết không hợp lệ.{" "}
          <Link href="/forgot-password" className="underline">
            Yêu cầu liên kết mới
          </Link>
        </Alert>
      )}
    </Card>
  );
}
