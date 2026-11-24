"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { defineAction, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import { CATALOG_TAG } from "./catalog";
import * as svc from "./authoring";
import { enroll } from "@/modules/enrollments/service";

const oid = (s: string) => new ObjectId(s);
const zLines = (maxItems: number, maxLen: number) =>
  z
    .string()
    .max(maxItems * (maxLen + 2))
    .transform((s) => s.split("\n").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(maxLen, `Mỗi dòng tối đa ${maxLen} ký tự`)).max(maxItems, `Tối đa ${maxItems} dòng`));
const zLevel = z.enum(["beginner", "intermediate", "advanced"]);
const zRev = z.coerce.number().int().min(0);
const zOptId = z.union([zId, z.literal(""), z.null()]).optional().transform((v) => (v ? oid(v) : null));
const authoringRate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.authoringUser, ctx.viewer.idStr]] as [typeof RULES.authoringUser, string][];

function invalidateCourse(courseId?: string) {
  updateTag(CATALOG_TAG);
  if (courseId) revalidatePath(`/instructor/courses/${courseId}`);
}

const create = defineAction(
  {
    auth: "instructor",
    schema: z.object({ title: zText(5, 120, "Tên khóa học"), categoryId: zOptId, level: zLevel }),
    rate: (_i, { viewer }) => [[RULES.createCourseUser, viewer.idStr]],
  },
  async (input, { viewer }) => ({ courseId: (await svc.createCourse(viewer, input)).toHexString() }),
);
export async function createCourseAction(input: unknown) {
  return create(input);
}

const updateCourse = defineAction(
  {
    schema: z.object({
      courseId: zId,
      expectedRevision: zRev,
      title: zText(5, 120, "Tên khóa học"),
      shortDescription: z.string().trim().max(200, "Mô tả ngắn tối đa 200 ký tự"),
      description: z.string().max(20000, "Mô tả tối đa 20.000 ký tự"),
      learningObjectives: zLines(10, 200),
      prerequisites: zLines(10, 200),
      categoryId: zOptId,
      level: zLevel,
      thumbnailMediaId: zOptId,
    }),
    rate: authoringRate,
  },
  async ({ courseId, expectedRevision, ...fields }, { viewer }) => {
    const revision = await svc.updateCourseDraft(viewer, oid(courseId), expectedRevision, fields);
    invalidateCourse(courseId);
    return { revision };
  },
);
export async function updateCourseAction(input: unknown) {
  return updateCourse(input);
}

const chapterSchema = z.object({
  courseId: zId,
  expectedRevision: zRev,
  chapterId: zId.optional(),
  title: zText(1, 120, "Tên chương"),
  description: z.string().trim().max(1000).default(""),
});
const saveChapter = defineAction({ schema: chapterSchema, rate: authoringRate }, async (i, { viewer }) => {
  const revision = i.chapterId
    ? await svc.updateChapter(viewer, oid(i.courseId), oid(i.chapterId), i.expectedRevision, i)
    : (await svc.createChapter(viewer, oid(i.courseId), i.expectedRevision, i)).revision;
  invalidateCourse(i.courseId);
  return { revision };
});
export async function saveChapterAction(input: unknown) {
  return saveChapter(input);
}

const removeChapter = defineAction({ schema: z.object({ courseId: zId, chapterId: zId, expectedRevision: zRev }), rate: authoringRate }, async (i, { viewer }) => {
  const revision = await svc.deleteChapter(viewer, oid(i.courseId), oid(i.chapterId), i.expectedRevision);
  invalidateCourse(i.courseId);
  return { revision };
});
export async function deleteChapterAction(input: unknown) {
  return removeChapter(input);
}

const move = defineAction(
  { schema: z.object({ courseId: zId, kind: z.enum(["chapter", "lesson"]), id: zId, direction: z.enum(["up", "down"]), expectedRevision: zRev }), rate: authoringRate },
  async (i, { viewer }) => {
    const revision =
      i.kind === "chapter"
        ? await svc.moveChapter(viewer, oid(i.courseId), oid(i.id), i.direction, i.expectedRevision)
        : await svc.moveLesson(viewer, oid(i.courseId), oid(i.id), i.direction, i.expectedRevision);
    invalidateCourse(i.courseId);
    return { revision };
  },
);
export async function moveItemAction(input: unknown) {
  return move(input);
}

const newLesson = defineAction(
  { schema: z.object({ courseId: zId, chapterId: zId, expectedRevision: zRev, title: zText(1, 120, "Tên bài"), type: z.enum(["reading", "video"]) }), rate: authoringRate },
  async (i, { viewer }) => {
    const r = await svc.createLesson(viewer, oid(i.courseId), i.expectedRevision, { chapterId: oid(i.chapterId), title: i.title, type: i.type });
    invalidateCourse(i.courseId);
    return { revision: r.revision, lessonId: r.lessonId.toHexString() };
  },
);
export async function createLessonAction(input: unknown) {
  return newLesson(input);
}

