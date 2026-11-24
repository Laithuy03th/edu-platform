import "server-only";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError, notFound } from "@/lib/errors";
import { cols, type ContentIssueKind } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccess } from "@/modules/learning/access";

export const ISSUE_KINDS: Record<ContentIssueKind, string> = {
  code_error: "Code không chạy / sai kết quả",
  outdated: "Lỗi thời so với phiên bản mới",
  incorrect: "Kiến thức chưa chính xác",
  unclear: "Giải thích khó hiểu",
  typo: "Lỗi chính tả / trình bày",
  media: "Video/hình có vấn đề",
  other: "Khác",
};
export const MAX_OPEN_PER_LESSON = 3;

export const issueInput = z.object({
  kind: z.enum(Object.keys(ISSUE_KINDS) as [ContentIssueKind, ...ContentIssueKind[]]),
  message: z.string().trim().min(10, "Mô tả ít nhất 10 ký tự để giảng viên tái hiện được").max(2000),
  location: z.string().trim().max(160).default(""),
  environment: z.string().trim().max(160).default(""),
});
export type IssueInput = z.infer<typeof issueInput>;

/** Người có quyền ĐỌC bài (đã đăng ký hoặc bài học thử) mới báo lỗi được; tối đa 3 báo cáo đang mở/bài/người. */
export async function reportIssue(viewer: Viewer, lessonId: ObjectId, input: IssueInput) {
  const data = issueInput.parse(input);
  const { course } = await requireLessonAccess(viewer, lessonId);
  const c = await cols();
  if ((await c.contentIssues.countDocuments({ reporterId: viewer.id, lessonId, status: "open" })) >= MAX_OPEN_PER_LESSON) {
    throw new AppError("LIMIT_REACHED", "Bạn đã có 3 báo lỗi đang chờ xử lý cho bài này. Giảng viên sẽ phản hồi sớm.");
  }
  const res = await c.contentIssues.insertOne({
    courseId: course._id,
    lessonId,
    reporterId: viewer.id,
    ...data,
    publishedVersion: course.publishedVersion,
    status: "open",
    resolvedBy: null,
    resolvedAt: null,
    resolution: null,
    createdAt: new Date(),
  });
  await audit({ actorId: viewer.id, action: "content_issue.report", targetType: "lesson", targetId: lessonId, meta: { kind: data.kind } });
  return { id: res.insertedId.toHexString() };
}

/** Báo lỗi của CHÍNH người xem cho một bài (hiện trạng thái xử lý ngay trên trang học). */
export async function myIssuesForLesson(viewer: Viewer | null, lessonId: ObjectId) {
  if (!viewer) return [];
  const c = await cols();
  const rows = await c.contentIssues.find({ reporterId: viewer.id, lessonId }).sort({ createdAt: -1 }).limit(10).toArray();
  return rows.map((r) => ({ id: r._id.toHexString(), kind: r.kind, status: r.status, resolution: r.resolution, createdAt: r.createdAt.toISOString() }));
}

