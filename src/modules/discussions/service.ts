import "server-only";
import type { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { cols, type ReportTarget } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccess } from "@/modules/learning/access";

export const QA_PAGE_SIZE = 10;

/** Hỏi đáp chỉ dành cho người có quyền học bài (D11) — kể cả để ĐỌC. */
export async function listQuestions(viewer: Viewer, lessonId: ObjectId, page = 1) {
  const { course } = await requireLessonAccess(viewer, lessonId);
  const c = await cols();
  const filter = { lessonId, status: "visible" as const };
  const [qs, total] = await Promise.all([c.questions.find(filter).sort({ lastActivityAt: -1 }).skip((page - 1) * QA_PAGE_SIZE).limit(QA_PAGE_SIZE).toArray(), c.questions.countDocuments(filter)]);
  const answers = await c.answers.find({ questionId: { $in: qs.map((q) => q._id) }, status: "visible" }).sort({ createdAt: 1 }).limit(200).toArray();
  const userIds = [...qs.map((q) => q.authorId), ...answers.map((a) => a.authorId)];
  const users = await c.users.find({ _id: { $in: userIds } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray();
  const name = new Map(users.map((u) => [u._id.toHexString(), u.displayName]));
  const isOwner = course.instructorId.equals(viewer.id);
  return {
    total,
    isInstructor: isOwner,
    items: qs.map((q) => ({
      id: q._id.toHexString(),
      title: q.title,
      body: q.body,
      author: name.get(q.authorId.toHexString()) ?? "Học viên",
      mine: q.authorId.equals(viewer.id),
      acceptedAnswerId: q.acceptedAnswerId?.toHexString() ?? null,
      createdAt: q.createdAt.toISOString(),
      answers: answers
        .filter((a) => a.questionId.equals(q._id))
        .map((a) => ({
          id: a._id.toHexString(),
          body: a.body,
          author: name.get(a.authorId.toHexString()) ?? "Học viên",
          isInstructor: a.isInstructor,
          helpful: Boolean(a.markedHelpfulBy),
          mine: a.authorId.equals(viewer.id),
          createdAt: a.createdAt.toISOString(),
        })),
    })),
  };
}

export async function createQuestion(viewer: Viewer, lessonId: ObjectId, title: string, body: string) {
  if (!viewer.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi đặt câu hỏi.");
  const { course } = await requireLessonAccess(viewer, lessonId);
  const c = await cols();
  const now = new Date();
  await c.questions.insertOne({ courseId: course._id, lessonId, authorId: viewer.id, title, body, status: "visible", hiddenReason: null, acceptedAnswerId: null, answerCount: 0, hasInstructorAnswer: false, lastActivityAt: now, createdAt: now, updatedAt: now });
}

async function loadQuestion(viewer: Viewer, questionId: ObjectId) {
  const c = await cols();
  const q = await c.questions.findOne({ _id: questionId, status: "visible" });
  if (!q) throw notFound("Không tìm thấy câu hỏi");
  const { course } = await requireLessonAccess(viewer, q.lessonId);
  return { q, course };
}

export async function createAnswer(viewer: Viewer, questionId: ObjectId, body: string) {
  if (!viewer.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi trả lời.");
  const { q, course } = await loadQuestion(viewer, questionId);
  const c = await cols();
  const isInstructor = course.instructorId.equals(viewer.id);
  const now = new Date();
  await c.answers.insertOne({ questionId, courseId: q.courseId, authorId: viewer.id, body, isInstructor, markedHelpfulBy: null, status: "visible", hiddenReason: null, createdAt: now, updatedAt: now });
  await c.questions.updateOne({ _id: questionId }, { $inc: { answerCount: 1 }, $set: { lastActivityAt: now, ...(isInstructor ? { hasInstructorAnswer: true } : {}) } });
}

/** Chỉ tác giả câu hỏi chấp nhận/bỏ chấp nhận câu trả lời. */
export async function acceptAnswer(viewer: Viewer, answerId: ObjectId, accept: boolean) {
  const c = await cols();
  const a = await c.answers.findOne({ _id: answerId, status: "visible" });
  if (!a) throw notFound("Không tìm thấy câu trả lời");
  const { q } = await loadQuestion(viewer, a.questionId);
  if (!q.authorId.equals(viewer.id)) throw new AppError("FORBIDDEN", "Chỉ người hỏi được chấp nhận câu trả lời.");
  await c.questions.updateOne({ _id: q._id }, { $set: { acceptedAnswerId: accept ? answerId : null, updatedAt: new Date() } });
}

/** Chỉ giảng viên của khóa đánh dấu/bỏ đánh dấu "hữu ích". */
export async function markHelpful(viewer: Viewer, answerId: ObjectId, helpful: boolean) {
  const c = await cols();
  const a = await c.answers.findOne({ _id: answerId, status: "visible" });
  if (!a) throw notFound("Không tìm thấy câu trả lời");
  const { course } = await loadQuestion(viewer, a.questionId);
  if (!course.instructorId.equals(viewer.id)) throw new AppError("FORBIDDEN", "Chỉ giảng viên của khóa được đánh dấu.");
  await c.answers.updateOne({ _id: answerId }, { $set: { markedHelpfulBy: helpful ? viewer.id : null, updatedAt: new Date() } });
}

/** Tác giả sửa/xóa nội dung của mình. */
export async function editOwn(viewer: Viewer, target: "question" | "answer", id: ObjectId, body: string, title?: string) {
  const c = await cols();
  if (target === "question") {
    const r = await c.questions.updateOne({ _id: id, authorId: viewer.id, status: "visible" }, { $set: { body, ...(title ? { title } : {}), updatedAt: new Date() } });
    if (r.matchedCount === 0) throw notFound();
  } else {
    const r = await c.answers.updateOne({ _id: id, authorId: viewer.id, status: "visible" }, { $set: { body, updatedAt: new Date() } });
    if (r.matchedCount === 0) throw notFound();
  }
}

export async function deleteOwn(viewer: Viewer, target: "question" | "answer", id: ObjectId) {
  const c = await cols();
  if (target === "question") {
    const r = await c.questions.updateOne({ _id: id, authorId: viewer.id, status: "visible" }, { $set: { status: "deleted", updatedAt: new Date() } });
    if (r.matchedCount === 0) throw notFound();
  } else {
    const a = await c.answers.findOneAndUpdate({ _id: id, authorId: viewer.id, status: "visible" }, { $set: { status: "deleted", updatedAt: new Date() } });
    if (!a) throw notFound();
    await c.questions.updateOne({ _id: a.questionId }, { $inc: { answerCount: -1 } });
  }
}

/* ---- Báo cáo & kiểm duyệt ---- */

export async function reportContent(viewer: Viewer, targetType: ReportTarget, targetId: ObjectId, reason: "spam" | "abuse" | "off_topic" | "other", note: string) {
  const c = await cols();
  const exists =
    targetType === "question" ? await c.questions.findOne({ _id: targetId }) : targetType === "answer" ? await c.answers.findOne({ _id: targetId }) : await c.courseReviews.findOne({ _id: targetId });
  if (!exists) throw notFound();
  try {
    await c.contentReports.insertOne({ reporterId: viewer.id, targetType, targetId, reason, note, status: "open", resolvedBy: null, resolvedAt: null, resolution: null, createdAt: new Date() });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err; // đã báo cáo rồi → idempotent
  }
}

export async function moderationQueue(admin: Viewer) {
  if (!admin.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const reports = await c.contentReports.find({ status: "open" }).sort({ createdAt: 1 }).limit(50).toArray();
  const out = [];
  for (const r of reports) {
    let preview = "";
    let status = "";
    if (r.targetType === "question") {
      const q = await c.questions.findOne({ _id: r.targetId });
      preview = q ? `${q.title}\n${q.body}` : "(đã xóa)";
      status = q?.status ?? "deleted";
    } else if (r.targetType === "answer") {
      const a = await c.answers.findOne({ _id: r.targetId });
      preview = a?.body ?? "(đã xóa)";
      status = a?.status ?? "deleted";
    } else {
      const rv = await c.courseReviews.findOne({ _id: r.targetId });
      preview = rv ? `${rv.rating}★ ${rv.comment}` : "(đã xóa)";
      status = rv?.status ?? "deleted";
    }
    out.push({ id: r._id.toHexString(), targetType: r.targetType, targetId: r.targetId.toHexString(), reason: r.reason, note: r.note, preview: preview.slice(0, 500), targetStatus: status, createdAt: r.createdAt.toISOString() });
  }
  return out;
}

/** Admin ẩn/hiện nội dung có lý do + audit; đóng các báo cáo liên quan. */
export async function moderate(admin: Viewer, targetType: ReportTarget, targetId: ObjectId, action: "hide" | "unhide" | "dismiss", reason: string) {
  if (!admin.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const now = new Date();
  if (action !== "dismiss") {
    const set = action === "hide" ? { status: "hidden" as const, hiddenReason: reason, updatedAt: now } : { status: "visible" as const, hiddenReason: null, updatedAt: now };
    if (targetType === "question") await c.questions.updateOne({ _id: targetId, status: { $ne: "deleted" } }, { $set: set });
    else if (targetType === "answer") await c.answers.updateOne({ _id: targetId, status: { $ne: "deleted" } }, { $set: set });
    else {
      const { moderateReview } = await import("@/modules/reviews/service");
      await moderateReview(admin, targetId, action, reason);
    }
  }
  await c.contentReports.updateMany({ targetType, targetId, status: "open" }, { $set: { status: action === "dismiss" ? "dismissed" : "resolved", resolvedBy: admin.id, resolvedAt: now, resolution: `${action}: ${reason}` } });
  await audit({ actorId: admin.id, action: `moderation.${action}`, targetType, targetId, meta: { reason } });
}

/** Hộp thư giảng viên: câu hỏi chưa có trả lời của giảng viên trong khóa mình sở hữu. */
export async function instructorInbox(viewer: Viewer) {
  const c = await cols();
  const courses = await c.courses.find(viewer.roles.includes("admin") ? {} : { instructorId: viewer.id }).project<{ _id: ObjectId; slug: string; published: { title: string } | null }>({ slug: 1, "published.title": 1 }).toArray();
  const qs = await c.questions.find({ courseId: { $in: courses.map((x) => x._id) }, status: "visible", hasInstructorAnswer: false }).sort({ lastActivityAt: -1 }).limit(50).toArray();
  const cm = new Map(courses.map((x) => [x._id.toHexString(), x]));
  return qs.map((q) => {
    const course = cm.get(q.courseId.toHexString());
    return { id: q._id.toHexString(), title: q.title, courseTitle: course?.published?.title ?? "", href: `/learn/${course?.slug}/${q.lessonId.toHexString()}#hoi-dap`, answers: q.answerCount, createdAt: q.createdAt.toISOString() };
  });
}
