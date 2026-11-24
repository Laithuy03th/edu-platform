import { requireRole } from "@/server/auth";
import { listCategoriesAdmin } from "@/modules/admin/service";
import { PageHeader } from "@/components/ui";
import { CategoryManager } from "./manager";

export const metadata = { title: "Chủ đề" };

export default async function CategoriesPage() {
  await requireRole("admin");
  const cats = await listCategoriesAdmin();
  return (
    <>
      <PageHeader title="Chủ đề khóa học" description="Dùng cho bộ lọc catalog. Ẩn chủ đề thay vì xóa để không làm hỏng khóa đang dùng." />
      <CategoryManager items={cats.map((c) => ({ id: c._id.toHexString(), name: c.name, slug: c.slug, order: c.order, isActive: c.isActive }))} />
    </>
  );
}
