import type { Metadata } from "next";
import { viewerOrRedirect } from "@/server/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Lớp kiểm tra cho UI; mọi service/action vẫn tự kiểm tra quyền. */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await viewerOrRedirect();
  return <>{children}</>;
}
