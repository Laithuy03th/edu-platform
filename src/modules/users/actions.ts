"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { RULES } from "@/server/rate-limit";
import { defineAction, zHttpUrl, zText } from "@/server/action";
import * as svc from "./service";

const zBool = z.union([z.boolean(), z.enum(["on", "true", "false", ""])]).transform((v) => v === true || v === "on" || v === "true");

const profile = defineAction(
  {
    schema: z.object({
      displayName: zText(2, 60, "Tên hiển thị"),
      bio: z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự").default(""),
      timezone: z.string().max(64),
      learningGoal: z.string().trim().max(200, "Mục tiêu tối đa 200 ký tự").default(""),
      dataSaver: zBool.default(false),
      weeklyGoalLessons: z.coerce.number().int().min(0).max(30).default(0).transform((n) => (n > 0 ? n : null)),
    }),
    rate: (_i, { viewer }) => [[RULES.profileUser, viewer.idStr]],
  },
  async (input, { viewer }) => {
    // Chỉ truyền field allowlist; không spread input vào DB.
    await svc.updateProfile(viewer.id, {
      displayName: input.displayName,
      bio: input.bio,
      timezone: input.timezone,
      learningGoal: input.learningGoal,
      dataSaver: input.dataSaver,
      weeklyGoalLessons: input.weeklyGoalLessons,
    });
    revalidatePath("/", "layout");
    return { message: "Đã lưu hồ sơ." };
  },
);
export async function updateProfileAction(input: unknown) {
  return profile(input);
}

const publicProfile = defineAction(
  {
    auth: "verified",
    schema: z.object({
      enabled: zBool,
      handle: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9-]{3,30}$/, "Chỉ gồm chữ thường không dấu, số và dấu gạch ngang (3–30 ký tự)")
        .or(z.literal(""))
        .transform((v) => v || null),
    }),
    rate: (_i, { viewer }) => [[RULES.profileUser, viewer.idStr]],
  },
  async (input, { viewer }) => {
    const before = await svc.getProfile(viewer.id);
    await svc.updatePublicProfile(viewer.id, input.enabled, input.handle);
    for (const h of [before.publicProfile.handle, input.handle]) if (h) updateTag(`profile-handle:${h}`);
    return { message: input.enabled ? "Đã bật hồ sơ công khai." : "Hồ sơ công khai đang tắt." };
  },
);
export async function updatePublicProfileAction(input: unknown) {
  return publicProfile(input);
}

const apply = defineAction(
  {
    auth: "verified",
    schema: z.object({
      motivation: zText(50, 2000, "Lý do"),
      sampleUrl: zHttpUrl.or(z.literal("")).optional().transform((v) => v || null),
    }),
    rate: (_i, { viewer }) => [[RULES.applyInstructor, viewer.idStr]],
  },
  async (input, { viewer }) => {
    await svc.applyInstructor(viewer.id, input.motivation, input.sampleUrl ?? null);
    return { message: "Đã gửi đơn. Quản trị viên sẽ xem xét." };
  },
);
export async function applyInstructorAction(input: unknown) {
  return apply(input);
}
