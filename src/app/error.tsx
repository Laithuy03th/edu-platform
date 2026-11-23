"use client";

import Link from "next/link";
import { Button, Container, buttonClass } from "@/components/ui";

/** Lỗi không mong đợi: thông báo an toàn, không lộ chi tiết kỹ thuật; cho phép thử lại. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="animate-fade-up">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-danger-50 text-2xl text-danger-700" aria-hidden>
          !
        </div>
        <h1 className="text-h2 mt-4">Đã có lỗi xảy ra</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">Hệ thống chưa xử lý được yêu cầu này. Bạn có thể thử lại hoặc quay về trang chủ.</p>
        {error.digest ? <p className="mt-2 text-xs text-ink-faint">Mã lỗi: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Thử lại</Button>
          <Link href="/" className={buttonClass("outline")}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </Container>
  );
}
