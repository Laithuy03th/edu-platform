"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

const oid = (s: string) => new ObjectId(s);
const qaRate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.qaUser, ctx.viewer.idStr]] as [typeof RULES.qaUser, string][];

const ask = defineAction({ auth: "verified", schema: z.object({ lessonId: zId, title: zText(5, 150, "Tiêu đề"), body: zText(10, 5000, "Nội dung") }), rate: qaRate }, async (i, { viewer }) => {
  await svc.createQuestion(viewer, oid(i.lessonId), i.title, i.body);
  return { ok: true };
});
export async function askQuestionAction(input: unknown) {
  return ask(input);
}

const answer = defineAction({ auth: "verified", schema: z.object({ questionId: zId, body: zText(2, 5000, "Câu trả lời") }), rate: qaRate }, async (i, { viewer }) => {
  await svc.createAnswer(viewer, oid(i.questionId), i.body);
  return { ok: true };
});
export async function answerQuestionAction(input: unknown) {
  return answer(input);
}

const accept = defineAction({ schema: z.object({ answerId: zId, accept: z.boolean() }) }, async (i, { viewer }) => {
  await svc.acceptAnswer(viewer, oid(i.answerId), i.accept);
  return { ok: true };
});
export async function acceptAnswerAction(input: unknown) {
  return accept(input);
}

const helpful = defineAction({ schema: z.object({ answerId: zId, helpful: z.boolean() }) }, async (i, { viewer }) => {
  await svc.markHelpful(viewer, oid(i.answerId), i.helpful);
  return { ok: true };
});
export async function markHelpfulAction(input: unknown) {
  return helpful(input);
}

const removeOwn = defineAction({ schema: z.object({ target: z.enum(["question", "answer"]), id: zId }) }, async (i, { viewer }) => {
  await svc.deleteOwn(viewer, i.target, oid(i.id));
  return { ok: true };
});
export async function deleteOwnPostAction(input: unknown) {
  return removeOwn(input);
}

const report = defineAction(
  { schema: z.object({ targetType: z.enum(["question", "answer", "review"]), targetId: zId, reason: z.enum(["spam", "abuse", "off_topic", "other"]), note: z.string().trim().max(500).default("") }), rate: (_i, { viewer }) => [[RULES.reportUser, viewer.idStr]] },
  async (i, { viewer }) => {
    await svc.reportContent(viewer, i.targetType, oid(i.targetId), i.reason, i.note);
    return { ok: true };
  },
);
export async function reportContentAction(input: unknown) {
  return report(input);
}

const moderate = defineAction(
  { auth: "admin", schema: z.object({ targetType: z.enum(["question", "answer", "review"]), targetId: zId, action: z.enum(["hide", "unhide", "dismiss"]), reason: zText(3, 500, "Lý do") }) },
  async (i, { viewer }) => {
    await svc.moderate(viewer, i.targetType, oid(i.targetId), i.action, i.reason);
    return { ok: true };
  },
);
export async function moderateAction(input: unknown) {
  return moderate(input);
}