const zBool = z.union([z.boolean(), z.enum(["on", "true", "false", ""])]).transform((v) => v === true || v === "on" || v === "true");
const saveLesson = defineAction(
  {
    schema: z.object({
      courseId: zId,
      lessonId: zId,
      expectedRevision: zRev,
      chapterId: zId,
      title: zText(1, 120, "Tên bài"),
      type: z.enum(["reading", "video"]),
      objectives: zLines(5, 200),
      content: z.string().max(50000, "Nội dung tối đa 50.000 ký tự"),
      durationMinutes: z.coerce.number().min(0).max(600),
      isPreview: zBool,
      isRequired: zBool,
      mediaId: zOptId,
      transcript: z.string().max(100000).transform((s) => (s.trim() ? s : null)),
      quizId: zOptId,
      projectAssignmentId: zOptId,
    }),
    rate: authoringRate,
  },
  async (i, { viewer }) => {
    const revision = await svc.updateLesson(viewer, oid(i.courseId), oid(i.lessonId), i.expectedRevision, {
      chapterId: oid(i.chapterId),
      title: i.title,
      type: i.type,
      objectives: i.objectives,
      content: i.content,
      durationSeconds: Math.round(i.durationMinutes * 60),
      isPreview: i.isPreview,
      isRequired: i.isRequired,
      mediaId: i.mediaId,
      transcript: i.transcript,
      quizId: i.quizId,
      projectAssignmentId: i.projectAssignmentId,
    });
    invalidateCourse(i.courseId);
    return { revision };
  },
);
export async function saveLessonAction(input: unknown) {
  return saveLesson(input);
}

const removeLesson = defineAction({ schema: z.object({ courseId: zId, lessonId: zId, expectedRevision: zRev }), rate: authoringRate }, async (i, { viewer }) => {
  const revision = await svc.deleteLesson(viewer, oid(i.courseId), oid(i.lessonId), i.expectedRevision);
  invalidateCourse(i.courseId);
  return { revision };
});
export async function deleteLessonAction(input: unknown) {
  return removeLesson(input);
}

const submit = defineAction(
  { schema: z.object({ courseId: zId, expectedRevision: zRev }), rate: (_i, { viewer }) => [[RULES.submitReviewUser, viewer.idStr]] },
  async (i, { viewer }) => {
    await svc.submitForReview(viewer, oid(i.courseId), i.expectedRevision);
    invalidateCourse(i.courseId);
    return { message: "Đã gửi duyệt." };
  },
);
export async function submitForReviewAction(input: unknown) {
  return submit(input);
}

const withdraw = defineAction({ schema: z.object({ courseId: zId }) }, async (i, { viewer }) => {
  await svc.withdrawSubmission(viewer, oid(i.courseId));
  invalidateCourse(i.courseId);
  return { message: "Đã rút yêu cầu duyệt." };
});
export async function withdrawSubmissionAction(input: unknown) {
  return withdraw(input);
}

const approve = defineAction({ auth: "admin", schema: z.object({ courseId: zId, submittedRevision: zRev }) }, async (i, { viewer }) => {
  const slug = await svc.approveCourse(viewer, oid(i.courseId), i.submittedRevision);
  invalidateCourse(i.courseId);
  revalidatePath(`/courses/${slug}`);
  return { message: "Đã duyệt và xuất bản." };
});
export async function approveCourseAction(input: unknown) {
  return approve(input);
}

const reject = defineAction({ auth: "admin", schema: z.object({ courseId: zId, reason: zText(10, 1000, "Lý do") }) }, async (i, { viewer }) => {
  await svc.rejectCourse(viewer, oid(i.courseId), i.reason);
  invalidateCourse(i.courseId);
  return { message: "Đã từ chối." };
});
export async function rejectCourseAction(input: unknown) {
  return reject(input);
}

const status = defineAction(
  { schema: z.object({ courseId: zId, action: z.enum(["archive", "unarchive", "suspend", "unsuspend"]), reason: z.string().trim().max(1000).default("") }) },
  async (i, { viewer }) => {
    if (i.action === "suspend" && i.reason.length < 10) {
      throw new AppError("VALIDATION_FAILED", "Cần lý do (ít nhất 10 ký tự).", { fieldErrors: { reason: ["Cần lý do (ít nhất 10 ký tự)."] } });
    }
    await svc.setCourseStatus(viewer, oid(i.courseId), i.action, i.reason);
    invalidateCourse(i.courseId);
    return { message: "Đã cập nhật trạng thái." };
  },
);
export async function setCourseStatusAction(input: unknown) {
  return status(input);
}

const feature = defineAction({ auth: "admin", schema: z.object({ courseId: zId, rank: z.coerce.number().int().min(1).max(99).nullable() }) }, async (i, { viewer }) => {
  await svc.setFeatured(viewer, oid(i.courseId), i.rank);
  invalidateCourse();
  return { ok: true };
});
export async function setFeaturedAction(input: unknown) {
  return feature(input);
}

const enrollA = defineAction(
  { auth: "verified", schema: z.object({ courseId: zId }), rate: (_i, { viewer }) => [[RULES.enrollUser, viewer.idStr]] },
  async (i, { viewer }) => {
    const r = await enroll(viewer, oid(i.courseId));
    revalidatePath(`/courses/${r.slug}`);
    return r;
  },
);
export async function enrollAction(input: unknown) {
  return enrollA(input);
}

const changeSlug = defineAction({ schema: z.object({ courseId: zId, slug: z.string().max(100) }), rate: authoringRate }, async (i, { viewer }) => {
  const slug = await svc.changeCourseSlug(viewer, new ObjectId(i.courseId), i.slug);
  updateTag(CATALOG_TAG);
  revalidatePath(`/instructor/courses/${i.courseId}`);
  return { slug };
});
export async function changeCourseSlugAction(input: unknown) {
  return changeSlug(input);
}
