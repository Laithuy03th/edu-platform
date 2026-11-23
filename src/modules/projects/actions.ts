"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zHttpUrl, zId, zText } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

const oid = (s: string) => new ObjectId(s);
const zLines = (max: number, len: number) => z.array(z.string().trim().min(1).max(len)).max(max);
const zOptUrl = zHttpUrl.or(z.literal(""));

const create = defineAction(
  { schema: z.object({ courseId: zId, expectedRevision: z.number().int().min(0), title: zText(3, 150, "Tên bài tập") }), rate: (_i, { viewer }) => [[RULES.authoringUser, viewer.idStr]] },
  async (i, { viewer }) => {
    const r = await svc.createAssignment(viewer, oid(i.courseId), i.expectedRevision, i.title);
    revalidatePath(`/instructor/courses/${i.courseId}`);
    return { revision: r.revision, assignmentId: r.assignmentId.toHexString() };
  },
);
export async function createAssignmentAction(input: unknown) {
  return create(input);
}

const saveDraft = defineAction(
  {
    schema: z.object({
      courseId: zId,
      assignmentId: zId,
      expectedRevision: z.number().int().min(0),
      title: zText(3, 150, "Tên bài tập"),
      brief: z.string().max(10000),
      objectives: zLines(10, 300),
      requirements: zLines(20, 300),
      checklist: zLines(20, 300),
      rubric: z
        .array(
          z.object({
            criterionId: z.string().max(32).optional(),
            title: zText(1, 150, "Tiêu chí"),
            maxPoints: z.number().int().min(1).max(100),
            passDescription: z.string().trim().max(500),
            failDescription: z.string().trim().max(500),
            skillTag: z.string().trim().max(50),
          }),
        )
        .min(1, "Cần ít nhất một tiêu chí rubric")
        .max(10),
      resources: z.array(z.object({ title: zText(1, 150, "Tên tài liệu"), url: zHttpUrl })).max(10),
      maxRounds: z.number().int().min(1).max(5),
    }),
    rate: (_i, { viewer }) => [[RULES.authoringUser, viewer.idStr]],
  },
  async ({ courseId, assignmentId, expectedRevision, ...content }, { viewer }) => {
    const revision = await svc.saveAssignmentDraft(viewer, oid(courseId), oid(assignmentId), expectedRevision, content);
    revalidatePath(`/instructor/courses/${courseId}`);
    return { revision };
  },
);
export async function saveAssignmentDraftAction(input: unknown) {
  return saveDraft(input);
}

const fields = z.object({
  repoUrl: zOptUrl,
  demoUrl: zOptUrl,
  description: z.string().trim().max(5000, "Mô tả tối đa 5000 ký tự"),
  selfAssessment: z.array(z.object({ criterionId: z.string().max(32), points: z.number().min(0).max(100), note: z.string().trim().max(500) })).max(10),
});

const saveSub = defineAction(
  { schema: fields.extend({ assignmentId: zId }), rate: (_i, { viewer }) => [[RULES.projectDraftUser, viewer.idStr]] },
  async ({ assignmentId, ...f }, { viewer }) => {
    await svc.saveSubmissionDraft(viewer, oid(assignmentId), f);
    return { message: "Đã lưu bản nháp." };
  },
);
export async function saveSubmissionDraftAction(input: unknown) {
  return saveSub(input);
}

const submit = defineAction(
  { auth: "verified", schema: z.object({ assignmentId: zId }), rate: (_i, { viewer }) => [[RULES.projectSubmitUser, viewer.idStr]] },
  async (i, { viewer }) => {
    await svc.submitProject(viewer, oid(i.assignmentId));
    revalidatePath(`/projects/${i.assignmentId}`);
    return { message: "Đã nộp bài. Giảng viên sẽ phản hồi." };
  },
);
export async function submitProjectAction(input: unknown) {
  return submit(input);
}

const review = defineAction(
  {
    schema: z.object({
      submissionId: zId,
      roundNo: z.number().int().min(1),
      scores: z.array(z.object({ criterionId: z.string().max(32), points: z.number().min(0).max(100), comment: z.string().trim().max(1000) })).max(10),
      summary: zText(10, 5000, "Nhận xét tổng"),
      decision: z.enum(["needs_changes", "accepted"]),
    }),
    rate: (_i, { viewer }) => [[RULES.authoringUser, viewer.idStr]],
  },
  async (i, { viewer }) => {
    await svc.reviewSubmission(viewer, oid(i.submissionId), i);
    revalidatePath(`/instructor/submissions/${i.submissionId}`);
    return { message: "Đã gửi đánh giá." };
  },
);
export async function reviewSubmissionAction(input: unknown) {
  return review(input);
}

const visibility = defineAction({ schema: z.object({ submissionId: zId, show: z.boolean() }) }, async (i, { viewer }) => {
  await svc.setShowOnProfile(viewer, oid(i.submissionId), i.show);
  revalidatePath("/achievements");
  return { ok: true };
});
export async function setSubmissionVisibilityAction(input: unknown) {
  return visibility(input);
}
