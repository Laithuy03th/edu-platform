import type { Db, IndexDescription } from "mongodb";

/** Danh sách index theo DATA_MODEL.md. Idempotent: createIndexes bỏ qua index đã tồn tại cùng spec. */
export const INDEXES: Record<string, IndexDescription[]> = {
  users: [
    { key: { emailNormalized: 1 }, name: "uniq_email", unique: true },
    {
      key: { "publicProfile.handle": 1 },
      name: "uniq_handle",
      unique: true,
      partialFilterExpression: { "publicProfile.handle": { $type: "string" } },
    },
    { key: { roles: 1, createdAt: -1 }, name: "roles_created" },
  ],
  authAccounts: [
    { key: { provider: 1, providerAccountId: 1 }, name: "uniq_provider_account", unique: true },
    { key: { userId: 1 }, name: "user" },
  ],
  authTokens: [
    { key: { tokenHash: 1 }, name: "uniq_token", unique: true },
    { key: { userId: 1, type: 1, createdAt: -1 }, name: "user_type_created" },
    { key: { expiresAt: 1 }, name: "ttl_expires", expireAfterSeconds: 86400 },
  ],
  instructorApplications: [
    {
      key: { userId: 1 },
      name: "uniq_pending_per_user",
      unique: true,
      partialFilterExpression: { status: "pending" },
    },
    { key: { status: 1, createdAt: 1 }, name: "status_created" },
  ],
  categories: [{ key: { slug: 1 }, name: "uniq_slug", unique: true }],
  courses: [
    { key: { slug: 1 }, name: "uniq_slug", unique: true },
    { key: { instructorId: 1, updatedAt: -1 }, name: "instructor_updated" },
    {
      key: { status: 1, "published.categoryId": 1, "published.level": 1, "published.publishedAt": -1 },
      name: "catalog_filter",
    },
    { key: { status: 1, ratingAvg: -1 }, name: "catalog_rating" },
    { key: { "published.searchText": "text" }, name: "catalog_text", default_language: "none" },
    { key: { "review.state": 1, "review.submittedAt": 1 }, name: "review_queue" },
    {
      key: { featuredRank: 1 },
      name: "featured",
      partialFilterExpression: { featuredRank: { $type: "number" } },
    },
  ],
  chapters: [
    { key: { courseId: 1, "draft.order": 1 }, name: "course_draft_order" },
    { key: { courseId: 1, "published.order": 1 }, name: "course_published_order" },
  ],
  lessons: [
    { key: { courseId: 1, "published.chapterId": 1, "published.order": 1 }, name: "course_published" },
    { key: { courseId: 1, "draft.chapterId": 1, "draft.order": 1 }, name: "course_draft" },
    { key: { "draft.mediaId": 1 }, name: "draft_media", sparse: true },
    { key: { "published.mediaId": 1 }, name: "published_media", sparse: true },
  ],
  quizzes: [{ key: { courseId: 1 }, name: "course" }],
  quizVersions: [{ key: { quizId: 1, version: 1 }, name: "uniq_quiz_version", unique: true }],
  quizAttempts: [
    { key: { userId: 1, submissionId: 1 }, name: "uniq_submission", unique: true },
    { key: { userId: 1, quizId: 1, submittedAt: -1 }, name: "user_quiz_time" },
  ],
  quizResults: [
    { key: { userId: 1, quizId: 1 }, name: "uniq_user_quiz", unique: true },
    { key: { userId: 1, courseId: 1 }, name: "user_course" },
  ],
  enrollments: [
    { key: { userId: 1, courseId: 1 }, name: "uniq_user_course", unique: true },
    { key: { userId: 1, status: 1, lastAccessedAt: -1 }, name: "my_courses" },
    { key: { courseId: 1, status: 1 }, name: "course_status" },
  ],
  lessonProgress: [
    { key: { userId: 1, lessonId: 1 }, name: "uniq_user_lesson", unique: true },
    { key: { userId: 1, courseId: 1 }, name: "user_course" },
    {
      key: { userId: 1, understanding: 1, understandingUpdatedAt: -1 },
      name: "needs_review",
      partialFilterExpression: { understanding: { $in: ["needs_review", "not_understood"] } },
    },
  ],
  notes: [
    { key: { userId: 1, updatedAt: -1 }, name: "user_updated" },
    { key: { userId: 1, courseId: 1, lessonId: 1, timestampSeconds: 1 }, name: "user_lesson_ts" },
  ],
  reviewItems: [
    { key: { userId: 1, questionId: 1, questionVersion: 1 }, name: "uniq_user_question", unique: true },
    { key: { userId: 1, status: 1, nextReviewAt: 1 }, name: "due" },
    { key: { userId: 1, courseId: 1, status: 1, nextReviewAt: 1 }, name: "due_course" },
  ],
  learningPaths: [
    { key: { slug: 1 }, name: "uniq_slug", unique: true },
    { key: { status: 1, updatedAt: -1 }, name: "status_updated" },
  ],
  pathEnrollments: [
    { key: { userId: 1, pathId: 1 }, name: "uniq_user_path", unique: true },
    { key: { userId: 1, status: 1 }, name: "user_status" },
  ],
  projectAssignments: [{ key: { courseId: 1 }, name: "course" }],
  projectSubmissions: [
    { key: { userId: 1, assignmentId: 1 }, name: "uniq_user_assignment", unique: true },
    { key: { courseId: 1, status: 1, updatedAt: 1 }, name: "review_queue" },
  ],
  questions: [
    { key: { lessonId: 1, status: 1, lastActivityAt: -1 }, name: "lesson_activity" },
    { key: { courseId: 1, status: 1, hasInstructorAnswer: 1, lastActivityAt: -1 }, name: "instructor_inbox" },
  ],
  answers: [{ key: { questionId: 1, status: 1, createdAt: 1 }, name: "question_answers" }],
  courseReviews: [
    { key: { userId: 1, courseId: 1 }, name: "uniq_user_course", unique: true },
    { key: { courseId: 1, status: 1, updatedAt: -1 }, name: "course_reviews" },
  ],
  contentReports: [
    { key: { reporterId: 1, targetType: 1, targetId: 1 }, name: "uniq_report", unique: true },
    { key: { status: 1, createdAt: 1 }, name: "status_created" },
  ],
  mediaAssets: [
    { key: { publicId: 1 }, name: "uniq_public_id", unique: true },
    { key: { reservationId: 1 }, name: "uniq_reservation", unique: true },
    { key: { courseId: 1, status: 1 }, name: "course_status" },
    {
      key: { status: 1, "deletion.nextAttemptAt": 1 },
      name: "deletion_queue",
      partialFilterExpression: { status: "deletion_pending" },
    },
  ],
  uploadReservations: [
    { key: { publicId: 1 }, name: "uniq_public_id", unique: true },
    { key: { status: 1, expiresAt: 1 }, name: "status_expires" },
    { key: { userId: 1, status: 1 }, name: "user_status" },
    { key: { purgeAt: 1 }, name: "ttl_purge", expireAfterSeconds: 0 },
  ],
  usageSnapshots: [
    { key: { source: 1, takenAt: -1 }, name: "source_time" },
    { key: { takenAt: 1 }, name: "ttl_taken", expireAfterSeconds: 90 * 86400 },
  ],
  auditLogs: [
    { key: { at: -1 }, name: "time" },
    { key: { targetType: 1, targetId: 1, at: -1 }, name: "target" },
    { key: { actorId: 1, at: -1 }, name: "actor" },
    { key: { at: 1 }, name: "ttl_at", expireAfterSeconds: 180 * 86400 },
  ],
  rateLimitBuckets: [
    { key: { key: 1, windowStart: 1 }, name: "uniq_bucket", unique: true },
    { key: { expiresAt: 1 }, name: "ttl_expires", expireAfterSeconds: 0 },
  ],
};

export async function ensureIndexes(db: Db, log: (msg: string) => void = () => {}): Promise<void> {
  for (const [name, specs] of Object.entries(INDEXES)) {
    const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
    if (!exists) await db.createCollection(name);
    if (specs.length) await db.collection(name).createIndexes(specs);
    log(`✓ ${name}: ${specs.length} index`);
  }
}
