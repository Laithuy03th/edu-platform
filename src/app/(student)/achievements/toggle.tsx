"use client";

import { useState } from "react";
import { setCourseOnProfileAction } from "@/modules/achievements/actions";
import { setSubmissionVisibilityAction } from "@/modules/projects/actions";
import { useToast } from "@/components/overlays";
import { cn } from "@/components/ui";

/** Công tắc hiển thị công khai cho từng thành quả (opt-in). Cập nhật lạc quan, hoàn tác nếu lỗi. */
export function VisibilityToggle({ kind, id, initial }: { kind: "course" | "project"; id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Hiển thị công khai trên hồ sơ"
      disabled={busy}
      onClick={async () => {
        const next = !on;
        setOn(next);
        setBusy(true);
        const r = kind === "course" ? await setCourseOnProfileAction({ enrollmentId: id, show: next }).catch(() => null) : await setSubmissionVisibilityAction({ submissionId: id, show: next }).catch(() => null);
        setBusy(false);
        if (!r?.ok) {
          setOn(!next);
          toast({ tone: "error", message: r?.error.message ?? "Không cập nhật được." });
        }
      }}
      className="flex shrink-0 items-center gap-2 text-xs font-semibold text-ink-soft"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", on ? "bg-brand-700" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-spring)]", on ? "translate-x-5" : "translate-x-0.5")} />
      </span>
      <span className="hidden sm:inline">{on ? "Công khai" : "Riêng tư"}</span>
    </button>
  );
}
