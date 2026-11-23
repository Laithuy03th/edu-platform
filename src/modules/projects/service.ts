import "server-only";
import { randomUUID } from "node:crypto";
import type { ObjectId } from "mongodb";
import { AppError, notFound } from "@/lib/errors";
import { cols, type AssignmentContent, type SubmissionFields } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { loadEditableCourse, touchCourseDraft } from "@/modules/courses/authoring";
import { canViewSubmission, toPolicyCourse } from "@/modules/courses/policy";
import { requireLessonAccess } from "@/modules/learning/access";
import { rubricTotal } from "./rubric";

/* ============ Giảng viên soạn đề ============ */

export async function createAssignment(viewer: Viewer, courseId: ObjectId, expectedRevision: number, title: string) {
  const revision = await touchCourseDraft(viewer, courseId, expectedRevision);
  const c = await cols();
  const now = new Date();
  const res = await c.projectAssignments.insertOne({
    courseId,
    draft: { title, brief: "", objectives: [], requirements: [], checklist: [], rubric: [], resources: [], maxRounds: 3, deleted: false },
    published: null,
    createdAt: now,
    updatedAt: now,
  });
  return { revision, assignmentId: res.insertedId };
}

export async function saveAssignmentDraft(viewer: Viewer, courseId: ObjectId, assignmentId: ObjectId, expectedRevision: number, input: Omit<AssignmentContent, "rubric"> & { rubric: (Omit<AssignmentContent["rubric"][number], "criterionId"> & { criterionId?: string })[] }) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: assignmentId, courseId });
  if (!a?.draft || a.draft.deleted) throw notFound("Không tìm thấy bài tập");
  const oldIds = new Set(a.draft.rubric.map((r) => r.criterionId));
  const rubric = input.rubric.map((r) => ({ ...r, criterionId: r.criterionId && oldIds.has(r.criterionId) ? r.criterionId : randomUUID().slice(0, 8) }));
  const revision = await touchCourseDraft(viewer, courseId, expectedRevision);
  await c.projectAssignments.updateOne({ _id: assignmentId }, { $set: { draft: { ...input, rubric, deleted: false }, updatedAt: new Date() } });
  return revision;
}

export async function getAssignmentForEditor(viewer: Viewer, courseId: ObjectId, assignmentId: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: assignmentId, courseId });
  if (!a?.draft) throw notFound("Không tìm thấy bài tập");
  return a;
}

/* ============ Học viên ============ */

async function lessonOfAssignment(assignmentId: ObjectId) {
  const c = await cols();
  const lesson = await c.lessons.findOne({ "published.projectAssignmentId": assignmentId }, { projection: { _id: 1 } });
  if (!lesson) throw notFound("Không tìm thấy bài tập");
  return lesson._id;
}

/** Đề bài (bản published) + bài nộp của chính học viên. Cần quyền học bài chứa đề. */
export async function getAssignmentForStudent(viewer: Viewer, assignmentId: ObjectId) {
  const { course, lesson } = await requireLessonAccess(viewer, await lessonOfAssignment(assignmentId));
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: assignmentId, published: { $ne: null } });
  if (!a?.published) throw notFound("Không tìm thấy bài tập");
  const submission = await c.projectSubmissions.findOne({ userId: viewer.id, assignmentId });
  return { course: { slug: course.slug, title: course.published?.title ?? "" }, lessonId: lesson._id.toHexString(), assignment: a.published, submission };
}

const EMPTY: SubmissionFields = { repoUrl: "", demoUrl: "", description: "", selfAssessment: [] };

export async function saveSubmissionDraft(viewer: Viewer, assignmentId: ObjectId, fields: SubmissionFields) {
  const { course } = await requireLessonAccess(viewer, await lessonOfAssignment(assignmentId));
  const c = await cols();
  const now = new Date();
  const existing = await c.projectSubmissions.findOne({ userId: viewer.id, assignmentId });
  if (existing && !["draft", "needs_changes"].includes(existing.status)) throw new AppError("INVALID_STATE", "Bài đã nộp, đang chờ chấm hoặc đã chấm xong.");
  await c.projectSubmissions.updateOne(
    { userId: viewer.id, assignmentId },
    { $set: { draftFields: fields, updatedAt: now }, $setOnInsert: { userId: viewer.id, assignmentId, courseId: course._id, status: "draft", rounds: [], showOnProfile: false, skills: [], createdAt: now } },
    { upsert: true },
  );
}

