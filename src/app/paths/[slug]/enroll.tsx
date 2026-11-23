"use client";

import { useRouter } from "next/navigation";
import { setPathEnrollmentAction } from "@/modules/learning-paths/actions";
import { FormError } from "@/components/form-error";
import { useToast } from "@/components/overlays";
import { Button } from "@/components/ui";
import { useAction } from "@/components/use-action";

export function PathEnrollButtons({ pathId, status, verified }: { pathId: string; status: "active" | "paused" | "stopped" | null; verified: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const a = useAction(setPathEnrollmentAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã cập nhật lộ trình." });
      router.refresh();
    },
  });
  if (!verified) return <p className="text-sm text-warning-800">Xác minh email để theo lộ trình.</p>;
  return (
    <div className="space-y-2">
      <FormError error={a.error} />
      {status === "active" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" pending={a.pending} onClick={() => a.run({ pathId, status: "paused" })}>
            Tạm dừng
          </Button>
          <Button variant="ghost" pending={a.pending} onClick={() => a.run({ pathId, status: "stopped" })}>
            Ngừng theo
          </Button>
        </div>
      ) : (
        <Button className="w-full" pending={a.pending} onClick={() => a.run({ pathId, status: "active" })}>
          {status === "paused" ? "Tiếp tục lộ trình" : "Theo lộ trình này"}
        </Button>
      )}
    </div>
  );
}
