import { env } from "@/lib/env";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth";
import { linkedProviders } from "@/modules/auth/service";
import { Alert, Card } from "@/components/ui";
import { ChangePasswordForm, LinkGoogleForm, LogoutAllForm, SetPasswordButton, UnlinkGoogleButton } from "./forms";

export const metadata = { title: "Bảo mật" };

const LINK_ERRORS: Record<string, string> = {
  linked_elsewhere: "Tài khoản Google này đã liên kết với một tài khoản khác.",
  link_expired: "Phiên liên kết đã hết hạn, vui lòng thử lại.",
  blocked: "Không thể liên kết tài khoản.",
};

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ link_error?: string; linked?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const providers = await linkedProviders(viewer.id);
  const google = providers.find((p) => p.provider === "google");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Mật khẩu</h2>
        {viewer.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <div className="space-y-3 text-sm">
            <p>Tài khoản của bạn chưa có mật khẩu (đang đăng nhập bằng Google). Để đặt mật khẩu, chúng tôi sẽ gửi liên kết tới email đã xác minh của bạn.</p>
            <SetPasswordButton />
          </div>
        )}
      </Card>
      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Phương thức đăng nhập</h2>
          {sp.link_error ? <Alert tone="danger" className="mb-3">{LINK_ERRORS[sp.link_error] ?? "Liên kết không thành công."}</Alert> : null}
          {sp.linked && google ? <Alert tone="success" className="mb-3">Đã liên kết Google.</Alert> : null}
          <ul className="space-y-2 text-sm">
            <li>✓ Email & mật khẩu: {viewer.hasPassword ? "đang dùng" : "chưa đặt"}</li>
            <li>
              {google ? `✓ Google (${google.emailAtLink}) — liên kết ngày ${formatDate(google.linkedAt, viewer.timezone)}` : "Google: chưa liên kết"}
            </li>
          </ul>
          <div className="mt-4">
            {google ? (
              <UnlinkGoogleButton />
            ) : env().googleEnabled ? (
              <LinkGoogleForm needsPassword={viewer.hasPassword} />
            ) : (
              <p className="text-sm text-ink-faint">Đăng nhập Google chưa được cấu hình trên máy chủ này.</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Phiên đăng nhập</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Phiên hết hạn sau 8 giờ không hoạt động và tối đa 7 ngày kể từ lần đăng nhập. Đăng xuất tất cả thiết bị sẽ vô hiệu mọi phiên ngay ở lần truy cập kế tiếp.
          </p>
          <LogoutAllForm />
        </Card>
      </div>
    </div>
  );
}
