"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionError, ActionResult } from "@/lib/errors";

/**
 * Hook gọi Server Action từ client: pending, lỗi chung, lỗi theo field.
 * Không báo thành công trước khi server xác nhận (§21.2).
 */
export function useAction<I, O>(action: (input: I) => Promise<ActionResult<O>>, opts?: { onSuccess?: (data: O) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionError | null>(null);
  const [data, setData] = useState<O | null>(null);

  const run = useCallback(
    (input: I) =>
      new Promise<ActionResult<O> | null>((resolve) => {
        setError(null);
        startTransition(async () => {
          try {
            const res = await action(input);
            if (res.ok) {
              setData(res.data);
              opts?.onSuccess?.(res.data);
            } else setError(res.error);
            resolve(res);
          } catch (err) {
            // redirect() từ server sẽ được Next.js xử lý; lỗi mạng hiển thị thông báo thử lại.
            if (err && typeof err === "object" && "digest" in err) throw err;
            setError({ code: "INTERNAL_ERROR", message: "Không kết nối được máy chủ. Kiểm tra mạng và thử lại." });
            resolve(null);
          }
        });
      }),
    [action, opts],
  );

  return { run, pending, error, data, setError, fieldErrors: error?.fieldErrors ?? {} };
}

/** Chuyển FormData thành object (bỏ qua File). */
export function formToObject(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}
