import "server-only";
import type { ObjectId } from "mongodb";
import { AppError, notFound } from "@/lib/errors";
import { cols } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { canWriteCourseReview, toPolicyCourse } from "@/modules/courses/policy";

export const REVIEW_PAGE_SIZE = 10;

/** Tính lại aggregate từ review visible (số review/khóa nhỏ) — luôn đúng sau sửa/ẩn/xóa. */
export async function recomputeRating(courseId: ObjectId) {
  const c = await cols();
  const [agg] = await c.courseReviews
    .aggregate<{ avg: number; count: number }>([{ $match: { courseId, status: "visible" } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }])
    .toArray();
  await c.courses.updateOne({ _id: courseId }, { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count ?? 0 } });
}

async function completedCount(userId: ObjectId, courseId: ObjectId) {
  const c = await cols();
  return c.lessonProgress.countDocuments({ userId, courseId, completedAt: { $ne: null } });
}

export async function canReviewCourse(viewer: Viewer, courseId: ObjectId): Promise<boolean> {
  const c = await cols();
  const course = await c.courses.findOne({ _id: courseId }, { projection: { instructorId: 1, status: 1, published: 1 } });
  if (!course) return false;
  const enrollment = await c.enrollments.findOne({ userId: viewer.id, courseId });
  return canWriteCourseReview(viewer, toPolicyCourse(course), enrollment, await completedCount(viewer.id, courseId));
}

/** Một user một review/khóa (unique index), có thể cập nhật. */
export async function upsertReview(viewer: Viewer, courseId: ObjectId, rating: number, comment: string) {
  if (!(await canReviewCourse(viewer, courseId))) {
    throw new AppError("FORBIDDEN", "Bạn cần đăng ký và hoàn thành ít nhất một bài để đánh giá. Giảng viên không tự đánh giá khóa của mình.");
  }
  const c = await cols();
  const now = new Date();
  const existing = await c.courseReviews.findOne({ userId: viewer.id, courseId });
  if (existing?.status === "hidden") throw new AppError("INVALID_STATE", "Đánh giá của bạn đã bị ẩn bởi quản trị viên.");
  await c.courseReviews.updateOne(
    { userId: viewer.id, courseId },
    {
      $set: { rating, comment, updatedAt: now },
      $setOnInsert: { userId: viewer.id, courseId, status: "visible", hiddenReason: null, hiddenBy: null, createdAt: now },
    },
    { upsert: true },
  );
  await recomputeRating(courseId);
}

export async function deleteMyReview(viewer: Viewer, courseId: ObjectId) {
  const c = await cols();
  const res = await c.courseReviews.deleteOne({ userId: viewer.id, courseId, status: "visible" });
  if (res.deletedCount === 0) throw notFound("Không có đánh giá để xóa");
  await recomputeRating(courseId);
}

/** Admin ẩn/hiện review có lý do + audit; giảng viên không có quyền này. */
export async function moderateReview(admin: Viewer, reviewId: ObjectId, action: "hide" | "unhide", reason: string) {
  if (!admin.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
  const c = await cols();
  const r = await c.courseReviews.findOneAndUpdate(
    { _id: reviewId },
    { $set: action === "hide" ? { status: "hidden", hiddenReason: reason, hiddenBy: admin.id, updatedAt: new Date() } : { status: "visible", hiddenReason: null, hiddenBy: null, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!r) throw notFound("Không tìm thấy đánh giá");
  await recomputeRating(r.courseId);
  await audit({ actorId: admin.id, action: `review.${action}`, targetType: "courseReview", targetId: reviewId, meta: { reason } });
}

export async function myCourseReview(userId: ObjectId, courseId: ObjectId) {
  const c = await cols();
  return c.courseReviews.findOne({ userId, courseId });
}

export type ReviewDto = { id: string; rating: number; comment: string; authorName: string; updatedAt: string };

export async function listCourseReviews(courseId: ObjectId, page: number): Promise<{ items: ReviewDto[]; total: number }> {
  const c = await cols();
  const filter = { courseId, status: "visible" as const };
  const [docs, total] = await Promise.all([
    c.courseReviews.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * REVIEW_PAGE_SIZE).limit(REVIEW_PAGE_SIZE).toArray(),
    c.courseReviews.countDocuments(filter),
  ]);
  const users = await c.users.find({ _id: { $in: docs.map((d) => d.userId) } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray();
  const name = new Map(users.map((u) => [u._id.toHexString(), u.displayName]));
  // DTO công khai: chỉ tên hiển thị, không email/userId.
  return {
    items: docs.map((d) => ({ id: d._id.toHexString(), rating: d.rating, comment: d.comment, authorName: name.get(d.userId.toHexString()) ?? "Học viên", updatedAt: d.updatedAt.toISOString() })),
    total,
  };
}
