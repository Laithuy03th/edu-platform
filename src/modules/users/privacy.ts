import "server-only";
import type { ObjectId } from "mongodb";
import { AppError } from "@/lib/errors";
import { audit } from "@/server/audit";
import { verifyPassword } from "@/server/auth/password";
import type { Viewer } from "@/server/auth/viewer-core";
import { cols } from "@/server/db/models";
import { RULES, consumeRate } from "@/server/rate-limit";

/**
 * Quyền của người dùng với dữ liệu cá nhân (chính sách bảo mật §7–8):
 * - exportMyData: tải TOÀN BỘ dữ liệu gắn với tài khoản (JSON) — không kèm băm mật khẩu, token, authVersion.
 * - deleteMyAccount: xóa dữ liệu riêng tư, ẩn danh hóa tài khoản; nội dung đã đăng công khai (đánh giá, hỏi đáp,
 *   báo lỗi nội dung) được giữ để không làm vỡ thảo luận/điểm đánh giá nhưng hiển thị "Người dùng đã xóa".
 */
export const DELETED_NAME = "Người dùng đã xóa";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function exportMyData(viewer: Viewer) {
  await consumeRate(RULES.exportData, viewer.idStr);
  const c = await cols();
  const uid = viewer.id;
  const [user, accounts, enrollments, progress, notes, attempts, results, exercises, reviewItems, bookmarks, reviews, questions, answers, submissions, pathEnrollments, snippets, issues, applications] = await Promise.all([
    c.users.findOne({ _id: uid }),
    c.authAccounts.find({ userId: uid }).toArray(),
    c.enrollments.find({ userId: uid }).toArray(),
    c.lessonProgress.find({ userId: uid }).limit(20_000).toArray(),
    c.notes.find({ userId: uid }).limit(20_000).toArray(),
    c.quizAttempts.find({ userId: uid }).limit(20_000).toArray(),
    c.quizResults.find({ userId: uid }).toArray(),
    c.exerciseAttempts.find({ userId: uid }).limit(20_000).toArray(),
    c.reviewItems.find({ userId: uid }).limit(20_000).toArray(),
    c.bookmarks.find({ userId: uid }).toArray(),
    c.courseReviews.find({ userId: uid }).toArray(),
    c.questions.find({ authorId: uid }).toArray(),
    c.answers.find({ authorId: uid }).toArray(),
    c.projectSubmissions.find({ userId: uid }).toArray(),
    c.pathEnrollments.find({ userId: uid }).toArray(),
    c.playgroundSnippets.find({ userId: uid }).toArray(),
    c.contentIssues.find({ reporterId: uid }).toArray(),
    c.instructorApplications.find({ userId: uid }).toArray(),
  ]);
  if (!user) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");

  // Tên khóa/bài để file đọc được mà không cần tra id
  const courseIds = new Map<string, ObjectId>();
  for (const x of [...enrollments, ...progress, ...notes, ...attempts, ...reviews]) courseIds.set(x.courseId.toHexString(), x.courseId);
  const lessonIds = new Map<string, ObjectId>();
  for (const x of [...progress, ...notes]) lessonIds.set(x.lessonId.toHexString(), x.lessonId);
  const [courses, lessons] = await Promise.all([
    c.courses.find({ _id: { $in: [...courseIds.values()] } }, { projection: { slug: 1, "draft.title": 1, "published.title": 1 } }).toArray(),
    c.lessons.find({ _id: { $in: [...lessonIds.values()] } }, { projection: { "published.title": 1, "draft.title": 1 } }).toArray(),
  ]);
  const course = (id: ObjectId) => {
    const x = courses.find((k) => k._id.equals(id));
    return x ? { slug: x.slug, title: x.published?.title ?? x.draft.title } : { slug: null, title: "(khóa học đã xóa)" };
  };
  const lesson = (id: ObjectId) => {
    const x = lessons.find((k) => k._id.equals(id));
    return x?.published?.title ?? x?.draft?.title ?? "(bài học đã xóa)";
  };

  return {
    format: "tuhoc-export-v1",
    exportedAt: new Date().toISOString(),
    note: "Dữ liệu gắn với tài khoản Tự Học của bạn. Không gồm mật khẩu (chỉ lưu dạng băm) và token phiên.",
    account: {
      id: user._id.toHexString(),
      email: user.email,
      emailVerifiedAt: iso(user.emailVerifiedAt),
      displayName: user.displayName,
      bio: user.bio,
      timezone: user.timezone,
      learningGoal: user.learningGoal,
      weeklyGoalLessons: user.weeklyGoalLessons ?? null,
      dataSaver: user.dataSaver,
      roles: user.roles,
      hasPassword: Boolean(user.passwordHash),
      publicProfile: user.publicProfile,
      createdAt: iso(user.createdAt),
      lastLoginAt: iso(user.lastLoginAt),
      linkedLogins: accounts.map((a) => ({ provider: a.provider, email: a.emailAtLink, linkedAt: iso(a.linkedAt) })),
    },
    enrollments: enrollments.map((e) => ({ course: course(e.courseId), status: e.status, enrolledAt: iso(e.enrolledAt), lastAccessedAt: iso(e.lastAccessedAt), completedAt: iso(e.completedAt), showOnProfile: e.showOnProfile ?? false })),
    lessonProgress: progress.map((p) => ({ course: course(p.courseId).slug, lesson: lesson(p.lessonId), completedAt: iso(p.completedAt), completionSource: p.completionSource, lastPositionSeconds: p.lastPositionSeconds, understanding: p.understanding })),
    notes: notes.map((n) => ({ course: course(n.courseId).slug, lesson: lesson(n.lessonId), timestampSeconds: n.timestampSeconds, content: n.content, createdAt: iso(n.createdAt), updatedAt: iso(n.updatedAt) })),
    quizAttempts: attempts.map((a) => ({ course: course(a.courseId).slug, quizId: a.quizId.toHexString(), scorePercent: a.scorePercent, correctCount: a.correctCount, total: a.total, passed: a.passed, submittedAt: iso(a.submittedAt) })),
    quizResults: results.map((r) => ({ quizId: r.quizId.toHexString(), bestScorePercent: r.bestScorePercent, latestScorePercent: r.latestScorePercent, attemptCount: r.attemptCount, firstPassedAt: iso(r.firstPassedAt) })),
    exerciseAttempts: exercises.map((x) => ({ exerciseId: x.exerciseId.toHexString(), attempts: x.attempts, hintsUsed: x.hintsUsed, solved: x.solved, revealed: x.revealed, updatedAt: iso(x.updatedAt) })),
    reviewQueue: reviewItems.map((r) => ({ quizId: r.quizId.toHexString(), questionId: r.questionId, status: r.status, nextReviewAt: iso(r.nextReviewAt), lastReviewedAt: iso(r.lastReviewedAt) })),
    bookmarks: bookmarks.map((b) => ({ type: b.targetType, targetId: b.targetId.toHexString(), createdAt: iso(b.createdAt) })),
    courseReviews: reviews.map((r) => ({ course: course(r.courseId), rating: r.rating, comment: r.comment, status: r.status, createdAt: iso(r.createdAt) })),
    questions: questions.map((q) => ({ title: q.title, body: q.body, status: q.status, createdAt: iso(q.createdAt) })),
    answers: answers.map((a) => ({ body: a.body, status: a.status, createdAt: iso(a.createdAt) })),
    projectSubmissions: submissions.map((s) => ({ assignmentId: s.assignmentId.toHexString(), status: s.status, draft: s.draftFields, rounds: s.rounds, skills: s.skills, createdAt: iso(s.createdAt), updatedAt: iso(s.updatedAt) })),
    learningPaths: pathEnrollments.map((p) => ({ pathId: p.pathId.toHexString(), status: p.status, startedAt: iso(p.startedAt) })),
    playgroundSnippets: snippets.map((s) => ({ kind: s.kind, title: s.title, files: s.files, createdAt: iso(s.createdAt), updatedAt: iso(s.updatedAt) })),
    contentIssues: issues.map((i) => ({ kind: i.kind, message: i.message, location: i.location, status: i.status, createdAt: iso(i.createdAt) })),
    instructorApplications: applications.map((a) => ({ status: a.status, motivation: a.motivation, sampleUrl: a.sampleUrl, createdAt: iso(a.createdAt) })),
  };
}

