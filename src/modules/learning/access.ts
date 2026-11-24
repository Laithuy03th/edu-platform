import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import { AppError, notFound } from "@/lib/errors";
import { cols, type CourseDoc, type Doc, type EnrollmentDoc, type LessonDoc } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { canReadLesson, toPolicyCourse } from "@/modules/courses/policy";

export type LessonAccess = {
  course: Doc<CourseDoc>;
  lesson: Doc<LessonDoc> & { published: NonNullable<LessonDoc["published"]> };
  enrollment: Doc<EnrollmentDoc> | null;
};

const REASON_MSG: Record<string, string> = {
  login: "Vui lòng đăng nhập để học bài này.",
  enroll: "Bạn cần đăng ký khóa học để học bài này.",
  suspended: "Khóa học đang tạm ngưng truy cập.",
  unavailable: "Khóa học không khả dụng.",
  revoked: "Quyền truy cập khóa học của bạn đã bị thu hồi.",
};

/**
 * Kiểm tra quyền đọc nội dung đầy đủ của bài (bản published) — dùng chung cho trang học,
 * tiến độ, ghi chú, quiz, hỏi đáp, cấp URL video. Không tin courseId từ client: lấy từ lesson.
 */
export async function requireLessonAccess(viewer: Viewer | null, lessonId: ObjectId): Promise<LessonAccess> {
  const c = await cols();
  const lesson = await c.lessons.findOne({ _id: lessonId, published: { $ne: null } });
  if (!lesson?.published) throw notFound("Không tìm thấy bài học");
  const course = await c.courses.findOne({ _id: lesson.courseId });
  if (!course) throw notFound("Không tìm thấy bài học");
  // Chương chứa bài phải còn trong bản published.
  const chapter = await c.chapters.findOne({ _id: lesson.published.chapterId, courseId: course._id, published: { $ne: null } }, { projection: { _id: 1 } });
  if (!chapter) throw notFound("Không tìm thấy bài học");
  const enrollment = viewer ? await c.enrollments.findOne({ userId: viewer.id, courseId: course._id }) : null;
  const decision = canReadLesson(viewer, toPolicyCourse(course), lesson.published, enrollment);
  if (!decision.ok) {
    const code = decision.reason === "login" ? "UNAUTHENTICATED" : "FORBIDDEN";
    throw new AppError(code, REASON_MSG[decision.reason] ?? "Không có quyền truy cập.");
  }
  return { course, lesson: lesson as LessonAccess["lesson"], enrollment };
}

/**
 * Cùng kiểm tra quyền như requireLessonAccess nhưng MEMO trong phạm vi một request (React cache):
 * trang học gọi kiểm tra ở nhiều chỗ (dữ liệu trang, URL video, bài tập) — chỉ truy vấn DB một lần.
 * Không dùng sau một mutation trong cùng request (kết quả có thể cũ).
 */
const accessMemo = cache((_viewerKey: string, lessonHex: string, viewer: Viewer | null) => requireLessonAccess(viewer, new ObjectId(lessonHex)));
export function requireLessonAccessMemo(viewer: Viewer | null, lessonId: ObjectId): Promise<LessonAccess> {
  return accessMemo(viewer ? `${viewer.idStr}:${viewer.authVersion}` : "anon", lessonId.toHexString(), viewer);
}

/** Quyền "học" (ghi tiến độ, ghi chú, quiz): cần đăng nhập + quyền đọc bài. */
export async function requireLearnAccess(viewer: Viewer, lessonId: ObjectId) {
  return requireLessonAccess(viewer, lessonId);
}
