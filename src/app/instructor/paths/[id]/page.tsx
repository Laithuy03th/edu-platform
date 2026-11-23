import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { getPathForEditor, pickableContent } from "@/modules/learning-paths/service";
import { PageHeader } from "@/components/ui";
import { PathEditor } from "./path-editor";

export const metadata = { title: "Soạn lộ trình" };

export default async function PathEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const content = await pickableContent();
  let initial = null;
  if (id !== "new") {
    const pid = parseId(id);
    if (!pid) notFound();
    try {
      const p = await getPathForEditor(viewer, pid);
      initial = {
        title: p.title,
        goal: p.goal,
        audience: p.audience,
        prerequisites: p.prerequisites,
        status: p.status,
        featured: p.featured,
        items: [...p.items].sort((a, b) => a.order - b.order).map((it) => ({ itemId: it.itemId, kind: it.kind, refId: it.refId?.toHexString() ?? null, title: it.title, required: it.required, dependsOn: it.dependsOn })),
      };
    } catch (err) {
      if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
      throw err;
    }
  }
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/paths", label: "Lộ trình" }, { label: initial?.title ?? "Mới" }]} title={initial ? "Sửa lộ trình" : "Tạo lộ trình"} />
      <PathEditor pathId={id === "new" ? null : id} initial={initial} content={content} isAdmin={viewer.roles.includes("admin")} />
    </>
  );
}