/**
 * Xóa tài khoản của CHÍNH người dùng. Xác thực lại: mật khẩu hiện tại (nếu có) hoặc gõ đúng email (tài khoản chỉ
 * đăng nhập Google). Tài khoản giảng viên/quản trị không tự xóa được (đang sở hữu khóa học / quyền duyệt).
 * Thứ tự: khóa tài khoản trước (mọi phiên mất hiệu lực ngay), rồi xóa dữ liệu riêng tư.
 */
export async function deleteMyAccount(viewer: Viewer, input: { currentPassword: string; confirmEmail: string }) {
  await consumeRate(RULES.passwordUser, viewer.idStr);
  const c = await cols();
  const user = await c.users.findOne({ _id: viewer.id });
  if (!user || user.status !== "active") throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (user.roles.includes("admin") || user.roles.includes("instructor")) {
    throw new AppError("FORBIDDEN", "Tài khoản giảng viên/quản trị không tự xóa được vì đang gắn với khóa học và quyền duyệt. Hãy liên hệ quản trị viên.");
  }
  if (user.passwordHash) {
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new AppError("VALIDATION_FAILED", "Mật khẩu hiện tại không đúng.", { fieldErrors: { currentPassword: ["Mật khẩu hiện tại không đúng."] } });
    }
  } else if (input.confirmEmail.trim().toLowerCase() !== user.emailNormalized) {
    throw new AppError("VALIDATION_FAILED", "Email xác nhận không khớp.", { fieldErrors: { confirmEmail: ["Gõ đúng email của tài khoản để xác nhận."] } });
  }

  const now = new Date();
  const uid = user._id;
  const placeholder = `deleted-${uid.toHexString()}@deleted.invalid`;
  // 1) Ẩn danh hóa + khóa: authVersion tăng → mọi phiên (kể cả phiên hiện tại) hết hiệu lực ở request kế tiếp
  await c.users.updateOne(
    { _id: uid },
    {
      $set: {
        status: "deleted",
        email: placeholder,
        emailNormalized: placeholder,
        emailVerifiedAt: null,
        passwordHash: null,
        passwordUpdatedAt: null,
        displayName: DELETED_NAME,
        bio: "",
        learningGoal: "",
        avatar: { kind: "initials" },
        roles: ["student"],
        publicProfile: { enabled: false, handle: null },
        blockedReason: null,
        lastLoginAt: null,
        deletedAt: now,
        updatedAt: now,
      },
      $inc: { authVersion: 1 },
    },
  );
  // 2) Xóa dữ liệu riêng tư (ghi chú, tiến độ chi tiết, bài làm, bản lưu, liên kết đăng nhập, token)
  const byUser = { userId: uid };
  await Promise.all([
    c.authAccounts.deleteMany(byUser),
    c.authTokens.deleteMany(byUser),
    c.notes.deleteMany(byUser),
    c.bookmarks.deleteMany(byUser),
    c.playgroundSnippets.deleteMany(byUser),
    c.lessonProgress.deleteMany(byUser),
    c.quizAttempts.deleteMany(byUser),
    c.quizResults.deleteMany(byUser),
    c.exerciseAttempts.deleteMany(byUser),
    c.reviewItems.deleteMany(byUser),
    c.pathEnrollments.deleteMany(byUser),
    c.projectSubmissions.deleteMany(byUser),
    c.instructorApplications.deleteMany(byUser),
    // Đăng ký khóa giữ lại (số liệu tổng hợp của khóa) nhưng không còn hiện trên hồ sơ nào
    c.enrollments.updateMany(byUser, { $set: { showOnProfile: false, lastLessonId: null } }),
  ]);
  await audit({ actorId: uid, action: "user.self_delete", targetType: "user", targetId: uid });
  // Handle hồ sơ công khai cũ — nơi gọi xóa cache trang /u/<handle> ngay (không chờ hết hạn)
  return { previousHandle: user.publicProfile.enabled ? user.publicProfile.handle : null };
}
