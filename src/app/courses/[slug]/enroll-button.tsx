"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { enrollAction } from "@/modules/courses/actions";
import { FormError } from "@/components/form-error";
import { Button, buttonClass } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function EnrollButton({ courseId, loggedIn, verified, slug }: { courseId: string; loggedIn: boolean; verified: boolean; slug: string }) {
  const router = useRouter();
  const a = useAction(enrollAction, { onSuccess: () => router.refresh() });
  if (!loggedIn) {
    return (
      <Link href={`/login?callbackUrl=/courses/${slug}`} className={buttonClass("primary", "w-full")}>
        Đăng nhập để đăng ký học
      </Link>
    );
  }
  if (!verified) {
    return (
      <Link href="/verify-email" className={buttonClass("outline", "w-full")}>
        Xác minh email để đăng ký
      </Link>
    );
  }
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      <Button className="w-full" pending={a.pending} onClick={() => a.run({ courseId })}>
        Đăng ký học miễn phí
      </Button>
    </div>
  );
}
