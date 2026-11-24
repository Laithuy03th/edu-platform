import { requireRole } from "@/server/auth";
import { listTechnologiesAdmin, DOMAIN_LABEL, TYPE_LABEL } from "@/modules/technologies/service";
import { PageHeader } from "@/components/ui";
import { TechnologyManager } from "./manager";

export const metadata = { title: "Công nghệ" };

export default async function AdminTechnologiesPage() {
  await requireRole("admin");
  const items = await listTechnologiesAdmin();
  return (
    <>
      <PageHeader
        title="Taxonomy công nghệ"
        description="Phân loại theo loại (ngôn ngữ, framework, runtime, database…) và mảng IT. Trạng thái “planned” chỉ hiện trong roadmap; trang hub công khai chỉ mở khi có khóa đã xuất bản."
      />
      <TechnologyManager
        typeLabels={TYPE_LABEL}
        domainLabels={DOMAIN_LABEL}
        items={items.map((t) => ({
          prerequisites: (t.prerequisites ?? []).map((id) => items.find((x) => x._id.equals(id))?.slug ?? "").filter(Boolean).join(", "),
          id: t._id.toHexString(),
          name: t.name,
          slug: t.slug,
          type: t.type,
          domain: t.domain,
          aliases: t.aliases.join(", "),
          description: t.description,
          officialUrl: t.officialUrl ?? "",
          status: t.status,
          order: t.order,
        }))}
      />
    </>
  );
}
