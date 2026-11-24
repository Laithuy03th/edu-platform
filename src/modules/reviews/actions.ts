"use server";

import { updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { CATALOG_TAG } from "@/modules/courses/catalog";
import * as svc from "./service";

const upsert = defineAction(
  {
    auth: "verified",
    schema: z.object({ courseId: zId, rating: z.coerce.number().int().min(1, "Chọn số sao").max(5), comment: z.string().trim().max(2000, "Tối đa 2000 ký tự").default("") }),
    rate: (_i, { viewer }) => [[RULES.courseReviewUser, viewer.idStr]],
  },
  async (i, { viewer }) => {
    await svc.upsertReview(viewer, new ObjectId(i.courseId), i.rating, i.comment);
    updateTag(CATALOG_TAG);
    return { message: "Đã lưu đánh giá." };
  },
);
export async function upsertReviewAction(input: unknown) {
  return upsert(input);
}

const remove = defineAction({ schema: z.object({ courseId: zId }) }, async (i, { viewer }) => {
  await svc.deleteMyReview(viewer, new ObjectId(i.courseId));
  updateTag(CATALOG_TAG);
  return { message: "Đã xóa đánh giá." };
});
export async function deleteReviewAction(input: unknown) {
  return remove(input);
}

const moderate = defineAction({ auth: "admin", schema: z.object({ reviewId: zId, action: z.enum(["hide", "unhide"]), reason: zText(5, 500, "Lý do") }) }, async (i, { viewer }) => {
  await svc.moderateReview(viewer, new ObjectId(i.reviewId), i.action, i.reason);
  updateTag(CATALOG_TAG);
  return { ok: true };
});
export async function moderateReviewAction(input: unknown) {
  return moderate(input);
}
