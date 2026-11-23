import Link from "next/link";
import { getViewer } from "@/server/auth";
import { Alert, Card } from "@/components/ui";
import { ResendVerification, VerifyForm } from "../forms";

export const metadata = { title: "Xác minh email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const viewer = await getViewer();
  return (
    <Card className="space-y-5">
      <h1 className="text-2xl font-bold">Xác minh email</h1>
      {token ? (
        <VerifyForm token={token} />
      ) : viewer ? (
        viewer.emailVerified ? (
          <Alert tone="success">Email {viewer.email} đã được xác minh.</Alert>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Chúng tôi đã gửi liên kết xác minh tới <strong>{viewer.email}</strong>. Liên kết có hiệu lực 24 giờ.
            </p>
            <ResendVerification />
          </>
        )
      ) : (
        <p className="text-sm text-slate-600">
          Mở liên kết trong email để xác minh, hoặc{" "}
          <Link href="/login?callbackUrl=/verify-email" className="text-brand-700 underline">
            đăng nhập
          </Link>{" "}
          để gửi lại email.
        </p>
      )}
    </Card>
  );
}
