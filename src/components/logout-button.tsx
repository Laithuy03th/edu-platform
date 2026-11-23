"use client";

import { logoutAction } from "@/modules/auth/actions";
import { useAction } from "./use-action";

export function LogoutButton() {
  const { run, pending } = useAction(logoutAction);
  return (
    <button type="button" onClick={() => run({})} disabled={pending} className="rounded px-3 py-2 text-left text-sm text-danger-700 hover:bg-danger-50">
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
