"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { ARTICLE_KINDS } from "@/server/db/models";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

type Ctx = { viewer: { idStr: string } };
const authoringRate = (_i: unknown, ctx: Ctx) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][];
const adminRate = (_i: unknown, ctx: Ctx) => [[RULES.adminUser, ctx.viewer.idStr]] as [typeof RULES.adminUser, string][];
const bust = () => {
  updateTag(svc.ARTICLES_TAG);
  revalidatePath("/huong-dan");
};

const create = defineAction({ schema: z.object({ title: z.string().trim().min(5).max(140), kind: z.enum(ARTICLE_KINDS) }), rate: authoringRate }, async (input, { viewer }) => {
  const id = await svc.createArticle(viewer, input);
  return { id: id.toHexString() };
});
export async function createArticleAction(input: unknown) {
  return create(input);
}

const save = defineAction(
  {
    schema: z.object({
      id: zId,
      expectedRevision: z.coerce.number().int().min(0),
      kind: z.enum(ARTICLE_KINDS),
      title: z.string(),
      summary: z.string(),
      content: z.string(),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      technologyIds: z.array(zId).max(8),
      testedOn: z.array(z.object({ os: z.string(), tools: z.string(), testedAt: z.string() })).max(6),
    }),
    rate: authoringRate,
  },
  async ({ id, expectedRevision, technologyIds, ...rest }, { viewer }) => {
    const revision = await svc.updateArticleDraft(viewer, new ObjectId(id), expectedRevision, {
      ...rest,
      technologyIds: technologyIds.map((x) => new ObjectId(x)),
      testedOn: rest.testedOn.map((t) => ({ ...t, testedAt: new Date(t.testedAt) })),
    } as svc.ArticleInput);
    revalidatePath(`/instructor/articles/${id}`);
    return { revision };
  },
);
export async function saveArticleAction(input: unknown) {
  return save(input);
}

const slug = defineAction({ schema: z.object({ id: zId, slug: z.string().max(100) }), rate: authoringRate }, async ({ id, slug }, { viewer }) => {
  await svc.changeArticleSlug(viewer, new ObjectId(id), slug);
  bust();
  return { ok: true };
});
export async function changeArticleSlugAction(input: unknown) {
  return slug(input);
}

const submit = defineAction({ schema: z.object({ id: zId, expectedRevision: z.coerce.number().int().min(0) }), rate: authoringRate }, async ({ id, expectedRevision }, { viewer }) => {
  await svc.submitArticle(viewer, new ObjectId(id), expectedRevision);
  revalidatePath(`/instructor/articles/${id}`);
  return { ok: true };
});
export async function submitArticleAction(input: unknown) {
  return submit(input);
}

const withdraw = defineAction({ schema: z.object({ id: zId }), rate: authoringRate }, async ({ id }, { viewer }) => {
  await svc.withdrawArticle(viewer, new ObjectId(id));
  revalidatePath(`/instructor/articles/${id}`);
  return { ok: true };
});
export async function withdrawArticleAction(input: unknown) {
  return withdraw(input);
}

const approve = defineAction({ auth: "admin", schema: z.object({ id: zId, submittedRevision: z.coerce.number().int().min(0) }), rate: adminRate }, async ({ id, submittedRevision }, { viewer }) => {
  await svc.approveArticle(viewer, new ObjectId(id), submittedRevision);
  bust();
  return { ok: true };
});
export async function approveArticleAction(input: unknown) {
  return approve(input);
}

const reject = defineAction({ auth: "admin", schema: z.object({ id: zId, reason: z.string().trim().min(5).max(1000) }), rate: adminRate }, async ({ id, reason }, { viewer }) => {
  await svc.rejectArticle(viewer, new ObjectId(id), reason);
  return { ok: true };
});
export async function rejectArticleAction(input: unknown) {
  return reject(input);
}

const archive = defineAction({ auth: "admin", schema: z.object({ id: zId, archived: z.boolean() }), rate: adminRate }, async ({ id, archived }, { viewer }) => {
  await svc.setArticleArchived(viewer, new ObjectId(id), archived);
  bust();
  return { ok: true };
});
export async function setArticleArchivedAction(input: unknown) {
  return archive(input);
}

const review = defineAction(
  { auth: "admin", schema: z.object({ id: zId, reviewerName: z.string().max(80).default(""), note: z.string().max(500).default(""), clear: z.boolean().default(false) }), rate: adminRate },
  async ({ id, reviewerName, note, clear }, { viewer }) => {
    await svc.recordArticleReview(viewer, new ObjectId(id), reviewerName, note, clear);
    bust();
    return { ok: true };
  },
);
export async function recordArticleReviewAction(input: unknown) {
  return review(input);
}
