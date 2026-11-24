import "server-only";
import { createHash } from "node:crypto";
import { ObjectId, type ClientSession } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { normalizeForSearch, slugify } from "@/lib/text";
import { withTransaction } from "@/server/db/client";
import {
  cols,
  type ChapterDoc,
  type CourseContent,
  type CourseDoc,
  type Doc,
  type LessonContent,
  type LessonDoc,
  type QuizContent,
} from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { canEditCourse, toPolicyCourse } from "./policy";
import { mediaImageUrl } from "@/modules/media/urls";

export const LIMITS = { chapters: 30, lessons: 200 };

/* ---------- Truy cập có kiểm tra quyền ---------- */

export async function loadEditableCourse(viewer: Viewer, courseId: ObjectId): Promise<Doc<CourseDoc>> {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  // Không lộ sự tồn tại của khóa người khác: trả NOT_FOUND.
  if (!course || !canEditCourse(viewer, toPolicyCourse(course))) throw notFound("Không tìm thấy khóa học");
  return course;
}

/**
 * Khóa lạc quan: tăng draftRevision nếu đúng revision client đang thấy và khóa không bị khóa sửa.
 * Mọi mutation draft đều đi qua đây trước (chống lost update).
 */
async function bumpRevision(courseId: ObjectId, expected: number, session?: ClientSession): Promise<number> {
  const c = await cols();
  const updated = await c.courses.findOneAndUpdate(
    { _id: courseId, draftRevision: expected, "review.state": { $ne: "pending" }, status: { $ne: "suspended" } },
    { $inc: { draftRevision: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after", session },
  );
  if (updated) return updated.draftRevision;
  const cur = await c.courses.findOne({ _id: courseId }, { session });
  if (!cur) throw notFound("Không tìm thấy khóa học");
  if (cur.review.state === "pending") throw new AppError("INVALID_STATE", "Khóa đang chờ duyệt. Hãy rút yêu cầu duyệt trước khi sửa.");
  if (cur.status === "suspended") throw new AppError("INVALID_STATE", "Khóa học đang bị đình chỉ.");
  throw new AppError("STALE_REVISION", "Khóa học vừa được thay đổi ở nơi khác. Tải lại trang để xem bản mới nhất.");
}

/** Dùng cho quiz/bài tập dự án: kiểm tra quyền sửa + tăng revision của khóa (chung một khóa lạc quan). */
export async function touchCourseDraft(viewer: Viewer, courseId: ObjectId, expectedRevision: number) {
  await loadEditableCourse(viewer, courseId);
  return bumpRevision(courseId, expectedRevision);
}

/* ---------- Course ---------- */

async function uniqueSlug(title: string): Promise<string> {
  const c = await cols();
  const base = slugify(title) || "khoa-hoc";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await c.courses.findOne({ slug }, { projection: { _id: 1 } }))) return slug;
  }
  return `${base}-${new ObjectId().toHexString().slice(-6)}`;
}

