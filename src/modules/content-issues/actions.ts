"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { issueInput, reportIssue, resolveIssue } from "./service";

const report = defineAction(
  {
    schema: issueInput.extend({ lessonId: zId }),
    rate: (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.contentIssueUser, ctx.viewer.idStr]] as [typeof RULES.contentIssueUser, string][],
  },
  async ({ lessonId, ...input }, { viewer }) => reportIssue(viewer, new ObjectId(lessonId), input),
);
export async function reportIssueAction(input: unknown) {
  return report(input);
}

const resolve = defineAction(
  {
    schema: z.object({ issueId: zId, status: z.enum(["resolved", "wont_fix", "open"]), resolution: z.string().max(1000).default("") }),
    rate: (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][],
  },
  async ({ issueId, status, resolution }, { viewer }) => {
    await resolveIssue(viewer, new ObjectId(issueId), status, resolution);
    revalidatePath("/instructor/issues");
    return { ok: true };
  },
);
export async function resolveIssueAction(input: unknown) {
  return resolve(input);
}
