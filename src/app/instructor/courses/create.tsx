"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourseAction } from "@/modules/courses/actions";
import { FormError } from "@/components/form-error";
import { Dialog } from "@/components/overlays";
import { Button, Field, Input, Select } from "@/components/ui";
import { formToObject, useAction } from "@/components/use-action";

export function CreateCourseButton({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const a = useAction(createCourseAction, { onSuccess: (d) => router.push(`/instructor/courses/${d.courseId}`) });
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Tạo khóa học</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Tạo khóa học mới" description="Bắt đầu bằng bản nháp — chỉ bạn và quản trị viên thấy cho tới khi được duyệt.">
        <form
          id="create-course"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const d = formToObject(e.currentTarget);
            a.run({ title: d.title, categoryId: d.categoryId || null, level: d.level });
          }}
        >
          <FormError error={a.error} />
          <Field id="title" label="Tên khóa học" errors={a.fieldErrors.title}>
            <Input id="title" name="title" required minLength={5} maxLength={120} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="categoryId" label="Chủ đề">
              <Select id="categoryId" name="categoryId">
                <option value="">— Chọn sau —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="level" label="Cấp độ">
              <Select id="level" name="level" defaultValue="beginner">
                <option value="beginner">Cơ bản</option>
                <option value="intermediate">Trung cấp</option>
                <option value="advanced">Nâng cao</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" pending={a.pending}>
              Tạo bản nháp
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
