"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createArticleAction } from "@/modules/articles/actions";
import { useAction } from "@/components/use-action";
import { Dialog } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Button, Field, Input, Select } from "@/components/ui";

const KINDS = [
  ["tutorial", "Hướng dẫn"],
  ["recipe", "Cài đặt môi trường"],
  ["troubleshooting", "Xử lý lỗi"],
  ["reference", "Tham khảo"],
  ["cheatsheet", "Cheatsheet"],
] as const;

export function NewArticle() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("tutorial");
  const a = useAction(createArticleAction);
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Bài mới</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Bài viết mới"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              pending={a.pending}
              onClick={async () => {
                const r = await a.run({ title, kind });
                if (r?.ok) router.push(`/instructor/articles/${r.data.id}`);
              }}
            >
              Tạo bản nháp
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError error={a.error} />
          <Field id="na-title" label="Tiêu đề" errors={a.fieldErrors.title}>
            <Input id="na-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field id="na-kind" label="Loại bài">
            <Select id="na-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {KINDS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </>
  );
}
