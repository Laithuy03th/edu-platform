"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeCourseSlugAction } from "@/modules/courses/actions";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { Button, Card, Field, Input } from "@/components/ui";

/** S06: đổi đường dẫn khóa học. Khóa đã xuất bản → URL cũ tự chuyển (308) sang URL mới. */
export function CourseSlugForm({ courseId, slug, published }: { courseId: string; slug: string; published: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(slug);
  const a = useAction(changeCourseSlugAction);
  return (
    <Card className="p-5">
      <h2 className="text-h3">Đường dẫn</h2>
      <p className="mt-1 text-sm text-ink-soft">{published ? "Đổi đường dẫn không làm hỏng link cũ: URL cũ tự chuyển sang URL mới (308)." : "Khóa chưa xuất bản: đổi tự do."}</p>
      <FormError error={a.error} />
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field id="course-slug" label="Slug" errors={a.fieldErrors.slug}>
          <div className="flex items-center gap-1 text-sm text-ink-faint">
            /courses/
            <Input id="course-slug" value={v} maxLength={90} onChange={(e) => setV(e.target.value)} className="w-72" />
          </div>
        </Field>
        <Button
          size="sm"
          variant="outline"
          disabled={v === slug}
          pending={a.pending}
          onClick={async () => {
            const r = await a.run({ courseId, slug: v });
            if (r?.ok) {
              toast({ tone: "success", message: "Đã đổi đường dẫn." });
              router.refresh();
            }
          }}
        >
          Đổi
        </Button>
      </div>
    </Card>
  );
}
