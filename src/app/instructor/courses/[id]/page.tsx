import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { getEditorData, publishProblems } from "@/modules/courses/authoring";
import { listCourseMedia } from "@/modules/media/service";
import { PageHeader, buttonClass } from "@/components/ui";
import { CourseStatusBadges } from "../../status";
import { CourseEditor } from "./editor";
import { TechnologiesForm } from "./technologies-form";
import { CourseSlugForm } from "./slug-form";
import { listActiveTechnologies } from "@/modules/technologies/service";

export const metadata = { title: "Soạn khóa học" };

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = parseId(id);
  if (!courseId) notFound();
  const viewer = await requireViewer();
  let data;
  try {
    data = await getEditorData(viewer, courseId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const [problems, media, techOptions] = await Promise.all([publishProblems(courseId), listCourseMedia(viewer, courseId), listActiveTechnologies()]);
  const { course } = data;
  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/instructor", label: "Giảng viên" }, { href: "/instructor/courses", label: "Khóa học" }, { label: course.draft.title }]}
        title={course.draft.title}
        description={<CourseStatusBadges status={course.status} review={course.review} hasChanges={course.publishedVersion > 0 && course.review.state === "none"} />}
        actions={
          <>
            <Link href={`/instructor/courses/${id}/media`} className={buttonClass("outline", undefined, "sm")}>
              Thư viện media
            </Link>
            {course.published ? (
              <Link href={`/courses/${course.slug}`} className={buttonClass("ghost", undefined, "sm")}>
                Xem bản công khai ↗
              </Link>
            ) : null}
          </>
        }
      />
      <CourseEditor
        key={course.draftRevision}
        courseId={id}
        revision={course.draftRevision}
        status={course.status}
        review={{ state: course.review.state, rejectReason: course.review.rejectReason }}
        isAdmin={viewer.roles.includes("admin")}
        draft={{
          title: course.draft.title,
          shortDescription: course.draft.shortDescription,
          description: course.draft.description,
          learningObjectives: course.draft.learningObjectives.join("\n"),
          prerequisites: course.draft.prerequisites.join("\n"),
          categoryId: course.draft.categoryId?.toHexString() ?? "",
          level: course.draft.level,
          thumbnailMediaId: course.draft.thumbnailMediaId?.toHexString() ?? "",
          placementQuizId: course.draft.placementQuizId?.toHexString() ?? "",
        }}
        categories={data.categories.map((c) => ({ id: c._id.toHexString(), name: c.name }))}
        images={media.filter((m) => m.resourceType === "image" && m.status === "ready").map((m) => ({ id: m.id, label: m.filename }))}
        chapters={data.chapters.map((ch) => ({
          id: ch._id.toHexString(),
          title: ch.draft!.title,
          description: ch.draft!.description,
          lessons: data.lessons
            .filter((l) => l.draft!.chapterId.equals(ch._id))
            .map((l) => ({ id: l._id.toHexString(), title: l.draft!.title, type: l.draft!.type, isPreview: l.draft!.isPreview, isRequired: l.draft!.isRequired, hasQuiz: Boolean(l.draft!.quizId), published: Boolean(l.published) })),
        }))}
        quizzes={data.quizzes.map((q) => ({ id: q._id.toHexString(), kind: q.kind, title: q.draft.title, count: q.draft.questions.length, published: q.publishedVersion !== null }))}
        assignments={data.assignments.map((a) => ({ id: a._id.toHexString(), title: a.draft.title }))}
        problems={problems}
      />
      <div className="mt-8 max-w-3xl">
        <TechnologiesForm
          key={`tech-${course.draftRevision}`}
          courseId={id}
          revision={course.draftRevision}
          locked={course.review.state === "pending" || course.status === "suspended"}
          options={techOptions}
          initial={(course.draft.technologies ?? []).map((t) => ({ technologyId: t.technologyId.toHexString(), testedVersion: t.testedVersion }))}
        />
      </div>
      <div className="mt-8 max-w-3xl">
        <CourseSlugForm key={course.slug} courseId={id} slug={course.slug} published={Boolean(course.published)} />
      </div>
    </>
  );
}
