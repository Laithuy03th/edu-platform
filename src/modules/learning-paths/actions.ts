"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

const join = defineAction(
  { auth: "verified", schema: z.object({ pathId: zId, status: z.enum(["active", "paused", "stopped"]) }), rate: (_i, { viewer }) => [[RULES.pathUser, viewer.idStr]] },
  async (i, { viewer }) => {
    const slug = await svc.setPathEnrollment(viewer, new ObjectId(i.pathId), i.status);
    revalidatePath(`/paths/${slug}`);
    return { ok: true };
  },
);
export async function setPathEnrollmentAction(input: unknown) {
  return join(input);
}

const save = defineAction(
  {
    schema: z.object({
      pathId: zId.optional(),
      title: zText(5, 120, "Tên lộ trình"),
      goal: zText(10, 500, "Mục tiêu"),
      audience: z.string().trim().max(300),
      prerequisites: z.string().trim().max(500),
      status: z.enum(["draft", "published", "archived"]),
      featured: z.boolean(),
      items: z
        .array(
          z.object({
            itemId: z.string().max(16).optional(),
            kind: z.enum(["course", "chapter", "lesson", "milestone"]),
            refId: zId.nullable(),
            title: z.string().trim().max(150).nullable(),
            required: z.boolean(),
            dependsOn: z.array(z.string().max(16)).max(10),
          }),
        )
        .max(svc.MAX_ITEMS),
    }),
    rate: (_i, { viewer }) => [[RULES.authoringUser, viewer.idStr]],
  },
  async ({ pathId, ...input }, { viewer }) => {
    const r = await svc.savePath(viewer, pathId ? new ObjectId(pathId) : null, { ...input, items: input.items.map((it) => ({ ...it, refId: it.refId ? new ObjectId(it.refId) : null })) });
    updateTag(svc.PATHS_TAG);
    revalidatePath(`/paths/${r.slug}`);
    return r;
  },
);
export async function savePathAction(input: unknown) {
  return save(input);
}
