import type { ObjectId } from "mongodb";
import type { CourseStatus, Role } from "@/server/db/models";

/* Hàm policy thuần (AUTH_SECURITY §6) — nhận dữ liệu đã đọc từ DB, không nhận từ client. */

export type PolicyViewer = { id: ObjectId; roles: Role[]; emailVerified: boolean } | null;
export type PolicyCourse = { instructorId: ObjectId; status: CourseStatus; hasPublished: boolean };
export type PolicyEnrollment = { status: "active" | "revoked" } | null;

export const isAdmin = (v: PolicyViewer) => Boolean(v?.roles.includes("admin"));
export const isOwner = (v: PolicyViewer, c: PolicyCourse) => Boolean(v && c.instructorId.equals(v.id));

/** Khóa có hiển thị công khai (catalog, chi tiết) không. */
export function isCoursePublic(c: PolicyCourse): boolean {
  return c.status === "published" && c.hasPublished;
}

export function canEditCourse(v: PolicyViewer, c: PolicyCourse): boolean {
  if (!v) return false;
  if (isAdmin(v)) return true;
  return v.roles.includes("instructor") && isOwner(v, c);
}

export function canEnroll(v: PolicyViewer, c: PolicyCourse): { ok: true } | { ok: false; reason: "login" | "verify" | "unavailable" } {
  if (!v) return { ok: false, reason: "login" };
  if (!v.emailVerified) return { ok: false, reason: "verify" };
  if (!isCoursePublic(c)) return { ok: false, reason: "unavailable" };
  return { ok: true };
}

/**
 * Quyền đọc nội dung đầy đủ của một bài (bản published).
 * - Bài preview của khóa public: ai cũng đọc.
 * - Admin, chủ khóa: luôn đọc (kể cả khi suspended, để xử lý).
 * - Học viên: enrollment active VÀ khóa published/archived (không suspended).
 */
export function canReadLesson(
  v: PolicyViewer,
  c: PolicyCourse,
  lesson: { isPreview: boolean },
  enrollment: PolicyEnrollment,
): { ok: true } | { ok: false; reason: "login" | "enroll" | "suspended" | "unavailable" | "revoked" } {
  if (isAdmin(v) || (v && isOwner(v, c))) return { ok: true };
  if (c.status === "suspended") return { ok: false, reason: "suspended" };
  if (!c.hasPublished || c.status === "draft") return { ok: false, reason: "unavailable" };
  if (lesson.isPreview && c.status === "published") return { ok: true };
  if (!v) return { ok: false, reason: "login" };
  if (enrollment?.status === "revoked") return { ok: false, reason: "revoked" };
  if (enrollment?.status === "active" && (c.status === "published" || c.status === "archived")) return { ok: true };
  return { ok: false, reason: "enroll" };
}

/** Có hoạt động học hợp lệ, không phải giảng viên của khóa (§15.2). */
export function canWriteCourseReview(
  v: PolicyViewer,
  c: PolicyCourse,
  enrollment: PolicyEnrollment,
  completedLessons: number,
): boolean {
  if (!v || !v.emailVerified) return false;
  if (isOwner(v, c)) return false;
  return enrollment?.status === "active" && completedLessons >= 1;
}

export function canViewSubmission(v: PolicyViewer, submissionOwnerId: ObjectId, c: PolicyCourse): boolean {
  if (!v) return false;
  return submissionOwnerId.equals(v.id) || isAdmin(v) || isOwner(v, c);
}

export const toPolicyCourse = (c: { instructorId: ObjectId; status: CourseStatus; published: unknown }): PolicyCourse => ({
  instructorId: c.instructorId,
  status: c.status,
  hasPublished: c.published !== null && c.published !== undefined,
});
