"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { setBookmark } from "./service";

const toggle = defineAction(
  {
    schema: z.object({ type: z.enum(["course", "lesson"]), id: zId, saved: z.boolean() }),
    rate: (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.bookmarkUser, ctx.viewer.idStr]] as [typeof RULES.bookmarkUser, string][],
  },
  async ({ type, id, saved }, { viewer }) => {
    const r = await setBookmark(viewer, type, new ObjectId(id), saved);
    revalidatePath("/saved");
    return r;
  },
);
export async function setBookmarkAction(input: unknown) {
  return toggle(input);
}
