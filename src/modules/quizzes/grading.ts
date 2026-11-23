import type { ObjectId } from "mongodb";
import type { PlacementRule, QuizQuestion } from "@/server/db/models";

/* Hàm chấm điểm thuần — chạy trên server, không nhận score/pass từ client (C12). */

export type SubmittedAnswer = { questionId: string; optionId: string | null };

export function gradeQuiz(questions: QuizQuestion[], answers: SubmittedAnswer[], passPercent: number) {
  const byId = new Map(answers.map((a) => [a.questionId, a.optionId]));
  const graded = questions.map((q) => {
    const selected = byId.get(q.questionId) ?? null;
    const valid = selected !== null && q.options.some((o) => o.optionId === selected);
    return { questionId: q.questionId, questionVersion: q.version, selectedOptionId: valid ? selected : null, correct: valid && selected === q.correctOptionId, topicKey: q.topicKey };
  });
  const correctCount = graded.filter((g) => g.correct).length;
  const total = questions.length;
  const scorePercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return { graded, correctCount, total, scorePercent, passed: scorePercent >= passPercent };
}

/** Gợi ý từ bài đánh giá đầu vào theo rule minh bạch: dưới ngưỡng → học trước; đạt → ôn nhanh (§10.2). */
export function placementRecommendations(graded: { correct: boolean; topicKey: string | null }[], rules: PlacementRule[]) {
  const topics = new Map<string, { correct: number; total: number }>();
  for (const g of graded) {
    if (!g.topicKey) continue;
    const t = topics.get(g.topicKey) ?? { correct: 0, total: 0 };
    t.total++;
    if (g.correct) t.correct++;
    topics.set(g.topicKey, t);
  }
  const topicBreakdown = [...topics.entries()].map(([topicKey, v]) => ({ topicKey, ...v }));
  const recommendations: { chapterId: ObjectId; kind: "study_first" | "quick_review"; topicKey: string; percent: number }[] = [];
  for (const rule of rules) {
    const t = topics.get(rule.topicKey);
    if (!t || t.total === 0) continue;
    const percent = Math.round((t.correct / t.total) * 100);
    recommendations.push({ chapterId: rule.chapterId, topicKey: rule.topicKey, percent, kind: percent < rule.thresholdPercent ? "study_first" : "quick_review" });
  }
  return { topicBreakdown, recommendations };
}

/** Giữ ổn định version câu hỏi: chỉ tăng khi nội dung chấm điểm thay đổi. */
export function questionFingerprint(q: Pick<QuizQuestion, "prompt" | "options" | "correctOptionId" | "explanation">) {
  return JSON.stringify([q.prompt, q.options.map((o) => [o.optionId, o.text]), q.correctOptionId, q.explanation]);
}