/** Nộp bài: draft → submitted; needs_changes → resubmitted; giới hạn số vòng (maxRounds). */
export async function submitProject(viewer: Viewer, assignmentId: ObjectId) {
  await requireLessonAccess(viewer, await lessonOfAssignment(assignmentId));
  if (!viewer.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi nộp bài.");
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: assignmentId });
  const sub = await c.projectSubmissions.findOne({ userId: viewer.id, assignmentId });
  if (!a?.published || !sub) throw new AppError("INVALID_STATE", "Hãy lưu bài trước khi nộp.");
  if (!sub.draftFields.repoUrl && !sub.draftFields.demoUrl) throw new AppError("VALIDATION_FAILED", "Cần ít nhất link GitHub hoặc link demo.");
  if (!["draft", "needs_changes"].includes(sub.status)) throw new AppError("INVALID_STATE", "Bài đang chờ chấm hoặc đã chấm xong.");
  if (sub.rounds.length >= a.published.maxRounds) throw new AppError("LIMIT_REACHED", `Đã hết ${a.published.maxRounds} lượt nộp.`);
  const next = sub.status === "draft" ? "submitted" : "resubmitted";
  const res = await c.projectSubmissions.updateOne(
    { _id: sub._id, status: sub.status, rounds: { $size: sub.rounds.length } },
    { $set: { status: next, updatedAt: new Date() }, $push: { rounds: { ...sub.draftFields, roundNo: sub.rounds.length + 1, submittedAt: new Date(), feedback: null } } },
  );
  if (res.modifiedCount !== 1) throw new AppError("CONFLICT", "Bài vừa được nộp ở nơi khác.");
}

/* ============ Giảng viên chấm ============ */

async function loadSubmissionForStaff(viewer: Viewer, submissionId: ObjectId) {
  const c = await cols();
  const sub = await c.projectSubmissions.findOne({ _id: submissionId });
  if (!sub) throw notFound("Không tìm thấy bài nộp");
  const course = await c.courses.findOne({ _id: sub.courseId });
  if (!course || !canViewSubmission(viewer, sub.userId, toPolicyCourse(course))) throw notFound("Không tìm thấy bài nộp");
  return { sub, course };
}

export async function getSubmission(viewer: Viewer, submissionId: ObjectId) {
  const { sub, course } = await loadSubmissionForStaff(viewer, submissionId);
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: sub.assignmentId });
  const learner = await c.users.findOne({ _id: sub.userId }, { projection: { displayName: 1 } }); // không trả email cho giảng viên
  return { sub, course, assignment: a?.published ?? a?.draft ?? null, learnerName: learner?.displayName ?? "Học viên", isStaff: !sub.userId.equals(viewer.id) };
}

export async function reviewSubmission(viewer: Viewer, submissionId: ObjectId, input: { roundNo: number; scores: { criterionId: string; points: number; comment: string }[]; summary: string; decision: "needs_changes" | "accepted" }) {
  const { sub, course } = await loadSubmissionForStaff(viewer, submissionId);
  if (sub.userId.equals(viewer.id)) throw new AppError("FORBIDDEN", "Không tự chấm bài của mình.");
  if (!viewer.roles.includes("admin") && !course.instructorId.equals(viewer.id)) throw notFound("Không tìm thấy bài nộp");
  if (!["submitted", "resubmitted"].includes(sub.status)) throw new AppError("INVALID_STATE", "Bài không ở trạng thái chờ chấm.");
  if (input.roundNo !== sub.rounds.length) throw new AppError("STALE_REVISION", "Học viên vừa nộp vòng mới. Tải lại trang.");
  const c = await cols();
  const a = await c.projectAssignments.findOne({ _id: sub.assignmentId });
  const rubric = a?.published?.rubric ?? [];
  const t = rubricTotal(rubric, input.scores);
  if (t.problems.length) throw new AppError("VALIDATION_FAILED", t.problems[0]!, { details: t.problems });
  const status = input.decision === "accepted" ? "reviewed" : "needs_changes";
  const res = await c.projectSubmissions.updateOne(
    { _id: submissionId, status: sub.status, rounds: { $size: input.roundNo } },
    {
      $set: {
        status,
        [`rounds.${input.roundNo - 1}.feedback`]: { reviewerId: viewer.id, reviewedAt: new Date(), scores: input.scores, totalPoints: t.total, maxPoints: t.maxPoints, summary: input.summary, decision: input.decision },
        skills: input.decision === "accepted" ? [...new Set(rubric.map((r) => r.skillTag).filter(Boolean))] : sub.skills,
        updatedAt: new Date(),
      },
    },
  );
  if (res.modifiedCount !== 1) throw new AppError("CONFLICT", "Bài nộp vừa thay đổi. Tải lại trang.");
  await audit({ actorId: viewer.id, action: "project.review", targetType: "projectSubmission", targetId: submissionId, meta: { decision: input.decision, total: t.total } });
}