export async function createCourse(viewer: Viewer, input: { title: string; categoryId: ObjectId | null; level: CourseContent["level"] }) {
  if (!viewer.roles.includes("instructor") && !viewer.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ giảng viên được tạo khóa học.");
  const c = await cols();
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await c.courses.insertOne({
        slug: await uniqueSlug(input.title),
        instructorId: viewer.id,
        status: "draft",
        review: { state: "none", submittedRevision: null, submittedAt: null, reviewedAt: null, reviewerId: null, rejectReason: null },
        draftRevision: 1,
        publishedVersion: 0,
        draft: {
          title: input.title,
          shortDescription: "",
          description: "",
          learningObjectives: [],
          prerequisites: [],
          categoryId: input.categoryId,
          level: input.level,
          thumbnailMediaId: null,
          placementQuizId: null,
        },
        published: null,
        ratingAvg: 0,
        ratingCount: 0,
        enrollmentCount: 0,
        featuredRank: null,
        suspendedReason: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
      await audit({ actorId: viewer.id, action: "course.create", targetType: "course", targetId: res.insertedId });
      return res.insertedId;
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err; // race trên slug → thử lại
    }
  }
  throw new AppError("CONFLICT", "Không tạo được đường dẫn khóa học, vui lòng đổi tên.");
}

export async function updateCourseDraft(
  viewer: Viewer,
  courseId: ObjectId,
  expectedRevision: number,
  fields: Omit<CourseContent, "thumbnailMediaId" | "placementQuizId"> & { thumbnailMediaId?: ObjectId | null },
) {
  const course = await loadEditableCourse(viewer, courseId);
  const c = await cols();
  if (fields.categoryId && !(await c.categories.findOne({ _id: fields.categoryId, isActive: true }))) {
    throw new AppError("VALIDATION_FAILED", "Chủ đề không hợp lệ.", { fieldErrors: { categoryId: ["Chủ đề không hợp lệ."] } });
  }
  if (fields.thumbnailMediaId) await assertUsableMedia(courseId, fields.thumbnailMediaId, "image");
  const revision = await bumpRevision(courseId, expectedRevision);
  const set: Record<string, unknown> = {
    "draft.title": fields.title,
    "draft.shortDescription": fields.shortDescription,
    "draft.description": fields.description,
    "draft.learningObjectives": fields.learningObjectives,
    "draft.prerequisites": fields.prerequisites,
    "draft.categoryId": fields.categoryId,
    "draft.level": fields.level,
  };
  if (fields.thumbnailMediaId !== undefined) set["draft.thumbnailMediaId"] = fields.thumbnailMediaId;
  await c.courses.updateOne({ _id: courseId }, { $set: set });
  if (fields.thumbnailMediaId !== undefined) {
    await syncDraftMediaRef("course_draft", courseId, course.draft.thumbnailMediaId, fields.thumbnailMediaId);
  }
  return revision;
}

/* ---------- Media helpers (ràng buộc cùng khóa, đã xác minh) ---------- */

async function assertUsableMedia(courseId: ObjectId, mediaId: ObjectId, resourceType: "image" | "video") {
  const c = await cols();
  const m = await c.mediaAssets.findOne({ _id: mediaId, courseId, status: "ready", resourceType });
  if (!m) throw new AppError("MEDIA_NOT_READY", "Media không hợp lệ, chưa sẵn sàng hoặc không thuộc khóa học này.");
}

async function syncDraftMediaRef(kind: "course_draft" | "lesson_draft", ownerId: ObjectId, oldId: ObjectId | null, newId: ObjectId | null) {
  if (oldId && newId && oldId.equals(newId)) return;
  const c = await cols();
  if (oldId) await c.mediaAssets.updateOne({ _id: oldId }, { $pull: { refs: { kind, id: ownerId } } });
  if (newId) await c.mediaAssets.updateOne({ _id: newId }, { $addToSet: { refs: { kind, id: ownerId } } });
}

/* ---------- Chapter ---------- */

export async function createChapter(viewer: Viewer, courseId: ObjectId, expectedRevision: number, input: { title: string; description: string }) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const count = await c.chapters.countDocuments({ courseId, "draft.deleted": false });
  if (count >= LIMITS.chapters) throw new AppError("LIMIT_REACHED", `Tối đa ${LIMITS.chapters} chương mỗi khóa.`);
  const revision = await bumpRevision(courseId, expectedRevision);
  const last = await c.chapters.find({ courseId, "draft.deleted": false }).sort({ "draft.order": -1 }).limit(1).next();
  const now = new Date();
  const res = await c.chapters.insertOne({
    courseId,
    draft: { title: input.title, description: input.description, order: (last?.draft?.order ?? 0) + 1, deleted: false },
    published: null,
    createdAt: now,
    updatedAt: now,
  });
  return { revision, chapterId: res.insertedId };
}

async function loadChapter(courseId: ObjectId, chapterId: ObjectId): Promise<Doc<ChapterDoc>> {
  const c = await cols();
  // Kiểm tra quan hệ chapter → course (A10).
  const ch = await c.chapters.findOne({ _id: chapterId, courseId, "draft.deleted": false });
  if (!ch?.draft) throw notFound("Không tìm thấy chương");
  return ch;
}

