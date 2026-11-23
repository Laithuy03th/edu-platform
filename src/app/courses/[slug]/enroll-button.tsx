"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { enrollAction } from "@/modules/courses/actions";
import { FormError } from "@/components/form-error";
import { useToast } from "@/components/overlays";
import { Button, buttonClass } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function EnrollButton({ courseId, loggedIn, verified, slug }: { courseId: string; loggedIn: boolean; verified: boolean; slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const a = useAction(enrollAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã đăng ký khóa học. Chúc bạn học vui!" });
      router.refresh();
    },
  });
  if (!loggedIn) {
    return (
      <Link href={`/login?callbackUrl=/courses/${slug}`} className={buttonClass("primary", "w-full", "lg")}>
        Đăng nhập để đăng ký
      </Link>
    );
  }
  if (!verified) {
    return (
      <Link href="/verify-email" className={buttonClass("soft", "w-full", "lg")}>
        Xác minh email để đăng ký
      </Link>
    );
  }
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      <Button className="w-full" size="lg" pending={a.pending} onClick={() => a.run({ courseId })}>
        Đăng ký học miễn phí
      </Button>
    </div>
  );
}
