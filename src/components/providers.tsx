"use client";

import type { ReactNode } from "react";
import { ConfirmProvider, ToastProvider } from "./overlays";

/** Provider client tối thiểu; children vẫn là Server Components. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
