"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";
import { playbackSource } from "./delivery";
import { refreshCloudinaryUsage, refreshMongoUsage } from "./usage";
import { updateSettings } from "./settings";

const reqUpload = defineAction(
  {
    schema: z.object({
      courseId: zId,
      purpose: z.enum(["course_thumbnail", "lesson_image", "lesson_video", "preview_video"]),
      fileName: z.string().max(200),
      declaredBytes: z.number().int().positive(),
      declaredType: z.string().max(100),
      declaredDurationSeconds: z.number().positive().max(36000).nullable(),
    }),
    rate: (_i, { viewer }) => [[RULES.uploadUser, viewer.idStr]],
  },
  async (i, { viewer }) => svc.requestUpload(viewer, { ...i, courseId: new ObjectId(i.courseId) }),
);
export async function requestUploadAction(input: unknown) {
  return reqUpload(input);
}

const finalize = defineAction(
  { schema: z.object({ reservationId: zId }), rate: (_i, { viewer }) => [[RULES.finalizeUser, viewer.idStr]] },
  async (i, { viewer }) => svc.finalizeReservation(new ObjectId(i.reservationId), { userId: viewer.id }),
);
export async function finalizeUploadAction(input: unknown) {
  return finalize(input);
}

const cancel = defineAction({ schema: z.object({ reservationId: zId }) }, async (i, { viewer }) => {
  await svc.cancelReservation(viewer, new ObjectId(i.reservationId));
  return { ok: true };
});
export async function cancelUploadAction(input: unknown) {
  return cancel(input);
}

const del = defineAction({ schema: z.object({ mediaId: zId, courseId: zId }), rate: (_i, { viewer }) => [[RULES.authoringUser, viewer.idStr]] }, async (i, { viewer }) => {
  await svc.requestDeleteMedia(viewer, new ObjectId(i.mediaId));
  revalidatePath(`/instructor/courses/${i.courseId}/media`);
  return { ok: true };
});
export async function deleteMediaAction(input: unknown) {
  return del(input);
}

const play = defineAction(
  { auth: "public", schema: z.object({ lessonId: zId }), rate: (_i, { viewer, req }) => [[RULES.playbackUser, viewer?.idStr ?? req.ip]] },
  async (i, { viewer }) => playbackSource(viewer, new ObjectId(i.lessonId)),
);
export async function getPlaybackSourceAction(input: unknown) {
  return play(input);
}

const refresh = defineAction({ auth: "admin", schema: z.object({}), rate: () => [[RULES.usageRefresh, "global"]] }, async (_i, { viewer }) => {
  const [cl, mg] = await Promise.all([refreshCloudinaryUsage(viewer.id), refreshMongoUsage(viewer.id)]);
  revalidatePath("/admin/media");
  return { cloudinaryOk: cl.ok, mongoOk: mg.ok, error: cl.error ?? mg.error };
});
export async function refreshUsageAction(input: unknown) {
  return refresh(input);
}

const killSwitches = defineAction(
  { auth: "admin", schema: z.object({ expectedVersion: z.number().int().min(0), uploadsEnabled: z.boolean(), playbackIssuanceEnabled: z.boolean(), eagerTransformationsEnabled: z.boolean() }) },
  async ({ expectedVersion, ...values }, { viewer }) => {
    await updateSettings(viewer.id, "killSwitches", expectedVersion, values);
    revalidatePath("/admin/media");
    return { ok: true };
  },
);
export async function updateKillSwitchesAction(input: unknown) {
  return killSwitches(input);
}

const MiB = 1024 * 1024;
const limits = defineAction(
  {
    auth: "admin",
    schema: z.object({
      expectedVersion: z.number().int().min(0),
      videoMaxBytes: z.number().int().min(MiB).max(100 * MiB),
      videoMaxSeconds: z.number().int().min(10).max(3600),
      imageMaxBytes: z.number().int().min(100 * 1024).max(10 * MiB),
      videosPerCourse: z.number().int().min(0).max(100),
      coursesWithVideo: z.number().int().min(0).max(100),
      storageBytes: z.number().int().min(MiB).max(20 * 1024 * MiB),
    }),
  },
  async ({ expectedVersion, ...values }, { viewer }) => {
    await updateSettings(viewer.id, "limits", expectedVersion, values);
    revalidatePath("/admin/media");
    return { ok: true };
  },
);
export async function updateLimitsAction(input: unknown) {
  return limits(input);
}

const budget = defineAction(
  {
    auth: "admin",
    schema: z.object({
      expectedVersion: z.number().int().min(0),
      cloudinaryCredits: z.number().min(1).max(25),
      mongodbBytes: z.number().int().min(10 * MiB).max(512 * MiB),
      usageStaleAfterMinutes: z.number().int().min(15).max(10080),
    }),
  },
  async ({ expectedVersion, ...values }, { viewer }) => {
    await updateSettings(viewer.id, "budget", expectedVersion, values);
    revalidatePath("/admin/media");
    return { ok: true };
  },
);
export async function updateBudgetAction(input: unknown) {
  return budget(input);
}

const deletionQueue = defineAction({ auth: "admin", schema: z.object({}) }, async () => ({ results: await svc.processDeletionQueue(20) }));
export async function processDeletionQueueAction(input: unknown) {
  return deletionQueue(input);
}

const reconcileA = defineAction({ auth: "admin", schema: z.object({ apply: z.boolean() }) }, async (i) => ({ report: await svc.reconcile({ apply: i.apply }) }));
export async function reconcileAction(input: unknown) {
  return reconcileA(input);
}

const imageMeta = defineAction(
  {
    schema: z.object({ mediaId: zId, alt: z.string().max(200), caption: z.string().max(300).default(""), credit: z.string().max(120).default(""), license: z.string().max(80).default("") }),
    rate: (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][],
  },
  async ({ mediaId, ...meta }, { viewer }) => {
    await svc.updateImageMeta(viewer, new ObjectId(mediaId), meta);
    return { ok: true };
  },
);
export async function updateImageMetaAction(input: unknown) {
  return imageMeta(input);
}
