"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { ANNOUNCEMENT_TAG, announcementFields, checkAnnouncement, updateAnnouncement } from "./announcement";

const save = defineAction(
  {
    auth: "admin",
    schema: announcementFields.extend({ expectedVersion: z.coerce.number().int().min(0) }).superRefine(checkAnnouncement),
    rate: (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.adminUser, ctx.viewer.idStr]] as [typeof RULES.adminUser, string][],
  },
  async ({ expectedVersion, ...values }, { viewer }) => {
    const version = await updateAnnouncement(viewer, expectedVersion, values);
    updateTag(ANNOUNCEMENT_TAG);
    revalidatePath("/admin/site");
    return { version };
  },
);
export async function saveAnnouncementAction(input: unknown) {
  return save(input);
}
