import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { getEditorData } from "@/modules/courses/authoring";
import { getQuizForEditor } from "@/modules/quizzes/service";
import { PageHeader } from "@/components/ui";
import { QuizEditor } from "./quiz-editor";

export const metadata = { title: "Soạn quiz" };

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params;
  const courseId = parseId(id);
  const qid = parseId(quizId);
  if (!courseId || !qid) notFound();
  const viewer = await requireViewer();
  let quiz, data;
  try {
    quiz = await getQuizForEditor(viewer, courseId, qid);
    data = await getEditorData(viewer, courseId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/instructor/courses", label: "Khóa học" }, { href: `/instructor/courses/${id}`, label: data.course.draft.title }, { label: quiz.draft.title }]} title={quiz.kind === "placement" ? "Soạn bài đánh giá đầu vào" : "Soạn quiz"} />
      <QuizEditor
        key={data.course.draftRevision}
        courseId={id}
        quizId={quizId}
        kind={quiz.kind}
        revision={data.course.draftRevision}
        locked={data.course.review.state === "pending"}
        published={quiz.publishedVersion}
        initial={{
          title: quiz.draft.title,
          passPercent: quiz.draft.passPercent,
          showExplanations: quiz.draft.showExplanations,
          questions: quiz.draft.questions.map((q) => ({
            questionId: q.questionId,
            prompt: q.prompt,
            options: q.options.map((o) => ({ optionId: o.optionId, text: o.text })),
            correctIndex: Math.max(0, q.options.findIndex((o) => o.optionId === q.correctOptionId)),
            explanation: q.explanation,
            topicKey: q.topicKey ?? "",
          })),
          rules: quiz.draft.rules.map((r) => ({ topicKey: r.topicKey, chapterId: r.chapterId.toHexString(), thresholdPercent: r.thresholdPercent })),
        }}
        chapters={data.chapters.map((c) => ({ id: c._id.toHexString(), title: c.draft!.title }))}
      />
    </>
  );
}
