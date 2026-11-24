"use client";

import Link from "next/link";
import { useState } from "react";
import { setBookmarkAction } from "@/modules/bookmarks/actions";
import { useToast } from "./overlays";
import { useAction } from "./use-action";
import { IconBookmark } from "./icons";

/**
 * Nút Lưu/Bỏ lưu (aria-pressed). Chỉ đổi trạng thái sau khi server xác nhận; khách → link đăng nhập.
 */
export function BookmarkButton({ type, id, initial, signedIn, nextPath, compact }: { type: "course" | "lesson"; id: string; initial: boolean; signedIn: boolean; nextPath: string; compact?: boolean }) {
  const [saved, setSaved] = useState(initial);
  const toast = useToast();
  const a = useAction(setBookmarkAction);
  const cls = `group inline-flex items-center gap-2 rounded-full border font-semibold transition duration-[var(--duration-micro)] active:scale-95 disabled:opacity-60 ${compact ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm"} ${
    saved ? "border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100" : "border-line-strong bg-surface text-ink hover:border-brand-300 hover:text-brand-800"
  }`;
  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className={cls}>
        <IconBookmark size={17} /> Lưu
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={a.pending}
      className={cls}
      onClick={async () => {
        const r = await a.run({ type, id, saved: !saved });
        if (r?.ok) {
          setSaved(r.data.saved);
          toast({ tone: "success", message: r.data.saved ? "Đã thêm vào Đánh dấu của tôi." : "Đã bỏ lưu." });
        } else toast({ tone: "error", message: r?.ok === false ? r.error.message : "Không kết nối được máy chủ." });
      }}
    >
      <IconBookmark size={17} className={`transition-transform group-active:scale-110 ${saved ? "fill-brand-600 text-brand-600" : ""}`} />
      {saved ? "Đã lưu" : "Lưu"}
    </button>
  );
}