export async function updateChapter(viewer: Viewer, courseId: ObjectId, chapterId: ObjectId, expectedRevision: number, input: { title: string; description: string }) {
  await loadEditableCourse(viewer, courseId);
  await loadChapter(courseId, chapterId);
  const revision = await bumpRevision(courseId, expectedRevision);
  const c = await cols();
  await c.chapters.updateOne({ _id: chapterId, courseId }, { $set: { "draft.title": input.title, "draft.description": input.description, updatedAt: new Date() } });
  return revision;
}

export async function deleteChapter(viewer: Viewer, courseId: ObjectId, chapterId: ObjectId, expectedRevision: number) {
  await loadEditableCourse(viewer, courseId);
  await loadChapter(courseId, chapterId);
  const c = await cols();
  const lessonCount = await c.lessons.countDocuments({ courseId, "draft.chapterId": chapterId, "draft.deleted": false });
  if (lessonCount > 0) throw new AppError("INVALID_STATE", "Chương còn bài học. Hãy xóa hoặc chuyển các bài trước.");
  const revision = await bumpRevision(courseId, expectedRevision);
  await c.chapters.updateOne({ _id: chapterId, courseId }, { $set: { "draft.deleted": true, updatedAt: new Date() } });
  return revision;
}

/** Đổi chỗ chương với chương liền trên/dưới (thay thế kéo thả, hỗ trợ bàn phím). */
export async function moveChapter(viewer: Viewer, courseId: ObjectId, chapterId: ObjectId, direction: "up" | "down", expectedRevision: number) {
  await loadEditableCourse(viewer, courseId);
  return withTransaction(async (session) => {
    const c = await cols();
    const list = await c.chapters.find({ courseId, "draft.deleted": false }, { session }).sort({ "draft.order": 1 }).toArray();
    const idx = list.findIndex((x) => x._id.equals(chapterId));
    if (idx < 0) throw notFound("Không tìm thấy chương");
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return expectedRevision;
    const revision = await bumpRevision(courseId, expectedRevision, session);
    const ordered = [...list];
    [ordered[idx], ordered[swap]] = [ordered[swap]!, ordered[idx]!];
    for (let i = 0; i < ordered.length; i++) {
      await c.chapters.updateOne({ _id: ordered[i]!._id }, { $set: { "draft.order": i + 1 } }, { session });
    }
    return revision;
  });
}

/* ---------- Lesson ---------- */

export type LessonInput = Omit<LessonContent, "order" | "quizId" | "projectAssignmentId"> & {
  quizId?: ObjectId | null;
  projectAssignmentId?: ObjectId | null;
};

async function validateLessonRefs(courseId: ObjectId, input: Partial<LessonInput>) {
  const c = await cols();
  if (input.chapterId) await loadChapter(courseId, input.chapterId);
  if (input.mediaId) await assertUsableMedia(courseId, input.mediaId, "video");
  if (input.quizId && !(await c.quizzes.findOne({ _id: input.quizId, courseId, kind: "lesson" }))) throw notFound("Quiz không thuộc khóa học này");
  if (input.projectAssignmentId && !(await c.projectAssignments.findOne({ _id: input.projectAssignmentId, courseId }))) {
    throw notFound("Bài tập dự án không thuộc khóa học này");
  }
}

export async function createLesson(viewer: Viewer, courseId: ObjectId, expectedRevision: number, input: { chapterId: ObjectId; title: string; type: LessonContent["type"] }) {
  await loadEditableCourse(viewer, courseId);
  await loadChapter(courseId, input.chapterId);
  const c = await cols();
  if ((await c.lessons.countDocuments({ courseId, "draft.deleted": false })) >= LIMITS.lessons) {
    throw new AppError("LIMIT_REACHED", `Tối đa ${LIMITS.lessons} bài mỗi khóa.`);
  }
  const revision = await bumpRevision(courseId, expectedRevision);
  const last = await c.lessons.find({ courseId, "draft.chapterId": input.chapterId, "draft.deleted": false }).sort({ "draft.order": -1 }).limit(1).next();
  const now = new Date();
  const res = await c.lessons.insertOne({
    courseId,
    draft: {
      chapterId: input.chapterId,
      order: (last?.draft?.order ?? 0) + 1,
      title: input.title,
      type: input.type,
      objectives: [],
      content: "",
      durationSeconds: input.type === "reading" ? 300 : 0,
      isPreview: false,
      isRequired: true,
      mediaId: null,
      transcript: null,
      quizId: null,
      projectAssignmentId: null,
      deleted: false,
    },
    published: null,
    createdAt: now,
    updatedAt: now,
  });
  return { revision, lessonId: res.insertedId };
}

