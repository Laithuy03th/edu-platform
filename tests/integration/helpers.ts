import { ObjectId } from "mongodb";
import { cols, type Role } from "@/server/db/models";
import { toViewer, type Viewer } from "@/server/auth/viewer-core";
import * as authoring from "@/modules/courses/authoring";

let n = 0;

/** Tạo user trực tiếp trong DB (đã xác minh email) và trả Viewer tương ứng. */
export async function makeUser(roles: Role[] = ["student"], opts: { verified?: boolean; timezone?: string } = {}): Promise<Viewer> {
  const c = await cols();
  const now = new Date();
  const email = `u${Date.now()}_${n++}@test.local`;
  const res = await c.users.insertOne({
    email,
    emailNormalized: email,
    emailVerifiedAt: opts.verified === false ? null : now,
    passwordHash: null,
    passwordUpdatedAt: null,
    displayName: `User ${n}`,
    bio: "",
    timezone: opts.timezone ?? "Asia/Ho_Chi_Minh",
    learningGoal: "",
    avatar: { kind: "initials" },
    roles: [...new Set<Role>(["student", ...roles])],
    status: "active",
    blockedReason: null,
    authVersion: 1,
    dataSaver: false,
    publicProfile: { enabled: false, handle: null },
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  });
  const u = await c.users.findOne({ _id: res.insertedId });
  return toViewer(u!);
}

export async function revision(courseId: ObjectId) {
  const c = await cols();
  return (await c.courses.findOne({ _id: courseId }))!.draftRevision;
}

/**
 * Tạo một khóa học hoàn chỉnh qua service thật (soạn → gửi duyệt → admin duyệt).
 * Trả về id khóa, các bài và quiz (nếu yêu cầu).
 */
export async function publishedCourse(opts: { lessons?: number; optional?: number; withQuiz?: boolean; preview?: boolean } = {}) {
  const instructor = await makeUser(["instructor"]);
  const admin = await makeUser(["admin"]);
  const c = await cols();
  const cat = await c.categories.findOneAndUpdate({ slug: "test-cat" }, { $setOnInsert: { slug: "test-cat", name: "Test", order: 1, isActive: true } }, { upsert: true, returnDocument: "after" });
  const courseId = await authoring.createCourse(instructor, { title: `Khóa học kiểm thử ${n++}`, categoryId: cat!._id, level: "beginner" });
  await authoring.updateCourseDraft(instructor, courseId, await revision(courseId), {
    title: `Khóa học kiểm thử ${n}`,
    shortDescription: "Mô tả ngắn",
    description: "Mô tả dài",
    learningObjectives: ["Mục tiêu 1"],
    prerequisites: [],
    categoryId: cat!._id,
    level: "beginner",
  });
  const { chapterId } = await authoring.createChapter(instructor, courseId, await revision(courseId), { title: "Chương 1", description: "" });
  const lessonIds: ObjectId[] = [];
  const total = (opts.lessons ?? 2) + (opts.optional ?? 0);
  for (let i = 0; i < total; i++) {
    const { lessonId } = await authoring.createLesson(instructor, courseId, await revision(courseId), { chapterId, title: `Bài ${i + 1}`, type: "reading" });
    await authoring.updateLesson(instructor, courseId, lessonId, await revision(courseId), {
      chapterId,
      title: `Bài ${i + 1}`,
      type: "reading",
      objectives: [],
      content: `Nội dung bài ${i + 1}`,
      durationSeconds: 300,
      isPreview: Boolean(opts.preview && i === 0),
      isRequired: i < (opts.lessons ?? 2),
      mediaId: null,
      transcript: null,
    });
    lessonIds.push(lessonId);
  }
  let quizId: ObjectId | null = null;
  if (opts.withQuiz) {
    const { saveQuizDraft, createQuiz } = await import("@/modules/quizzes/service");
    const q = await createQuiz(instructor, courseId, await revision(courseId), "lesson", "Quiz kiểm thử");
    quizId = q.quizId;
    await saveQuizDraft(instructor, courseId, quizId, await revision(courseId), {
      title: "Quiz kiểm thử",
      passPercent: 50,
      showExplanations: "after_submit",
      questions: [
        { prompt: "1 + 1 = ?", options: [{ text: "1" }, { text: "2" }], correctIndex: 1, explanation: "Hai", topicKey: "math" },
        { prompt: "2 + 2 = ?", options: [{ text: "4" }, { text: "5" }], correctIndex: 0, explanation: "Bốn", topicKey: "math" },
      ],
      rules: [],
    });
    const l = await c.lessons.findOne({ _id: lessonIds[0] });
    await authoring.updateLesson(instructor, courseId, lessonIds[0]!, await revision(courseId), { ...l!.draft!, quizId });
  }
  const rev = await revision(courseId);
  await authoring.submitForReview(instructor, courseId, rev);
  await authoring.approveCourse(admin, courseId, rev);
  return { instructor, admin, courseId, chapterId, lessonIds, quizId };
}

export { ObjectId };
