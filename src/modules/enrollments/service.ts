import "server-only";
import { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { canEnroll, toPolicyCourse } from "@/modules/courses/policy";
import { courseProgressMany } from "@/modules/learning/progress";

/** Đăng ký học miễn phí: idempotent (unique userId+courseId), double click không tạo trùng (C6). */
export async function enroll(viewer: Viewer, courseId: ObjectId) {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId });
  if (!course) throw notFound("Không tìm thấy khóa học");
  const decision = canEnroll(viewer, toPolicyCourse(course));
  if (!decision.ok) {
    if (decision.reason === "verify") throw new AppError("EMAIL_NOT_VERIFIED", "Vui lòng xác minh email trước khi đăng ký khóa học.");
    throw new AppError("INVALID_STATE", "Khóa học hiện không mở đăng ký.");
  }
  const now = new Date();
  try {
    const res = await c.enrollments.updateOne(
      { userId: viewer.id, courseId },
      {
        $setOnInsert: {
          userId: viewer.id,
          courseId,
          source: "free",
          status: "active",
          revokedAt: null,
          revokedBy: null,
          revokedReason: null,
          lastLessonId: null,
          lastAccessedAt: now,
          completedAt: null,
          completedVersion: null,
          enrolledAt: now,
        },
      },
      { upsert: true },
    );
    if (res.upsertedCount === 1) await c.courses.updateOne({ _id: courseId }, { $inc: { enrollmentCount: 1 } });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err; // race: request khác đã tạo
  }
  const e = await c.enrollments.findOne({ userId: viewer.id, courseId });
  if (e?.status === "revoked") throw new AppError("FORBIDDEN", "Quyền truy cập khóa học này đã bị thu hồi. Liên hệ quản trị viên.");
  return { slug: course.slug };
}

export async function getEnrollment(userId: ObjectId, courseId: ObjectId) {
  const c = await cols();
  return c.enrollments.findOne({ userId, courseId });
}

export async function myCourses(viewer: Viewer) {
  const c = await cols();
  const enrollments = await c.enrollments.find({ userId: viewer.id }).sort({ lastAccessedAt: -1 }).limit(100).toArray();
  if (enrollments.length === 0) return [];
  const courses = await c.courses.find({ _id: { $in: enrollments.map((e) => e.courseId) } }).toArray();
  const byId = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const progress = await courseProgressMany(viewer.id, courses);
  const lastLessonIds = enrollments.map((e) => e.lastLessonId).filter((x): x is ObjectId => Boolean(x));
  const lastLessons = await c.lessons.find({ _id: { $in: lastLessonIds } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const lessonTitle = new Map(lastLessons.map((l) => [l._id.toHexString(), l.published?.title ?? null]));
  return enrollments
    .map((e) => {
      const course = byId.get(e.courseId.toHexString());
      if (!course?.published) return null;
      const p = progress.get(course._id.toHexString()) ?? { completed: 0, total: 0, percent: 0, nextLessonId: null };
      return {
        courseId: course._id.toHexString(),
        slug: course.slug,
        title: course.published.title,
        thumbnailUrl: course.published.thumbnailUrl,
        status: course.status,
        enrollmentStatus: e.status,
        progress: p,
        completedAt: e.completedAt,
        completedVersion: e.completedVersion,
        publishedVersion: course.publishedVersion,
        lastLessonId: e.lastLessonId?.toHexString() ?? null,
        lastLessonTitle: e.lastLessonId ? (lessonTitle.get(e.lastLessonId.toHexString()) ?? null) : null,
        lastAccessedAt: e.lastAccessedAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function revokeEnrollment(admin: Viewer, enrollmentId: ObjectId, reason: string) {
  if (!admin.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const e = await c.enrollments.findOneAndUpdate(
    { _id: enrollmentId, status: "active" },
    { $set: { status: "revoked", revokedAt: new Date(), revokedBy: admin.id, revokedReason: reason } },
    { returnDocument: "after" },
  );
  if (!e) throw new AppError("INVALID_STATE", "Enrollment không ở trạng thái hoạt động.");
  await c.courses.updateOne({ _id: e.courseId }, { $inc: { enrollmentCount: -1 } });
  await audit({ actorId: admin.id, action: "enrollment.revoke", targetType: "enrollment", targetId: enrollmentId, meta: { reason } });
}

export async function restoreEnrollment(admin: Viewer, enrollmentId: ObjectId) {
  if (!admin.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const e = await c.enrollments.findOneAndUpdate(
    { _id: enrollmentId, status: "revoked" },
    { $set: { status: "active", revokedAt: null, revokedBy: null, revokedReason: null } },
    { returnDocument: "after" },
  );
  if (!e) throw new AppError("INVALID_STATE", "Enrollment không ở trạng thái bị thu hồi.");
  await c.courses.updateOne({ _id: e.courseId }, { $inc: { enrollmentCount: 1 } });
  await audit({ actorId: admin.id, action: "enrollment.restore", targetType: "enrollment", targetId: new ObjectId(enrollmentId) });
}
