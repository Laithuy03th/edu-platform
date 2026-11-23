import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth";
import { Card } from "@/components/ui";
import { RegisterForm } from "../forms";

export const metadata = { title: "Đăng ký" };

export default async function RegisterPage() {
  if (await getViewer()) redirect("/dashboard");
  return (
    <Card className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
      <RegisterForm />
    </Card>
  );
}
