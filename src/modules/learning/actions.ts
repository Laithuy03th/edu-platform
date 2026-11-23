"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { markComplete, saveProgress, setUnderstanding } from "./progress";
import * as quizzes from "@/modules/quizzes/service";
import * as review from "@/modules/review/service";
import * as notes from "@/modules/notes/service";

const oid = (s: string) => new ObjectId(s);

const progress = defineAction(
  { schema: z.object({ lessonId: zId, positionSeconds: z.number().finite().min(0), clientAt: z.number().int().positive() }), rate: (_i, { viewer }) => [[RULES.progressUser, viewer.idStr]] },
  async (i, { viewer }) => saveProgress(viewer, oid(i.lessonId), i.positionSeconds, i.clientAt),
);
export async function saveProgressAction(input: unknown) {
  return progress(input);
}

const complete = defineAction({ schema: z.object({ lessonId: zId }), rate: (_i, { viewer }) => [[RULES.completeUser, viewer.idStr]] }, async (i, { viewer }) => {
  const r = await markComplete(viewer, oid(i.lessonId), "manual");
  revalidatePath(`/learn/${r.courseSlug}/${i.lessonId}`);
  return { ok: true };
});
export async function markCompleteAction(input: unknown) {
  return complete(input);
}

const understand = defineAction(
  { schema: z.object({ lessonId: zId, level: z.enum(["understood", "needs_review", "not_understood"]).nullable() }), rate: (_i, { viewer }) => [[RULES.completeUser, viewer.idStr]] },
  async (i, { viewer }) => {
    await setUnderstanding(viewer, oid(i.lessonId), i.level);
    return { ok: true };
  },
);
export async function setUnderstandingAction(input: unknown) {
  return understand(input);
}

/* ---- Quiz ---- */

const submitQuiz = defineAction(
  {
    schema: z.object({
      quizId: zId,
      quizVersion: z.number().int().positive(),
      submissionId: z.string().uuid(),
      answers: z.array(z.object({ questionId: z.string().max(64), optionId: z.string().max(64).nullable() })).max(30),
    }),
    rate: (_i, { viewer }) => [[RULES.quizUser, viewer.idStr]],
  },
  // Không nhận score/passed từ client — chỉ đáp án.
  async (i, { viewer }) => quizzes.submitQuiz(viewer, oid(i.quizId), { quizVersion: i.quizVersion, submissionId: i.submissionId, answers: i.answers }),
);
export async function submitQuizAction(input: unknown) {
  return submitQuiz(input);
}

const attemptResult = defineAction({ schema: z.object({ attemptId: zId }) }, async (i, { viewer }) => quizzes.getAttemptResult(viewer, oid(i.attemptId)));
export async function getAttemptResultAction(input: unknown) {
  return attemptResult(input);
}

/* ---- Ôn tập ---- */

const answerReview = defineAction(
  { schema: z.object({ itemId: zId, revision: z.number().int().min(0), optionId: z.string().max(64) }), rate: (_i, { viewer }) => [[RULES.reviewAnswerUser, viewer.idStr]] },
  async (i, { viewer }) => review.answerReview(viewer, oid(i.itemId), i.revision, i.optionId),
);
export async function answerReviewAction(input: unknown) {
  return answerReview(input);
}

/* ---- Ghi chú ---- */

const zNoteContent = zText(1, notes.NOTE_MAX_CHARS, "Ghi chú");
const zTs = z.number().finite().min(0).nullable();

const createNote = defineAction(
  { schema: z.object({ lessonId: zId, timestampSeconds: zTs, content: zNoteContent }), rate: (_i, { viewer }) => [[RULES.notesUser, viewer.idStr]] },
  async (i, { viewer }) => notes.createNote(viewer, oid(i.lessonId), i.timestampSeconds, i.content),
);
export async function createNoteAction(input: unknown) {
  return createNote(input);
}

const updateNote = defineAction(
  { schema: z.object({ noteId: zId, timestampSeconds: zTs, content: zNoteContent }), rate: (_i, { viewer }) => [[RULES.notesUser, viewer.idStr]] },
  async (i, { viewer }) => notes.updateNote(viewer, oid(i.noteId), i.content, i.timestampSeconds),
);
export async function updateNoteAction(input: unknown) {
  return updateNote(input);
}

const deleteNote = defineAction({ schema: z.object({ noteId: zId }) }, async (i, { viewer }) => {
  await notes.deleteNote(viewer, oid(i.noteId));
  return { ok: true };
});
export async function deleteNoteAction(input: unknown) {
  return deleteNote(input);
}
