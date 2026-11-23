import Link from "next/link";
import { Container } from "@/components/ui";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-8">
      <h1 className="mb-4 text-2xl font-bold">Cài đặt</h1>
      <nav aria-label="Mục cài đặt" className="mb-6 flex gap-2 border-b border-line text-sm">
        <Link href="/settings/profile" className="border-b-2 border-transparent px-3 py-2 hover:border-brand-600">
          Hồ sơ & dữ liệu
        </Link>
        <Link href="/settings/security" className="border-b-2 border-transparent px-3 py-2 hover:border-brand-600">
          Bảo mật & đăng nhập
        </Link>
      </nav>
      {children}
    </Container>
  );
}
