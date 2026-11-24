"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { CATALOG_TAG } from "@/modules/courses/catalog";
import * as svc from "./service";

const adminRate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.adminUser, ctx.viewer.idStr]] as [typeof RULES.adminUser, string][];
const authoringRate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][];

const upsert = defineAction({ auth: "admin", schema: svc.technologyInput.extend({ id: zId.optional() }), rate: adminRate }, async ({ id, ...input }, { viewer }) => {
  await svc.upsertTechnology(viewer, id ? new ObjectId(id) : null, input);
  updateTag(CATALOG_TAG);
  revalidatePath("/admin/technologies");
  return { ok: true };
});
export async function upsertTechnologyAction(input: unknown) {
  return upsert(input);
}

const setCourseTech = defineAction(
  { schema: z.object({ courseId: zId, expectedRevision: z.coerce.number().int().min(0), items: svc.courseTechnologiesInput }), rate: authoringRate },
  async ({ courseId, expectedRevision, items }, { viewer }) => {
    const revision = await svc.setCourseTechnologies(
      viewer,
      new ObjectId(courseId),
      expectedRevision,
      items.map((i) => ({ technologyId: new ObjectId(i.technologyId), testedVersion: i.testedVersion })),
    );
    revalidatePath(`/instructor/courses/${courseId}`);
    return { revision };
  },
);
export async function setCourseTechnologiesAction(input: unknown) {
  return setCourseTech(input);
}

const review = defineAction(
  {
    auth: "admin",
    schema: z.object({
      courseId: zId,
      clear: z.boolean().default(false),
      reviewerName: z.string().trim().max(80).default(""),
      note: z.string().trim().max(500).default(""),
    }),
    rate: adminRate,
  },
  async ({ courseId, clear, reviewerName, note }, { viewer }) => {
    if (!clear && reviewerName.length < 2) {
      throw new AppError("VALIDATION_FAILED", "Nhập tên người review chuyên môn.", { fieldErrors: { reviewerName: ["Nhập tên người review."] } });
    }
    await svc.recordContentReview(viewer, new ObjectId(courseId), clear ? null : { reviewerName, note });
    updateTag(CATALOG_TAG);
    revalidatePath(`/admin/courses/${courseId}`);
    return { ok: true };
  },
);
export async function recordContentReviewAction(input: unknown) {
  return review(input);
}
