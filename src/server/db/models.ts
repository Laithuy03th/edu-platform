import "server-only";
import type { Collection, ObjectId, WithId } from "mongodb";
import { getDb } from "./client";

/* Kiểu document cho mọi collection — xem docs/DATA_MODEL.md. */

export type Role = "student" | "instructor" | "admin";

export interface UserDoc {
  /** L12: số bài/tuần người học TỰ đặt (null = không đặt mục tiêu, chỉ đếm). Thiếu ở document cũ. */
  weeklyGoalLessons?: number | null;
  email: string;
  emailNormalized: string;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  passwordUpdatedAt: Date | null;
  displayName: string;
  bio: string;
  timezone: string;
  learningGoal: string;
  avatar: { kind: "initials" } | { kind: "google"; url: string };
  roles: Role[];
  /** deleted: người dùng tự xóa tài khoản (đã ẩn danh hóa, không đăng nhập được) */
  status: "active" | "blocked" | "deleted";
  deletedAt?: Date | null;
  blockedReason: string | null;
  authVersion: number;
  dataSaver: boolean;
  publicProfile: { enabled: boolean; handle: string | null };
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

export interface AuthAccountDoc {
  userId: ObjectId;
  provider: "google";
  providerAccountId: string;
  emailAtLink: string;
  linkedAt: Date;
}

export type AuthTokenType = "email_verify" | "password_reset" | "set_password" | "link_intent";
export interface AuthTokenDoc {
  type: AuthTokenType;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  meta: { emailNormalized?: string };
}

export interface InstructorApplicationDoc {
  userId: ObjectId;
  status: "pending" | "approved" | "rejected";
  motivation: string;
  sampleUrl: string | null;
  reviewedBy: ObjectId | null;
  reviewedAt: Date | null;
  decisionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDoc {
  slug: string;
  name: string;
  order: number;
  isActive: boolean;
}

/** Taxonomy công nghệ (V2 §32, T01). Không phải mọi công nghệ đều có trang hub — hub chỉ hiện khi có nội dung đã xuất bản. */
export const TECH_TYPES = ["language", "framework", "library", "runtime", "database", "tool", "platform", "protocol", "concept"] as const;
export const TECH_DOMAINS = ["foundations", "cs", "web", "frontend", "backend", "database", "mobile", "devops", "qa", "security", "data", "systems", "game"] as const;
export type TechType = (typeof TECH_TYPES)[number];
export type TechDomain = (typeof TECH_DOMAINS)[number];
export interface TechnologyDoc {
  slug: string;
  name: string;
  type: TechType;
  domain: TechDomain;
  /** Tên gọi khác cho tìm kiếm (js, ts, postgres…) — không sinh URL riêng; URL alias chuyển hướng 308 về slug chuẩn. */
  aliases: string[];
  description: string;
  officialUrl: string | null;
  /** active: được gắn vào khóa học; planned: chỉ xuất hiện trong roadmap, không có trang. */
  status: "active" | "planned";
  order: number;
  /** T03: công nghệ nên biết trước (đồ thị không vòng). Thiếu ở document cũ. */
  prerequisites?: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
/** Công nghệ + phiên bản đã kiểm thử của một khóa (T06). Tối đa 8 mục/khóa. */
export interface CourseTechnology {
  technologyId: ObjectId;
  testedVersion: string;
}

export type Level = "beginner" | "intermediate" | "advanced";
export interface CourseContent {
  title: string;
  shortDescription: string;
  description: string;
  learningObjectives: string[];
  prerequisites: string[];
  categoryId: ObjectId | null;
  level: Level;
  thumbnailMediaId: ObjectId | null;
  placementQuizId: ObjectId | null;
  /** Thêm ở schemaVersion 2; document cũ có thể thiếu → đọc bằng `?? []`. */
  technologies?: CourseTechnology[];
}
export interface PublishedCourse extends CourseContent {
  /** Lần duyệt gần nhất làm thay đổi nội dung công khai (dùng cho sitemap lastmod, "cập nhật ngày"). */
  contentUpdatedAt?: Date;
  searchText: string;
  lessonCount: number;
  requiredLessonCount: number;
  totalDurationSeconds: number;
  chapterCount: number;
  publishedAt: Date;
  thumbnailUrl: string | null;
}
export type CourseStatus = "draft" | "published" | "archived" | "suspended";
export interface CourseDoc {
  slug: string;
  /** Slug cũ (S06): URL cũ 308 về slug hiện tại; unique toàn collection. Document cũ có thể thiếu. */
  slugHistory?: string[];
  instructorId: ObjectId;
  status: CourseStatus;
  review: {
    state: "none" | "pending" | "rejected" | "approved";
    submittedRevision: number | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewerId: ObjectId | null;
    rejectReason: string | null;
  };
  draftRevision: number;
  publishedVersion: number;
  draft: CourseContent;
  published: PublishedCourse | null;
  ratingAvg: number;
  ratingCount: number;
  enrollmentCount: number;
  featuredRank: number | null;
  suspendedReason: string | null;
  archivedAt: Date | null;
  /**
   * Review chuyên môn (T06) — do admin ghi nhận tên người review THẬT; khác với duyệt xuất bản.
   * Gắn với publishedVersion đã review để biết nội dung có đổi sau lần review không.
   */
  contentReview?: { reviewerName: string; reviewedAt: Date; publishedVersion: number; note: string } | null;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

export interface ChapterContent {
  title: string;
  description: string;
  order: number;
}
export interface ChapterDoc {
  courseId: ObjectId;
  draft: (ChapterContent & { deleted: boolean }) | null;
  published: ChapterContent | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LessonType = "reading" | "video";
export interface LessonContent {
  chapterId: ObjectId;
  order: number;
  title: string;
  type: LessonType;
  objectives: string[];
  content: string;
  durationSeconds: number;
  isPreview: boolean;
  isRequired: boolean;
  mediaId: ObjectId | null;
  transcript: string | null;
  /** M04: phụ đề WebVTT do giảng viên cung cấp (đã validate); thiếu ở document cũ. */
  captionsVtt?: string | null;
  quizId: ObjectId | null;
  projectAssignmentId: ObjectId | null;
}
export interface LessonDoc {
  courseId: ObjectId;
  draft: (LessonContent & { deleted: boolean }) | null;
  published: LessonContent | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  questionId: string;
  version: number;
  kind: "single_choice";
  prompt: string;
  options: { optionId: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  topicKey: string | null;
}
export interface PlacementRule {
  topicKey: string;
  chapterId: ObjectId;
  thresholdPercent: number;
}
export interface QuizContent {
  title: string;
  passPercent: number;
  showExplanations: "after_submit" | "never";
  questions: QuizQuestion[];
  rules: PlacementRule[];
}
export interface QuizDoc {
  courseId: ObjectId;
  kind: "lesson" | "placement";
  draft: QuizContent;
  publishedVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface QuizVersionDoc extends QuizContent {
  quizId: ObjectId;
  version: number;
  courseId: ObjectId;
  kind: "lesson" | "placement";
  createdAt: Date;
}
export interface QuizAttemptDoc {
  userId: ObjectId;
  quizId: ObjectId;
  courseId: ObjectId;
  quizVersion: number;
  submissionId: string;
  answers: { questionId: string; questionVersion: number; selectedOptionId: string | null; correct: boolean }[];
  correctCount: number;
  total: number;
  scorePercent: number;
  passed: boolean;
  topicBreakdown: { topicKey: string; correct: number; total: number }[];
  recommendations: { chapterId: ObjectId; kind: "study_first" | "quick_review"; topicKey: string; percent: number }[];
  submittedAt: Date;
}
export interface QuizResultDoc {
  userId: ObjectId;
  quizId: ObjectId;
  courseId: ObjectId;
  bestScorePercent: number;
  latestScorePercent: number;
  attemptCount: number;
  firstPassedAt: Date | null;
  lastAttemptAt: Date;
}

export interface EnrollmentDoc {
  userId: ObjectId;
  courseId: ObjectId;
  source: "free";
  status: "active" | "revoked";
  revokedAt: Date | null;
  revokedBy: ObjectId | null;
  revokedReason: string | null;
  lastLessonId: ObjectId | null;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
  completedVersion: number | null;
  /** Học viên chọn hiển thị khóa đã hoàn thành trên hồ sơ công khai (mặc định ẩn). */
  showOnProfile?: boolean;
  enrolledAt: Date;
}

export type Understanding = "understood" | "needs_review" | "not_understood";
export interface LessonProgressDoc {
  userId: ObjectId;
  courseId: ObjectId;
  lessonId: ObjectId;
  lastPositionSeconds: number;
  lastPositionClientAt: Date;
  furthestPositionSeconds: number;
  completedAt: Date | null;
  completionSource: "manual" | "video_threshold" | "quiz_passed" | null;
  understanding: Understanding | null;
  understandingUpdatedAt: Date | null;
  lastSavedAt: Date;
}

/* ---------- Bài tập đọc code / tìm lỗi (P04): chấm ở server, đáp án không rời server trước khi giải ---------- */
export type ExerciseKind = "predict_output" | "find_bug";
export interface CodeExerciseDoc {
  courseId: ObjectId;
  lessonId: ObjectId;
  order: number;
  kind: ExerciseKind;
  language: string;
  prompt: string;
  code: string;
  /** predict_output: lựa chọn; find_bug: rỗng (người học chọn dòng). */
  options: { optionId: string; text: string }[];
  answer: { optionId: string | null; lines: number[] };
  hints: string[];
  explanation: string;
  fixedCode: string;
  version: number;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
}
export interface ExerciseAttemptDoc {
  userId: ObjectId;
  exerciseId: ObjectId;
  courseId: ObjectId;
  version: number;
  attempts: number;
  hintsUsed: number;
  solved: boolean;
  revealed: boolean;
  updatedAt: Date;
}

/* ---------- Bài viết công khai: tutorial / reference / cheatsheet / troubleshooting / recipe (T04/T05) ---------- */
export const ARTICLE_KINDS = ["tutorial", "reference", "cheatsheet", "troubleshooting", "recipe"] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number];
export interface ArticleContent {
  kind: ArticleKind;
  title: string;
  summary: string;
  /** Markdown (render server-side, khối code tô màu, mục lục từ h2/h3). */
  content: string;
  level: Level;
  technologyIds: ObjectId[];
  /** Môi trường ĐÃ chạy thật các lệnh/code trong bài (recipe bắt buộc ≥ 1 trước khi xuất bản). */
  testedOn: { os: string; tools: string; testedAt: Date }[];
}
export interface ArticleDoc {
  slug: string;
  /** Slug cũ → 308 về slug hiện tại (S06). Unique toàn collection để không hai bài tranh một URL. */
  slugHistory: string[];
  authorId: ObjectId;
  status: "draft" | "published" | "archived";
  review: { state: "none" | "pending" | "approved" | "rejected"; submittedRevision: number | null; submittedAt: Date | null; reviewedAt: Date | null; reviewerId: ObjectId | null; rejectReason: string | null };
  draftRevision: number;
  publishedVersion: number;
  draft: ArticleContent;
  published: (ArticleContent & { publishedAt: Date; contentUpdatedAt: Date }) | null;
  contentReview: { reviewerName: string; reviewedAt: Date; publishedVersion: number; note: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Bản lưu playground của người học (P05/P06) — RIÊNG TƯ theo chủ sở hữu, không có trang công khai. */
export type SnippetKind = "web" | "sql" | "python";
export interface PlaygroundSnippetDoc {
  userId: ObjectId;
  kind: SnippetKind;
  title: string;
  files: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/** Bookmark (L10): mỗi người lưu một mục tối đa một lần (unique userId+targetType+targetId). */
export interface BookmarkDoc {
  userId: ObjectId;
  targetType: "course" | "lesson";
  targetId: ObjectId;
  courseId: ObjectId;
  createdAt: Date;
}

export interface NoteDoc {
  userId: ObjectId;
  courseId: ObjectId;
  lessonId: ObjectId;
  timestampSeconds: number | null;
  content: string;
  contentNormalized: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewItemDoc {
  userId: ObjectId;
  courseId: ObjectId;
  quizId: ObjectId;
  questionId: string;
  questionVersion: number;
  quizVersion: number;
  topicKey: string | null;
  status: "active" | "mastered" | "stale";
  intervalStep: number;
  correctStreak: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  revision: number;
  createdAt: Date;
}

export interface PathItem {
  itemId: string;
  kind: "course" | "chapter" | "lesson" | "milestone";
  refId: ObjectId | null;
  title: string | null;
  required: boolean;
  order: number;
  dependsOn: string[];
}
export interface LearningPathDoc {
  slug: string;
  ownerId: ObjectId;
  status: "draft" | "published" | "archived";
  title: string;
  goal: string;
  audience: string;
  prerequisites: string;
  items: PathItem[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface PathEnrollmentDoc {
  userId: ObjectId;
  pathId: ObjectId;
  status: "active" | "paused" | "stopped";
  startedAt: Date;
  updatedAt: Date;
}

export interface RubricCriterion {
  criterionId: string;
  title: string;
  maxPoints: number;
  passDescription: string;
  failDescription: string;
  skillTag: string;
}
export interface AssignmentContent {
  title: string;
  brief: string;
  objectives: string[];
  requirements: string[];
  checklist: string[];
  rubric: RubricCriterion[];
  resources: { title: string; url: string }[];
  maxRounds: number;
}
export interface ProjectAssignmentDoc {
  courseId: ObjectId;
  draft: (AssignmentContent & { deleted: boolean }) | null;
  published: AssignmentContent | null;
  createdAt: Date;
  updatedAt: Date;
}
export type SubmissionStatus = "draft" | "submitted" | "needs_changes" | "resubmitted" | "reviewed";
export interface SubmissionFields {
  repoUrl: string;
  demoUrl: string;
  description: string;
  selfAssessment: { criterionId: string; points: number; note: string }[];
}
export interface SubmissionRound extends SubmissionFields {
  roundNo: number;
  submittedAt: Date;
  feedback: null | {
    reviewerId: ObjectId;
    reviewedAt: Date;
    scores: { criterionId: string; points: number; comment: string }[];
    totalPoints: number;
    maxPoints: number;
    summary: string;
    decision: "needs_changes" | "accepted";
  };
}
export interface ProjectSubmissionDoc {
  userId: ObjectId;
  assignmentId: ObjectId;
  courseId: ObjectId;
  status: SubmissionStatus;
  draftFields: SubmissionFields;
  rounds: SubmissionRound[];
  showOnProfile: boolean;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type Visibility = "visible" | "hidden" | "deleted";
export interface QuestionDoc {
  courseId: ObjectId;
  lessonId: ObjectId;
  authorId: ObjectId;
  title: string;
  body: string;
  status: Visibility;
  hiddenReason: string | null;
  acceptedAnswerId: ObjectId | null;
  answerCount: number;
  hasInstructorAnswer: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface AnswerDoc {
  questionId: ObjectId;
  courseId: ObjectId;
  authorId: ObjectId;
  body: string;
  isInstructor: boolean;
  markedHelpfulBy: ObjectId | null;
  status: Visibility;
  hiddenReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface CourseReviewDoc {
  userId: ObjectId;
  courseId: ObjectId;
  rating: number;
  comment: string;
  status: "visible" | "hidden";
  hiddenReason: string | null;
  hiddenBy: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
export type ReportTarget = "question" | "answer" | "review";
export interface ContentReportDoc {
  reporterId: ObjectId;
  targetType: ReportTarget;
  targetId: ObjectId;
  reason: "spam" | "abuse" | "off_topic" | "other";
  note: string;
  status: "open" | "resolved" | "dismissed";
  resolvedBy: ObjectId | null;
  resolvedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
}

/**
 * Báo lỗi NỘI DUNG (T06): người học báo bài sai/lỗi thời → hộp thư giảng viên của khóa.
 * Khác contentReports (kiểm duyệt nội dung người dùng tạo). Gắn publishedVersion để biết lỗi thuộc bản nào.
 */
export type ContentIssueKind = "code_error" | "outdated" | "incorrect" | "unclear" | "typo" | "media" | "other";
export interface ContentIssueDoc {
  courseId: ObjectId;
  lessonId: ObjectId;
  reporterId: ObjectId;
  kind: ContentIssueKind;
  message: string;
  location: string;
  environment: string;
  publishedVersion: number;
  status: "open" | "resolved" | "wont_fix";
  resolvedBy: ObjectId | null;
  resolvedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
}

export type MediaPurpose = "course_thumbnail" | "lesson_image" | "lesson_video" | "preview_video";
export interface MediaRef {
  kind: "lesson_draft" | "lesson_published" | "course_draft" | "course_published";
  id: ObjectId;
}
export interface MediaAssetDoc {
  publicId: string;
  assetId: string;
  resourceType: "image" | "video";
  deliveryType: "upload" | "authenticated";
  purpose: MediaPurpose;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  version: number;
  posterPublicId: string | null;
  /** M03: thông tin ảnh do giảng viên khai báo (alt cho trình đọc màn hình, chú thích, nguồn, giấy phép). */
  imageMeta?: { alt: string; caption: string; credit: string; license: string } | null;
  ownerId: ObjectId;
  courseId: ObjectId;
  reservationId: ObjectId;
  status: "ready" | "deletion_pending" | "deleted" | "rejected";
  refs: MediaRef[];
  deletion: { requestedAt: Date; attempts: number; lastError: string | null; nextAttemptAt: Date } | null;
  rejectReason: string | null;
  originalFilename: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface UploadReservationDoc {
  userId: ObjectId;
  courseId: ObjectId;
  purpose: MediaPurpose;
  resourceType: "image" | "video";
  deliveryType: "upload" | "authenticated";
  publicId: string;
  reservedBytes: number;
  countsVideo: boolean;
  status: "active" | "finalizing" | "consumed" | "expired" | "released" | "rejected";
  signatureTimestamp: number;
  originalFilename: string;
  expiresAt: Date;
  purgeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface QuotaCounterDoc {
  _id: string;
  usedBytes: number;
  reservedBytes: number;
  usedCount: number;
  reservedCount: number;
  updatedAt: Date;
}
export interface UsageSnapshotDoc {
  source: "cloudinary_admin_api" | "mongodb_dbstats" | "mongodb_manual";
  takenAt: Date;
  providerLastUpdated: Date | null;
  authoritative: boolean;
  ok: boolean;
  error: string | null;
  data: {
    storageBytes?: number;
    bandwidthBytes?: number;
    transformations?: number;
    creditsUsed?: number | null;
    creditsLimit?: number | null;
    dataSize?: number;
    indexSize?: number;
    plan?: string;
  };
  fetchedBy: ObjectId | null;
}

export interface AppSettingsLimits {
  _id: "limits";
  videoMaxBytes: number;
  videoMaxSeconds: number;
  imageMaxBytes: number;
  videosPerCourse: number;
  coursesWithVideo: number;
  storageBytes: number;
  version: number;
  updatedBy: ObjectId | null;
  updatedAt: Date;
}
export interface AppSettingsBudget {
  _id: "budget";
  cloudinaryCredits: number;
  mongodbBytes: number;
  usageStaleAfterMinutes: number;
  version: number;
  updatedBy: ObjectId | null;
  updatedAt: Date;
}
export interface AppSettingsKillSwitches {
  _id: "killSwitches";
  uploadsEnabled: boolean;
  playbackIssuanceEnabled: boolean;
  eagerTransformationsEnabled: boolean;
  version: number;
  updatedBy: ObjectId | null;
  updatedAt: Date;
}
/** Banner thông báo toàn site do admin bật/tắt (vd ra mắt khóa mới, bảo trì). Chỉ chữ thuần + 1 link đã validate. */
export interface AppSettingsAnnouncement {
  _id: "announcement";
  enabled: boolean;
  message: string;
  linkHref: string;
  linkLabel: string;
  tone: "brand" | "info" | "warning";
  version: number;
  updatedBy: ObjectId | null;
  updatedAt: Date;
}
export type AppSettingsDoc = AppSettingsLimits | AppSettingsBudget | AppSettingsKillSwitches | AppSettingsAnnouncement;

export interface AuditLogDoc {
  at: Date;
  actorId: ObjectId | null;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: "success" | "denied" | "error";
  requestId: string | null;
  meta: Record<string, unknown>;
}

export interface RateLimitBucketDoc {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

export async function cols() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    authAccounts: db.collection<AuthAccountDoc>("authAccounts"),
    authTokens: db.collection<AuthTokenDoc>("authTokens"),
    instructorApplications: db.collection<InstructorApplicationDoc>("instructorApplications"),
    categories: db.collection<CategoryDoc>("categories"),
    technologies: db.collection<TechnologyDoc>("technologies"),
    courses: db.collection<CourseDoc>("courses"),
    chapters: db.collection<ChapterDoc>("chapters"),
    lessons: db.collection<LessonDoc>("lessons"),
    quizzes: db.collection<QuizDoc>("quizzes"),
    quizVersions: db.collection<QuizVersionDoc>("quizVersions"),
    quizAttempts: db.collection<QuizAttemptDoc>("quizAttempts"),
    quizResults: db.collection<QuizResultDoc>("quizResults"),
    enrollments: db.collection<EnrollmentDoc>("enrollments"),
    lessonProgress: db.collection<LessonProgressDoc>("lessonProgress"),
    notes: db.collection<NoteDoc>("notes"),
    bookmarks: db.collection<BookmarkDoc>("bookmarks"),
    playgroundSnippets: db.collection<PlaygroundSnippetDoc>("playgroundSnippets"),
    articles: db.collection<ArticleDoc>("articles"),
    codeExercises: db.collection<CodeExerciseDoc>("codeExercises"),
    exerciseAttempts: db.collection<ExerciseAttemptDoc>("exerciseAttempts"),
    reviewItems: db.collection<ReviewItemDoc>("reviewItems"),
    learningPaths: db.collection<LearningPathDoc>("learningPaths"),
    pathEnrollments: db.collection<PathEnrollmentDoc>("pathEnrollments"),
    projectAssignments: db.collection<ProjectAssignmentDoc>("projectAssignments"),
    projectSubmissions: db.collection<ProjectSubmissionDoc>("projectSubmissions"),
    questions: db.collection<QuestionDoc>("questions"),
    answers: db.collection<AnswerDoc>("answers"),
    courseReviews: db.collection<CourseReviewDoc>("courseReviews"),
    contentReports: db.collection<ContentReportDoc>("contentReports"),
    contentIssues: db.collection<ContentIssueDoc>("contentIssues"),
    mediaAssets: db.collection<MediaAssetDoc>("mediaAssets"),
    uploadReservations: db.collection<UploadReservationDoc>("uploadReservations"),
    quotaCounters: db.collection<QuotaCounterDoc>("quotaCounters"),
    usageSnapshots: db.collection<UsageSnapshotDoc>("usageSnapshots"),
    appSettings: db.collection<AppSettingsDoc>("appSettings") as Collection<AppSettingsDoc>,
    auditLogs: db.collection<AuditLogDoc>("auditLogs"),
    rateLimitBuckets: db.collection<RateLimitBucketDoc>("rateLimitBuckets"),
  };
}
export type Cols = Awaited<ReturnType<typeof cols>>;

/** Document đã đọc từ DB (có _id). */
export type Doc<T> = WithId<T>;
