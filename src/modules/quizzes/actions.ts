"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

const rate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][];

const create = defineAction(
  { schema: z.object({ courseId: zId, expectedRevision: z.number().int().min(0), kind: z.enum(["lesson", "placement"]), title: zText(3, 120, "Tên quiz") }), rate },
  async (i, { viewer }) => {
    const r = await svc.createQuiz(viewer, new ObjectId(i.courseId), i.expectedRevision, i.kind, i.title);
    revalidatePath(`/instructor/courses/${i.courseId}`);
    return { revision: r.revision, quizId: r.quizId.toHexString() };
  },
);
export async function createQuizAction(input: unknown) {
  return create(input);
}

const save = defineAction(
  {
    schema: z.object({
      courseId: zId,
      quizId: zId,
      expectedRevision: z.number().int().min(0),
      title: zText(3, 120, "Tên quiz"),
      passPercent: z.number().int().min(0).max(100),
      showExplanations: z.enum(["after_submit", "never"]),
      questions: z
        .array(
          z.object({
            questionId: z.string().max(64).optional(),
            prompt: zText(1, 2000, "Câu hỏi"),
            options: z.array(z.object({ optionId: z.string().max(64).optional(), text: zText(1, 500, "Lựa chọn") })).min(2).max(6),
            correctIndex: z.number().int().min(0).max(5),
            explanation: z.string().trim().max(2000).default(""),
            topicKey: z.string().trim().max(40).regex(/^[a-z0-9-]*$/, "Chủ đề chỉ gồm chữ thường, số, gạch ngang").transform((v) => v || null).nullable().default(null),
          }),
        )
        .max(svc.MAX_QUESTIONS),
      rules: z.array(z.object({ topicKey: z.string().regex(/^[a-z0-9-]{1,40}$/), chapterId: zId, thresholdPercent: z.number().int().min(1).max(100) })).max(30).default([]),
    }),
    rate,
  },
  async (i, { viewer }) => {
    const revision = await svc.saveQuizDraft(viewer, new ObjectId(i.courseId), new ObjectId(i.quizId), i.expectedRevision, {
      title: i.title,
      passPercent: i.passPercent,
      showExplanations: i.showExplanations,
      questions: i.questions,
      rules: i.rules.map((r) => ({ ...r, chapterId: new ObjectId(r.chapterId) })),
    });
    revalidatePath(`/instructor/courses/${i.courseId}`);
    return { revision };
  },
);
export async function saveQuizDraftAction(input: unknown) {
  return save(input);
}
