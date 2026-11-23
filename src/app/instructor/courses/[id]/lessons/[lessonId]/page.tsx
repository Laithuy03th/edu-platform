import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { env } from "@/lib/env";
import { requireViewer } from "@/server/auth";
import { getEditorData, loadEditableLesson } from "@/modules/courses/authoring";
import { listCourseMedia } from "@/modules/media/service";
import { getSettings } from "@/modules/media/settings";
import { PageHeader } from "@/components/ui";
import { LessonEditor } from "./lesson-editor";

export const metadata = { title: "Soạn bài học" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const courseId = parseId(id);
  const lid = parseId(lessonId);
  if (!courseId || !lid) notFound();
  const viewer = await requireViewer();
  let lesson, data;
  try {
    lesson = await loadEditableLesson(viewer, courseId, lid);
    data = await getEditorData(viewer, courseId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const [media, settings] = await Promise.all([listCourseMedia(viewer, courseId), getSettings()]);
  const d = lesson.draft!;
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/courses", label: "Khóa học" }, { href: `/instructor/courses/${id}`, label: data.course.draft.title }, { label: d.title }]} title="Soạn bài học" />
      <LessonEditor
        key={data.course.draftRevision}
        courseId={id}
        lessonId={lessonId}
        revision={data.course.draftRevision}
        locked={data.course.review.state === "pending"}
        cloudinaryEnabled={env().cloudinaryEnabled}
        limits={{ videoMaxBytes: settings.limits.videoMaxBytes, videoMaxSeconds: settings.limits.videoMaxSeconds }}
        lesson={{
          chapterId: d.chapterId.toHexString(),
          title: d.title,
          type: d.type,
          objectives: d.objectives.join("\n"),
          content: d.content,
          durationMinutes: Math.round(d.durationSeconds / 6) / 10,
          isPreview: d.isPreview,
          isRequired: d.isRequired,
          mediaId: d.mediaId?.toHexString() ?? "",
          transcript: d.transcript ?? "",
          quizId: d.quizId?.toHexString() ?? "",
          projectAssignmentId: d.projectAssignmentId?.toHexString() ?? "",
        }}
        chapters={data.chapters.map((c) => ({ id: c._id.toHexString(), title: c.draft!.title }))}
        quizzes={data.quizzes.filter((q) => q.kind === "lesson").map((q) => ({ id: q._id.toHexString(), title: q.draft.title }))}
        assignments={data.assignments.map((a) => ({ id: a._id.toHexString(), title: a.draft.title }))}
        videos={media.filter((m) => m.resourceType === "video" && m.status === "ready").map((m) => ({ id: m.id, label: `${m.filename} · ${Math.round((m.durationSeconds ?? 0) / 60)} phút` }))}
      />
    </>
  );
}
