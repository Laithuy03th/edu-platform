"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

type Ctx = { viewer: { idStr: string } };
const rate = (_i: unknown, ctx: Ctx) => [[RULES.exerciseUser, ctx.viewer.idStr]] as [typeof RULES.exerciseUser, string][];
const authoringRate = (_i: unknown, ctx: Ctx) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][];

const hint = defineAction({ schema: z.object({ id: zId }), rate }, async ({ id }, { viewer }) => svc.requestHint(viewer, new ObjectId(id)));
export async function requestHintAction(input: unknown) {
  return hint(input);
}

const answer = defineAction({ schema: svc.answerInput.extend({ id: zId }), rate }, async ({ id, ...a }, { viewer }) => svc.submitAnswer(viewer, new ObjectId(id), a));
export async function submitExerciseAction(input: unknown) {
  return answer(input);
}

const reveal = defineAction({ schema: z.object({ id: zId }), rate }, async ({ id }, { viewer }) => svc.revealSolution(viewer, new ObjectId(id)));
export async function revealSolutionAction(input: unknown) {
  return reveal(input);
}

const upsert = defineAction(
  { schema: z.object({ courseId: zId, lessonId: zId, id: zId.nullable(), data: svc.exerciseInput }), rate: authoringRate },
  async ({ courseId, lessonId, id, data }, { viewer }) => {
    const r = await svc.upsertExercise(viewer, new ObjectId(courseId), new ObjectId(lessonId), id ? new ObjectId(id) : null, data);
    revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
    return { id: r.toHexString() };
  },
);
export async function upsertExerciseAction(input: unknown) {
  return upsert(input);
}

const del = defineAction({ schema: z.object({ courseId: zId, lessonId: zId, id: zId }), rate: authoringRate }, async ({ courseId, lessonId, id }, { viewer }) => {
  await svc.deleteExercise(viewer, new ObjectId(courseId), new ObjectId(id));
  revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  return { ok: true };
});
export async function deleteExerciseAction(input: unknown) {
  return del(input);
}
