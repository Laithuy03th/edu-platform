import Link from "next/link";
import { Container, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="animate-fade-up">
        <p className="font-display text-7xl font-extrabold text-brand-200">404</p>
        <h1 className="text-h2 mt-2">Không tìm thấy trang</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">Trang này không tồn tại, đã bị gỡ hoặc bạn không có quyền xem.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClass("primary")}>
            Về trang chủ
          </Link>
          <Link href="/courses" className={buttonClass("outline")}>
            Xem khóa học
          </Link>
        </div>
      </div>
    </Container>
  );
}