export async function loadEditableLesson(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId): Promise<Doc<LessonDoc>> {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const lesson = await c.lessons.findOne({ _id: lessonId, courseId, "draft.deleted": false });
  if (!lesson?.draft) throw notFound("Không tìm thấy bài học");
  return lesson;
}

export async function updateLesson(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId, expectedRevision: number, input: LessonInput) {
  const lesson = await loadEditableLesson(viewer, courseId, lessonId);
  await validateLessonRefs(courseId, input);
  const c = await cols();
  let durationSeconds = input.durationSeconds;
  if (input.type === "video" && input.mediaId) {
    // Thời lượng video lấy từ metadata đã xác minh, không tin client.
    const m = await c.mediaAssets.findOne({ _id: input.mediaId });
    durationSeconds = Math.round(m?.durationSeconds ?? 0);
  }
  const movingChapter = !lesson.draft!.chapterId.equals(input.chapterId);
  let order = lesson.draft!.order;
  if (movingChapter) {
    const last = await c.lessons.find({ courseId, "draft.chapterId": input.chapterId, "draft.deleted": false }).sort({ "draft.order": -1 }).limit(1).next();
    order = (last?.draft?.order ?? 0) + 1;
  }
  const revision = await bumpRevision(courseId, expectedRevision);
  await c.lessons.updateOne(
    { _id: lessonId, courseId },
    {
      $set: {
        "draft.chapterId": input.chapterId,
        "draft.order": order,
        "draft.title": input.title,
        "draft.type": input.type,
        "draft.objectives": input.objectives,
        "draft.content": input.content,
        "draft.durationSeconds": durationSeconds,
        "draft.isPreview": input.isPreview,
        "draft.isRequired": input.isRequired,
        "draft.mediaId": input.type === "video" ? input.mediaId : null,
        "draft.transcript": input.transcript,
        "draft.quizId": input.quizId ?? null,
        "draft.projectAssignmentId": input.projectAssignmentId ?? null,
        updatedAt: new Date(),
      },
    },
  );
  await syncDraftMediaRef("lesson_draft", lessonId, lesson.draft!.mediaId, input.type === "video" ? input.mediaId : null);
  return revision;
}

export async function deleteLesson(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId, expectedRevision: number) {
  const lesson = await loadEditableLesson(viewer, courseId, lessonId);
  const revision = await bumpRevision(courseId, expectedRevision);
  const c = await cols();
  // Soft delete trong draft: progress/notes vẫn tham chiếu lessonId; bản published giữ tới lần duyệt tiếp.
  await c.lessons.updateOne({ _id: lessonId, courseId }, { $set: { "draft.deleted": true, updatedAt: new Date() } });
  await syncDraftMediaRef("lesson_draft", lessonId, lesson.draft!.mediaId, null);
  return revision;
}

export async function moveLesson(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId, direction: "up" | "down", expectedRevision: number) {
  const lesson = await loadEditableLesson(viewer, courseId, lessonId);
  return withTransaction(async (session) => {
    const c = await cols();
    const list = await c.lessons
      .find({ courseId, "draft.chapterId": lesson.draft!.chapterId, "draft.deleted": false }, { session })
      .sort({ "draft.order": 1 })
      .toArray();
    const idx = list.findIndex((x) => x._id.equals(lessonId));
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= list.length) return expectedRevision;
    const revision = await bumpRevision(courseId, expectedRevision, session);
    const ordered = [...list];
    [ordered[idx], ordered[swap]] = [ordered[swap]!, ordered[idx]!];
    for (let i = 0; i < ordered.length; i++) {
      await c.lessons.updateOne({ _id: ordered[i]!._id }, { $set: { "draft.order": i + 1 } }, { session });
    }
    return revision;
  });
}

