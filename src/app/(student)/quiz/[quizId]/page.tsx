import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { getQuizForAttempt } from "@/modules/quizzes/service";
import { Alert, Container, buttonClass } from "@/components/ui";
import { QuizRunner } from "./quiz-runner";

export const metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const id = parseId(quizId);
  if (!id) notFound();
  const viewer = await requireViewer();
  let quiz;
  try {
    quiz = await getQuizForAttempt(viewer, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    if (err instanceof AppError) {
      return (
        <Container className="py-16">
          <Alert tone="warning" title="Không mở được quiz">
            {err.message}
          </Alert>
        </Container>
      );
    }
    throw err;
  }
  const back = quiz.lessonId ? `/learn/${quiz.courseSlug}/${quiz.lessonId}` : `/courses/${quiz.courseSlug}`;
  return (
    <div className="bg-grain-warm">
      <Container className="max-w-3xl py-10">
        <Link href={back} className="text-sm font-semibold text-brand-700 hover:underline">
          ← {quiz.courseTitle}
        </Link>
        <QuizRunner quiz={quiz} backHref={back} />
      </Container>
    </div>
  );
}
