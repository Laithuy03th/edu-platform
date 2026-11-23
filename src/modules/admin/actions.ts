"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { CATALOG_TAG } from "@/modules/courses/catalog";
import { restoreEnrollment, revokeEnrollment } from "@/modules/enrollments/service";
import * as svc from "./service";

const rate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.adminUser, ctx.viewer.idStr]] as [typeof RULES.adminUser, string][];

const status = defineAction({ auth: "admin", schema: z.object({ userId: zId, status: z.enum(["active", "blocked"]), reason: z.string().trim().max(500).default("") }), rate }, async (i, { viewer }) => {
  await svc.setUserStatus(viewer, new ObjectId(i.userId), i.status, i.reason);
  revalidatePath("/admin/users");
  return { ok: true };
});
export async function setUserStatusAction(input: unknown) {
  return status(input);
}

const roles = defineAction({ auth: "admin", schema: z.object({ userId: zId, roles: z.array(z.enum(["student", "instructor", "admin"])).max(3) }), rate }, async (i, { viewer }) => {
  await svc.setUserRoles(viewer, new ObjectId(i.userId), i.roles);
  revalidatePath("/admin/users");
  return { ok: true };
});
export async function setUserRolesAction(input: unknown) {
  return roles(input);
}

const decide = defineAction({ auth: "admin", schema: z.object({ applicationId: zId, decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(1000).default("") }), rate }, async (i, { viewer }) => {
  await svc.decideApplication(viewer, new ObjectId(i.applicationId), i.decision, i.reason);
  revalidatePath("/admin/instructor-applications");
  return { ok: true };
});
export async function decideApplicationAction(input: unknown) {
  return decide(input);
}

const category = defineAction(
  { auth: "admin", schema: z.object({ id: zId.optional(), name: zText(2, 60, "Tên chủ đề"), order: z.number().int().min(0).max(999), isActive: z.boolean() }), rate },
  async (i, { viewer }) => {
    await svc.upsertCategory(viewer, i.id ? new ObjectId(i.id) : null, { name: i.name, order: i.order, isActive: i.isActive });
    revalidateTag(CATALOG_TAG, "max");
    revalidatePath("/admin/categories");
    return { ok: true };
  },
);
export async function upsertCategoryAction(input: unknown) {
  return category(input);
}

const enrollment = defineAction({ auth: "admin", schema: z.object({ enrollmentId: zId, action: z.enum(["revoke", "restore"]), reason: z.string().trim().max(500).default("") }), rate }, async (i, { viewer }) => {
  if (i.action === "revoke") {
    if (i.reason.length < 5) throw new AppError("VALIDATION_FAILED", "Cần lý do thu hồi.");
    await revokeEnrollment(viewer, new ObjectId(i.enrollmentId), i.reason);
  } else await restoreEnrollment(viewer, new ObjectId(i.enrollmentId));
  revalidatePath("/admin/courses");
  return { ok: true };
});
export async function setEnrollmentStatusAction(input: unknown) {
  return enrollment(input);
}
