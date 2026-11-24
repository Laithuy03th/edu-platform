"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";
import { useConfirm, useToast } from "@/components/overlays";
import { Button, type ButtonVariant } from "@/components/ui";

/**
 * Nút hành động quản trị: xác nhận (kèm lý do nếu cần) → gọi Server Action → toast → làm mới.
 * Nhận tham chiếu Server Action + input serializable (không nhận closure từ Server Component).
 * Nếu có `reasonField`, lý do nhập trong dialog được gán vào input[reasonField].
 */
export function AdminAction({
  label,
  variant = "outline",
  size = "sm",
  confirmTitle,
  confirmText,
  reasonLabel,
  reasonField,
  tone = "danger",
  success = "Đã cập nhật.",
  action,
  input,
}: {
  label: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  confirmTitle?: string;
  confirmText?: string;
  reasonLabel?: string;
  reasonField?: string;
  tone?: "danger" | "brand";
  success?: string;
  action: (input: unknown) => Promise<ActionResult<unknown>>;
  input: Record<string, unknown>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      pending={pending}
      onClick={async () => {
        let reason = "";
        if (confirmTitle) {
          const c = await confirm({ title: confirmTitle, description: confirmText, requireReason: reasonLabel, tone, confirmLabel: typeof label === "string" ? label : "Xác nhận" });
          if (!c.ok) return;
          reason = c.reason;
        }
        setPending(true);
        const r = await action(reasonField ? { ...input, [reasonField]: reason } : input).catch(() => null);
        setPending(false);
        if (r?.ok) {
          toast({ tone: "success", message: success });
          router.refresh();
        } else toast({ tone: "error", message: r?.error.message ?? "Không kết nối được máy chủ." });
      }}
    >
      {label}
    </Button>
  );
}
