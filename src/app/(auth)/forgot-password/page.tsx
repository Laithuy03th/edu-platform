import Link from "next/link";
import { Card } from "@/components/ui";
import { ForgotForm } from "../forms";

export const metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <Card className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-600">Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu (hiệu lực 30 phút).</p>
      </div>
      <ForgotForm />
      <Link href="/login" className="block text-sm text-brand-700 hover:underline">
        ← Quay lại đăng nhập
      </Link>
    </Card>
  );
}