/* ---------- Editor data ---------- */

export async function getEditorData(viewer: Viewer, courseId: ObjectId) {
  const course = await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const [chapters, lessons, categories, quizzes, assignments] = await Promise.all([
    c.chapters.find({ courseId, "draft.deleted": false }).sort({ "draft.order": 1 }).toArray(),
    c.lessons.find({ courseId, "draft.deleted": false }).sort({ "draft.order": 1 }).toArray(),
    c.categories.find({ isActive: true }).sort({ order: 1 }).toArray(),
    c.quizzes.find({ courseId }).project<{ _id: ObjectId; kind: string; "draft": { title: string; questions: unknown[] }; publishedVersion: number | null }>({ kind: 1, "draft.title": 1, "draft.questions": 1, publishedVersion: 1 }).toArray(),
    c.projectAssignments.find({ courseId, "draft.deleted": false }).project<{ _id: ObjectId; draft: { title: string } }>({ "draft.title": 1 }).toArray(),
  ]);
  return { course, chapters, lessons, categories, quizzes, assignments };
}

/* ---------- Điều kiện xuất bản ---------- */

export async function publishProblems(courseId: ObjectId): Promise<string[]> {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  if (!course) return ["Không tìm thấy khóa học."];
  const p: string[] = [];
  const d = course.draft;
  if (d.title.trim().length < 5) p.push("Tên khóa học cần ít nhất 5 ký tự.");
  if (!d.shortDescription.trim()) p.push("Thiếu mô tả ngắn.");
  if (!d.description.trim()) p.push("Thiếu mô tả chi tiết.");
  if (!d.categoryId) p.push("Chưa chọn chủ đề.");
  if (d.learningObjectives.length === 0) p.push("Cần ít nhất một mục tiêu học tập.");
  if (d.thumbnailMediaId && !(await c.mediaAssets.findOne({ _id: d.thumbnailMediaId, status: "ready" }))) p.push("Ảnh bìa đã bị gỡ hoặc chưa sẵn sàng.");
  const chapters = await c.chapters.find({ courseId, "draft.deleted": false }).toArray();
  const lessons = await c.lessons.find({ courseId, "draft.deleted": false }).toArray();
  const liveChapterIds = new Set(chapters.map((x) => x._id.toHexString()));
  const usable = lessons.filter((l) => liveChapterIds.has(l.draft!.chapterId.toHexString()));
  if (chapters.length === 0) p.push("Cần ít nhất một chương.");
  if (usable.length === 0) p.push("Cần ít nhất một bài học.");
  for (const ch of chapters) {
    if (!usable.some((l) => l.draft!.chapterId.equals(ch._id))) p.push(`Chương “${ch.draft!.title}” chưa có bài học.`);
  }
  for (const l of usable) {
    const ld = l.draft!;
    if (ld.type === "reading" && !ld.content.trim()) p.push(`Bài “${ld.title}” chưa có nội dung.`);
    if (ld.type === "video") {
      if (!ld.mediaId) p.push(`Bài video “${ld.title}” chưa gắn video.`);
      else if (!(await c.mediaAssets.findOne({ _id: ld.mediaId, status: "ready", resourceType: "video" }))) p.push(`Video của bài “${ld.title}” đã bị gỡ hoặc chưa sẵn sàng.`);
    }
    if (ld.quizId) {
      const q = await c.quizzes.findOne({ _id: ld.quizId, courseId });
      if (!q || q.draft.questions.length === 0) p.push(`Quiz gắn với bài “${ld.title}” chưa có câu hỏi.`);
    }
  }
  if (d.placementQuizId) {
    const q = await c.quizzes.findOne({ _id: d.placementQuizId, courseId, kind: "placement" });
    if (!q || q.draft.questions.length === 0) p.push("Bài đánh giá đầu vào chưa có câu hỏi.");
  }
  return p;
}

