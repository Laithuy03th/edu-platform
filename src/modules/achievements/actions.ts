"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { cols } from "@/server/db/models";
import { defineAction, zId } from "@/server/action";
import { setCourseOnProfile } from "./service";

const toggle = defineAction({ schema: z.object({ enrollmentId: zId, show: z.boolean() }) }, async (i, { viewer }) => {
  await setCourseOnProfile(viewer, new ObjectId(i.enrollmentId), i.show);
  const c = await cols();
  const u = await c.users.findOne({ _id: viewer.id }, { projection: { publicProfile: 1 } });
  if (u?.publicProfile.handle) updateTag(`profile-handle:${u.publicProfile.handle}`);
  revalidatePath("/achievements");
  return { ok: true };
});
export async function setCourseOnProfileAction(input: unknown) {
  return toggle(input);
}