export async function setShowOnProfile(viewer: Viewer, submissionId: ObjectId, show: boolean) {
  const c = await cols();
  const sub = await c.projectSubmissions.findOne({ _id: submissionId, userId: viewer.id });
  if (!sub) throw notFound("Không tìm thấy bài nộp");
  if (show && sub.status !== "reviewed") throw new AppError("INVALID_STATE", "Chỉ bài đã được đánh giá đạt mới hiển thị trên hồ sơ.");
  await c.projectSubmissions.updateOne({ _id: submissionId, userId: viewer.id }, { $set: { showOnProfile: show, updatedAt: new Date() } });
}

export async function mySubmissions(viewer: Viewer) {
  const c = await cols();
  const subs = await c.projectSubmissions.find({ userId: viewer.id }).sort({ updatedAt: -1 }).limit(50).toArray();
  const assignments = await c.projectAssignments.find({ _id: { $in: subs.map((s) => s.assignmentId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const courses = await c.courses.find({ _id: { $in: subs.map((s) => s.courseId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const at = new Map(assignments.map((a) => [a._id.toHexString(), a.published?.title ?? "Bài tập"]));
  const ct = new Map(courses.map((x) => [x._id.toHexString(), x.published?.title ?? "Khóa học"]));
  return subs.map((s) => {
    const last = s.rounds.at(-1);
    return {
      id: s._id.toHexString(),
      assignmentId: s.assignmentId.toHexString(),
      title: at.get(s.assignmentId.toHexString()) ?? "Bài tập",
      courseTitle: ct.get(s.courseId.toHexString()) ?? "",
      status: s.status,
      rounds: s.rounds.length,
      lastScore: last?.feedback ? `${last.feedback.totalPoints}/${last.feedback.maxPoints}` : null,
      showOnProfile: s.showOnProfile,
    };
  });
}

/** Hàng chờ chấm: chỉ khóa giảng viên sở hữu (admin: tất cả). Không lộ email học viên. */
export async function reviewQueue(viewer: Viewer) {
  const c = await cols();
  const courseFilter = viewer.roles.includes("admin") ? {} : { instructorId: viewer.id };
  const courses = await c.courses.find(courseFilter).project<{ _id: ObjectId; published: { title: string } | null; draft: { title: string } }>({ "published.title": 1, "draft.title": 1 }).toArray();
  const subs = await c.projectSubmissions.find({ courseId: { $in: courses.map((x) => x._id) }, status: { $in: ["submitted", "resubmitted"] } }).sort({ updatedAt: 1 }).limit(100).toArray();
  const users = await c.users.find({ _id: { $in: subs.map((s) => s.userId) } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray();
  const un = new Map(users.map((u) => [u._id.toHexString(), u.displayName]));
  const ct = new Map(courses.map((x) => [x._id.toHexString(), x.published?.title ?? x.draft.title]));
  return subs.map((s) => ({ id: s._id.toHexString(), learner: un.get(s.userId.toHexString()) ?? "Học viên", course: ct.get(s.courseId.toHexString()) ?? "", status: s.status, round: s.rounds.length, submittedAt: s.rounds.at(-1)?.submittedAt.toISOString() ?? null }));
}

export { EMPTY as EMPTY_SUBMISSION };
