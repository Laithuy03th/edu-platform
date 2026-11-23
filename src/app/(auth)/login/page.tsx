import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getViewer } from "@/server/auth";
import { safeCallbackUrl } from "@/server/auth/redirect";
import { Alert, Card } from "@/components/ui";
import { LoginForm } from "../forms";

export const metadata = { title: "Đăng nhập" };

const ERRORS: Record<string, string> = {
  account_exists:
    "Email Google này đã có tài khoản đăng ký bằng mật khẩu. Hãy đăng nhập bằng mật khẩu, sau đó liên kết Google trong Cài đặt › Bảo mật.",
  email_unverified: "Email Google chưa được Google xác minh nên không thể dùng để đăng nhập.",
  blocked: "Tài khoản không thể đăng nhập. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.",
  link_expired: "Phiên liên kết đã hết hạn. Vui lòng thử lại.",
  linked_elsewhere: "Tài khoản Google này đã liên kết với tài khoản khác.",
  OAuthCallbackError: "Đăng nhập Google không thành công. Vui lòng thử lại.",
  AccessDenied: "Đăng nhập bị từ chối.",
  Configuration: "Đăng nhập chưa được cấu hình đầy đủ.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl, env().appOrigin);
  if (await getViewer()) redirect(callbackUrl);
  const error = sp.error ? (ERRORS[sp.error] ?? "Đăng nhập không thành công. Vui lòng thử lại.") : null;
  return (
    <Card className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-brand-700 hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
      {sp.notice === "logged_out_all" ? <Alert tone="success">Đã đăng xuất khỏi tất cả thiết bị.</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <LoginForm callbackUrl={callbackUrl} googleEnabled={env().googleEnabled} />
    </Card>
  );
}
