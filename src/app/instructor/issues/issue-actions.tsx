"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveIssueAction } from "@/modules/content-issues/actions";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/overlays";
import { Button, Input } from "@/components/ui";

export function IssueActions({ id, status }: { id: string; status: "open" | "resolved" | "wont_fix" }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const a = useAction(resolveIssueAction);
  const go = async (next: "resolved" | "wont_fix" | "open") => {
    const r = await a.run({ issueId: id, status: next, resolution: note });
    if (r?.ok) {
      toast({ tone: "success", message: next === "open" ? "Đã mở lại." : "Đã cập nhật báo lỗi." });
      setNote("");
      router.refresh();
    } else if (r && !r.ok) toast({ tone: "error", message: r.error.fieldErrors?.resolution ? "Nhập ghi chú xử lý cho người báo." : r.error.message });
  };
  if (status !== "open") {
    return (
      <Button size="sm" variant="ghost" pending={a.pending} onClick={() => go("open")}>
        Mở lại
      </Button>
    );
  }
  return (
    <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <Input aria-label="Ghi chú xử lý (người báo sẽ thấy)" placeholder="Ghi chú cho người báo…" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="h-9 min-w-56 flex-1 text-sm" />
      <Button size="sm" pending={a.pending} onClick={() => go("resolved")}>
        Đã sửa
      </Button>
      <Button size="sm" variant="outline" disabled={a.pending} onClick={() => go("wont_fix")}>
        Không sửa
      </Button>
    </div>
  );
}
