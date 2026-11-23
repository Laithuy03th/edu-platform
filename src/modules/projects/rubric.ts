import type { RubricCriterion } from "@/server/db/models";

/** Tổng điểm rubric (D6): mọi tiêu chí phải được chấm, điểm 0..maxPoints. */
export function rubricTotal(rubric: RubricCriterion[], scores: { criterionId: string; points: number }[]) {
  const byId = new Map(scores.map((s) => [s.criterionId, s.points]));
  const problems: string[] = [];
  let total = 0;
  for (const c of rubric) {
    const p = byId.get(c.criterionId);
    if (p === undefined) problems.push(`Chưa chấm tiêu chí “${c.title}”.`);
    else if (!Number.isFinite(p) || p < 0 || p > c.maxPoints) problems.push(`Điểm tiêu chí “${c.title}” phải từ 0 đến ${c.maxPoints}.`);
    else total += p;
  }
  for (const s of scores) if (!rubric.some((c) => c.criterionId === s.criterionId)) problems.push("Có tiêu chí không thuộc rubric.");
  const maxPoints = rubric.reduce((s, c) => s + c.maxPoints, 0);
  return { total, maxPoints, problems };
}