/** Hộp thư: giảng viên chỉ thấy khóa của mình; admin thấy tất cả. Không lộ email người báo. */
export async function listIssues(viewer: Viewer, opts: { status?: "open" | "resolved" | "wont_fix" | "all"; limit?: number } = {}) {
  const c = await cols();
  const isAdmin = viewer.roles.includes("admin");
  if (!isAdmin && !viewer.roles.includes("instructor")) throw new AppError("FORBIDDEN", "Bạn không có quyền xem hộp thư này.");
  const courseFilter = isAdmin ? {} : { courseId: { $in: (await c.courses.find({ instructorId: viewer.id }, { projection: { _id: 1 } }).toArray()).map((x) => x._id) } };
  const status = opts.status && opts.status !== "all" ? { status: opts.status } : {};
  const rows = await c.contentIssues.find({ ...courseFilter, ...status }).sort({ createdAt: -1 }).limit(Math.min(opts.limit ?? 100, 200)).toArray();
  const courseIds = [...new Set(rows.map((r) => r.courseId.toHexString()))];
  const lessonIds = [...new Set(rows.map((r) => r.lessonId.toHexString()))];
  const reporterIds = [...new Set(rows.map((r) => r.reporterId.toHexString()))];
  const { ObjectId: OID } = await import("mongodb");
  const [courses, lessons, users] = await Promise.all([
    c.courses.find({ _id: { $in: courseIds.map((x) => new OID(x)) } }, { projection: { slug: 1, publishedVersion: 1, "published.title": 1, "draft.title": 1 } }).toArray(),
    c.lessons.find({ _id: { $in: lessonIds.map((x) => new OID(x)) } }, { projection: { "published.title": 1, "draft.title": 1 } }).toArray(),
    c.users.find({ _id: { $in: reporterIds.map((x) => new OID(x)) } }, { projection: { displayName: 1 } }).toArray(),
  ]);
  const co = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const le = new Map(lessons.map((x) => [x._id.toHexString(), x]));
  const us = new Map(users.map((x) => [x._id.toHexString(), x]));
  return rows.map((r) => {
    const course = co.get(r.courseId.toHexString());
    const lesson = le.get(r.lessonId.toHexString());
    return {
      id: r._id.toHexString(),
      kind: r.kind,
      message: r.message,
      location: r.location,
      environment: r.environment,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
      reporterName: us.get(r.reporterId.toHexString())?.displayName ?? "Người học",
      courseTitle: course?.published?.title ?? course?.draft.title ?? "—",
      lessonTitle: lesson?.published?.title ?? lesson?.draft?.title ?? "—",
      href: course ? `/learn/${course.slug}/${r.lessonId.toHexString()}` : "#",
      editHref: course ? `/instructor/courses/${r.courseId.toHexString()}/lessons/${r.lessonId.toHexString()}` : "#",
      reportedOnVersion: r.publishedVersion,
      currentVersion: course?.publishedVersion ?? 0,
    };
  });
}

export async function openIssueCount(viewer: Viewer) {
  const c = await cols();
  if (viewer.roles.includes("admin")) return c.contentIssues.countDocuments({ status: "open" });
  const ids = (await c.courses.find({ instructorId: viewer.id }, { projection: { _id: 1 } }).toArray()).map((x) => x._id);
  return ids.length ? c.contentIssues.countDocuments({ courseId: { $in: ids }, status: "open" }) : 0;
}

/** Chỉ giảng viên CỦA KHÓA hoặc admin xử lý; ghi audit. */
export async function resolveIssue(viewer: Viewer, issueId: ObjectId, status: "resolved" | "wont_fix" | "open", resolution: string) {
  const c = await cols();
  const issue = await c.contentIssues.findOne({ _id: issueId });
  if (!issue) throw notFound("Không tìm thấy báo lỗi");
  const course = await c.courses.findOne({ _id: issue.courseId }, { projection: { instructorId: 1 } });
  const allowed = viewer.roles.includes("admin") || (course && course.instructorId.equals(viewer.id));
  if (!allowed) throw notFound("Không tìm thấy báo lỗi");
  const note = resolution.trim().slice(0, 1000);
  if (status !== "open" && note.length < 3) throw new AppError("VALIDATION_FAILED", "Ghi chú xử lý cho người báo (ít nhất 3 ký tự).", { fieldErrors: { resolution: ["Bắt buộc"] } });
  await c.contentIssues.updateOne(
    { _id: issueId },
    { $set: status === "open" ? { status, resolvedBy: null, resolvedAt: null, resolution: null } : { status, resolvedBy: viewer.id, resolvedAt: new Date(), resolution: note } },
  );
  await audit({ actorId: viewer.id, action: `content_issue.${status}`, targetType: "contentIssue", targetId: issueId, meta: {} });
}
