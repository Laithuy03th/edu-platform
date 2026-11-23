import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { getEditorData } from "@/modules/courses/authoring";
import { getAssignmentForEditor } from "@/modules/projects/service";
import { PageHeader } from "@/components/ui";
import { AssignmentEditor } from "./assignment-editor";

export const metadata = { title: "Soạn bài tập dự án" };

export default async function AssignmentEditorPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const courseId = parseId(id);
  const aid = parseId(assignmentId);
  if (!courseId || !aid) notFound();
  const viewer = await requireViewer();
  let a, data;
  try {
    a = await getAssignmentForEditor(viewer, courseId, aid);
    data = await getEditorData(viewer, courseId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const d = a.draft!;
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/courses", label: "Khóa học" }, { href: `/instructor/courses/${id}`, label: data.course.draft.title }, { label: d.title }]} title="Soạn bài tập dự án" />
      <AssignmentEditor
        key={data.course.draftRevision}
        courseId={id}
        assignmentId={assignmentId}
        revision={data.course.draftRevision}
        locked={data.course.review.state === "pending"}
        initial={{
          title: d.title,
          brief: d.brief,
          objectives: d.objectives.join("\n"),
          requirements: d.requirements.join("\n"),
          checklist: d.checklist.join("\n"),
          rubric: d.rubric,
          resources: d.resources,
          maxRounds: d.maxRounds,
        }}
      />
    </>
  );
}