/* ---------- Duyệt & xuất bản ---------- */

export async function submitForReview(viewer: Viewer, courseId: ObjectId, expectedRevision: number) {
  const course = await loadEditableCourse(viewer, courseId);
  if (!course.instructorId.equals(viewer.id) && !viewer.roles.includes("admin")) throw notFound();
  if (course.status === "suspended") throw new AppError("INVALID_STATE", "Khóa học đang bị đình chỉ.");
  const problems = await publishProblems(courseId);
  if (problems.length) throw new AppError("PUBLISH_REQUIREMENTS_FAILED", "Khóa học chưa đủ điều kiện gửi duyệt.", { details: problems });
  const c = await cols();
  const res = await c.courses.updateOne(
    { _id: courseId, draftRevision: expectedRevision, "review.state": { $ne: "pending" } },
    { $set: { review: { state: "pending", submittedRevision: expectedRevision, submittedAt: new Date(), reviewedAt: null, reviewerId: null, rejectReason: null }, updatedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw new AppError("STALE_REVISION", "Khóa học vừa thay đổi hoặc đã được gửi duyệt. Tải lại trang.");
  await audit({ actorId: viewer.id, action: "course.submit_review", targetType: "course", targetId: courseId, meta: { revision: expectedRevision } });
}

export async function withdrawSubmission(viewer: Viewer, courseId: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  const res = await c.courses.updateOne({ _id: courseId, "review.state": "pending" }, { $set: { "review.state": "none", updatedAt: new Date() } });
  if (res.matchedCount === 0) throw new AppError("INVALID_STATE", "Khóa học không ở trạng thái chờ duyệt.");
}

function requireAdmin(viewer: Viewer) {
  if (!viewer.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên được duyệt khóa học.");
}

export async function rejectCourse(viewer: Viewer, courseId: ObjectId, reason: string) {
  requireAdmin(viewer);
  const c = await cols();
  const res = await c.courses.updateOne(
    { _id: courseId, "review.state": "pending" },
    { $set: { "review.state": "rejected", "review.rejectReason": reason, "review.reviewedAt": new Date(), "review.reviewerId": viewer.id, updatedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw new AppError("INVALID_STATE", "Khóa học không ở trạng thái chờ duyệt.");
  await audit({ actorId: viewer.id, action: "course.reject", targetType: "course", targetId: courseId, meta: { reason } });
}

const contentHash = (q: QuizContent) =>
  createHash("sha256").update(JSON.stringify({ t: q.title, p: q.passPercent, s: q.showExplanations, q: q.questions, r: q.rules })).digest("hex");

/**
 * Duyệt = sao chép draft → published cho toàn bộ document của khóa trong MỘT transaction (ADR-007).
 * Chỉ thành công nếu draftRevision bằng đúng revision đã nộp (admin duyệt đúng bản đã xem).
 */
export async function approveCourse(viewer: Viewer, courseId: ObjectId, submittedRevision: number) {
  requireAdmin(viewer);
  const problems = await publishProblems(courseId);
  if (problems.length) throw new AppError("PUBLISH_REQUIREMENTS_FAILED", "Khóa học không còn đủ điều kiện xuất bản.", { details: problems });
  const now = new Date();
  const slug = await withTransaction(async (session) => {
    const c = await cols();
    const course = await c.courses.findOne({ _id: courseId }, { session });
    if (!course || course.review.state !== "pending" || course.draftRevision !== submittedRevision || course.review.submittedRevision !== submittedRevision) {
      throw new AppError("STALE_REVISION", "Bản nộp đã thay đổi hoặc không còn chờ duyệt. Tải lại trang.");
    }
    const chapters = await c.chapters.find({ courseId }, { session }).toArray();
    const liveChapters = new Map(chapters.filter((ch) => ch.draft && !ch.draft.deleted).map((ch) => [ch._id.toHexString(), ch]));
    for (const ch of chapters) {
      const live = liveChapters.has(ch._id.toHexString());
      await c.chapters.updateOne(
        { _id: ch._id },
        { $set: { published: live ? { title: ch.draft!.title, description: ch.draft!.description, order: ch.draft!.order } : null, updatedAt: now } },
        { session },
      );
    }

    const lessons = await c.lessons.find({ courseId }, { session }).toArray();
    let lessonCount = 0;
    let requiredLessonCount = 0;
    let totalDurationSeconds = 0;
    const quizIds = new Set<string>();
    const assignmentIds = new Set<string>();
    for (const l of lessons) {
      const live = l.draft && !l.draft.deleted && liveChapters.has(l.draft.chapterId.toHexString());
      let published: LessonContent | null = null;
      if (live) {
        const { deleted: _deleted, ...rest } = l.draft!;
        published = rest;
        lessonCount++;
        if (rest.isRequired) requiredLessonCount++;
        totalDurationSeconds += rest.durationSeconds;
        if (rest.quizId) quizIds.add(rest.quizId.toHexString());
        if (rest.projectAssignmentId) assignmentIds.add(rest.projectAssignmentId.toHexString());
      }
      const oldMedia = l.published?.mediaId ?? null;
      const newMedia = published?.mediaId ?? null;
      if (oldMedia && (!newMedia || !oldMedia.equals(newMedia))) {
        await c.mediaAssets.updateOne({ _id: oldMedia }, { $pull: { refs: { kind: "lesson_published", id: l._id } } }, { session });
      }
      if (newMedia) await c.mediaAssets.updateOne({ _id: newMedia }, { $addToSet: { refs: { kind: "lesson_published", id: l._id } } }, { session });
      await c.lessons.updateOne({ _id: l._id }, { $set: { published, updatedAt: now } }, { session });
    }

    // Quiz: tạo quizVersions bất biến khi nội dung đổi.
    if (course.draft.placementQuizId) quizIds.add(course.draft.placementQuizId.toHexString());
    for (const qid of quizIds) {
      const quiz = await c.quizzes.findOne({ _id: new ObjectId(qid), courseId }, { session });
      if (!quiz) continue;
      const current = quiz.publishedVersion ? await c.quizVersions.findOne({ quizId: quiz._id, version: quiz.publishedVersion }, { session }) : null;
      if (current && contentHash(current) === contentHash(quiz.draft)) continue;
      const version = (quiz.publishedVersion ?? 0) + 1;
      await c.quizVersions.insertOne({ quizId: quiz._id, version, courseId, kind: quiz.kind, ...quiz.draft, createdAt: now }, { session });
      await c.quizzes.updateOne({ _id: quiz._id }, { $set: { publishedVersion: version, updatedAt: now } }, { session });
    }

    const assignments = await c.projectAssignments.find({ courseId }, { session }).toArray();
    for (const a of assignments) {
      const live = a.draft && !a.draft.deleted && assignmentIds.has(a._id.toHexString());
      const { deleted: _d, ...rest } = a.draft ?? { deleted: true };
      await c.projectAssignments.updateOne({ _id: a._id }, { $set: { published: live ? (rest as never) : null, updatedAt: now } }, { session });
    }

    // Ảnh bìa
    const thumbId = course.draft.thumbnailMediaId;
    const oldThumb = course.published?.thumbnailMediaId ?? null;
    if (oldThumb && (!thumbId || !oldThumb.equals(thumbId))) {
      await c.mediaAssets.updateOne({ _id: oldThumb }, { $pull: { refs: { kind: "course_published", id: courseId } } }, { session });
    }
    let thumbnailUrl: string | null = null;
    if (thumbId) {
      const m = await c.mediaAssets.findOne({ _id: thumbId }, { session });
      if (m) {
        thumbnailUrl = mediaImageUrl(m.publicId, m.version, 640);
        await c.mediaAssets.updateOne({ _id: thumbId }, { $addToSet: { refs: { kind: "course_published", id: courseId } } }, { session });
      }
    }

    const d = course.draft;
    // Tìm kiếm theo tên công nghệ + alias (vd "js", "ts") mà không sinh URL riêng cho alias (§32.2).
    const techIds = (d.technologies ?? []).map((t) => t.technologyId);
    const techWords = techIds.length
      ? (await c.technologies.find({ _id: { $in: techIds } }, { session, projection: { name: 1, aliases: 1 } }).toArray()).flatMap((t) => [t.name, ...t.aliases])
      : [];
    await c.courses.updateOne(
      { _id: courseId },
      {
        $set: {
          published: {
            ...d,
            searchText: normalizeForSearch(`${d.title} ${d.shortDescription} ${techWords.join(" ")}`),
            technologies: d.technologies ?? [],
            contentUpdatedAt: now,
            lessonCount,
            requiredLessonCount,
            totalDurationSeconds,
            chapterCount: liveChapters.size,
            publishedAt: course.published?.publishedAt ?? now,
            thumbnailUrl,
          },
          status: course.status === "draft" ? "published" : course.status,
          "review.state": "approved",
          "review.reviewedAt": now,
          "review.reviewerId": viewer.id,
          "review.rejectReason": null,
          updatedAt: now,
        },
        $inc: { publishedVersion: 1 },
      },
      { session },
    );
    return course.slug;
  });
  await audit({ actorId: viewer.id, action: "course.approve", targetType: "course", targetId: courseId, meta: { revision: submittedRevision } });
  return slug;
}

export async function setCourseStatus(viewer: Viewer, courseId: ObjectId, action: "archive" | "unarchive" | "suspend" | "unsuspend", reason: string) {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  if (!course) throw notFound("Không tìm thấy khóa học");
  const admin = viewer.roles.includes("admin");
  const owner = course.instructorId.equals(viewer.id) && viewer.roles.includes("instructor");
  if ((action === "suspend" || action === "unsuspend") && !admin) throw new AppError("FORBIDDEN", "Chỉ quản trị viên được đình chỉ khóa học.");
  if ((action === "archive" || action === "unarchive") && !admin && !owner) throw notFound("Không tìm thấy khóa học");
  const transitions: Record<typeof action, { from: CourseDoc["status"][]; to: CourseDoc["status"] }> = {
    archive: { from: ["published"], to: "archived" },
    unarchive: { from: ["archived"], to: "published" },
    suspend: { from: ["published", "archived"], to: "suspended" },
    unsuspend: { from: ["suspended"], to: course.published ? "published" : "draft" },
  };
  const t = transitions[action];
  const res = await c.courses.updateOne(
    { _id: courseId, status: { $in: t.from } },
    {
      $set: {
        status: t.to,
        updatedAt: new Date(),
        ...(action === "archive" ? { archivedAt: new Date() } : {}),
        ...(action === "suspend" ? { suspendedReason: reason } : {}),
        ...(action === "unsuspend" ? { suspendedReason: null } : {}),
      },
    },
  );
  if (res.matchedCount === 0) throw new AppError("INVALID_STATE", "Không thể chuyển trạng thái từ trạng thái hiện tại.");
  await audit({ actorId: viewer.id, action: `course.${action}`, targetType: "course", targetId: courseId, meta: { reason } });
  return course.slug;
}

export async function setFeatured(viewer: Viewer, courseId: ObjectId, rank: number | null) {
  requireAdmin(viewer);
  const c = await cols();
  await c.courses.updateOne({ _id: courseId }, { $set: { featuredRank: rank, updatedAt: new Date() } });
  await audit({ actorId: viewer.id, action: "course.feature", targetType: "course", targetId: courseId, meta: { rank } });
}

export async function instructorCourses(viewer: Viewer) {
  const c = await cols();
  const filter = viewer.roles.includes("admin") && !viewer.roles.includes("instructor") ? {} : { instructorId: viewer.id };
  return c.courses
    .find(filter)
    .project<Pick<Doc<CourseDoc>, "_id" | "slug" | "status" | "review" | "draft" | "draftRevision" | "publishedVersion" | "enrollmentCount" | "ratingAvg" | "ratingCount" | "updatedAt">>({
      slug: 1,
      status: 1,
      review: 1,
      "draft.title": 1,
      draftRevision: 1,
      publishedVersion: 1,
      enrollmentCount: 1,
      ratingAvg: 1,
      ratingCount: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
}
