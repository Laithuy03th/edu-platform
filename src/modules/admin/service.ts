import "server-only";
import { unstable_cache } from "next/cache";
import { ObjectId, type Filter } from "mongodb";
import { AppError, isDuplicateKeyError, notFound } from "@/lib/errors";
import { escapeRegex, slugify } from "@/lib/text";
import { cols, type AuditLogDoc, type Role, type UserDoc } from "@/server/db/models";
import { audit } from "@/server/audit";
import type { Viewer } from "@/server/auth/viewer-core";

function requireAdmin(v: Viewer) {
  if (!v.roles.includes("admin")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên.");
}

/** Thống kê tổng hợp — cache 5 phút để không quét lại mỗi lần tải trang (§18). */
export const adminStats = unstable_cache(
  async () => {
    const c = await cols();
    const [users, instructors, blocked, published, pending, enrollments, completions, openReports, pendingApps, notes, attempts] = await Promise.all([
      c.users.estimatedDocumentCount(),
      c.users.countDocuments({ roles: "instructor" }),
      c.users.countDocuments({ status: "blocked" }),
      c.courses.countDocuments({ status: "published" }),
      c.courses.countDocuments({ "review.state": "pending" }),
      c.enrollments.countDocuments({ status: "active" }),
      c.enrollments.countDocuments({ completedAt: { $ne: null } }),
      c.contentReports.countDocuments({ status: "open" }),
      c.instructorApplications.countDocuments({ status: "pending" }),
      c.notes.estimatedDocumentCount(),
      c.quizAttempts.estimatedDocumentCount(),
    ]);
    return { users, instructors, blocked, published, pending, enrollments, completions, openReports, pendingApps, notes, attempts, at: new Date().toISOString() };
  },
  ["admin-stats-v1"],
  { revalidate: 300, tags: ["admin-stats"] },
);

export async function listUsers(admin: Viewer, opts: { q?: string; role?: Role | null; page: number }) {
  requireAdmin(admin);
  const c = await cols();
  const filter: Filter<UserDoc> = {};
  if (opts.role) filter.roles = opts.role;
  if (opts.q) filter.$or = [{ emailNormalized: { $regex: escapeRegex(opts.q.toLowerCase().slice(0, 100)) } }, { displayName: { $regex: escapeRegex(opts.q.slice(0, 100)), $options: "i" } }];
  const [items, total] = await Promise.all([
    c.users
      .find(filter)
      .project<Pick<UserDoc, "email" | "displayName" | "roles" | "status" | "emailVerifiedAt" | "createdAt" | "lastLoginAt"> & { _id: ObjectId }>({ email: 1, displayName: 1, roles: 1, status: 1, emailVerifiedAt: 1, createdAt: 1, lastLoginAt: 1 })
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * 25)
      .limit(25)
      .toArray(),
    c.users.countDocuments(filter),
  ]);
  return { items, total };
}

async function adminCount() {
  const c = await cols();
  return c.users.countDocuments({ roles: "admin", status: "active" });
}

export async function setUserStatus(admin: Viewer, userId: ObjectId, status: "active" | "blocked", reason: string) {
  requireAdmin(admin);
  if (admin.id.equals(userId)) throw new AppError("FORBIDDEN", "Không thể tự khóa tài khoản của mình.");
  const c = await cols();
  const u = await c.users.findOne({ _id: userId });
  if (!u) throw notFound("Không tìm thấy người dùng");
  if (status === "blocked" && u.roles.includes("admin") && (await adminCount()) <= 1) throw new AppError("FORBIDDEN", "Không thể khóa quản trị viên cuối cùng.");
  // Khóa → tăng authVersion để mọi phiên bị từ chối ngay (A7).
  await c.users.updateOne({ _id: userId }, { $set: { status, blockedReason: status === "blocked" ? reason : null, updatedAt: new Date() }, ...(status === "blocked" ? { $inc: { authVersion: 1 } } : {}) });
  await audit({ actorId: admin.id, action: `user.${status === "blocked" ? "block" : "unblock"}`, targetType: "user", targetId: userId, meta: { reason } });
}

export async function setUserRoles(admin: Viewer, userId: ObjectId, roles: Role[]) {
  requireAdmin(admin);
  const c = await cols();
  const u = await c.users.findOne({ _id: userId });
  if (!u) throw notFound("Không tìm thấy người dùng");
  const next = [...new Set<Role>(["student", ...roles])];
  if (u.roles.includes("admin") && !next.includes("admin") && (await adminCount()) <= 1) throw new AppError("FORBIDDEN", "Không thể gỡ quyền của quản trị viên cuối cùng.");
  await c.users.updateOne({ _id: userId }, { $set: { roles: next, updatedAt: new Date() } });
  await audit({ actorId: admin.id, action: "user.roles", targetType: "user", targetId: userId, meta: { before: u.roles, after: next } });
}

export async function listApplications(admin: Viewer) {
  requireAdmin(admin);
  const c = await cols();
  const apps = await c.instructorApplications.find({ status: "pending" }).sort({ createdAt: 1 }).limit(100).toArray();
  const users = await c.users.find({ _id: { $in: apps.map((a) => a.userId) } }).project<{ _id: ObjectId; displayName: string; email: string }>({ displayName: 1, email: 1 }).toArray();
  const um = new Map(users.map((u) => [u._id.toHexString(), u]));
  return apps.map((a) => ({ id: a._id.toHexString(), motivation: a.motivation, sampleUrl: a.sampleUrl, createdAt: a.createdAt.toISOString(), user: um.get(a.userId.toHexString()) ?? null }));
}

export async function decideApplication(admin: Viewer, applicationId: ObjectId, decision: "approved" | "rejected", reason: string) {
  requireAdmin(admin);
  const c = await cols();
  const app = await c.instructorApplications.findOneAndUpdate(
    { _id: applicationId, status: "pending" },
    { $set: { status: decision, reviewedBy: admin.id, reviewedAt: new Date(), decisionReason: reason || null, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!app) throw new AppError("INVALID_STATE", "Đơn không còn chờ duyệt.");
  if (decision === "approved") await c.users.updateOne({ _id: app.userId }, { $addToSet: { roles: "instructor" }, $set: { updatedAt: new Date() } });
  await audit({ actorId: admin.id, action: `instructor_application.${decision}`, targetType: "user", targetId: app.userId, meta: { reason } });
}

export async function listCategoriesAdmin() {
  const c = await cols();
  return c.categories.find({}).sort({ order: 1 }).toArray();
}

export async function upsertCategory(admin: Viewer, id: ObjectId | null, input: { name: string; order: number; isActive: boolean }) {
  requireAdmin(admin);
  const c = await cols();
  if (id) {
    await c.categories.updateOne({ _id: id }, { $set: input });
  } else {
    try {
      await c.categories.insertOne({ ...input, slug: slugify(input.name) || `chu-de-${Date.now()}` });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new AppError("ALREADY_EXISTS", "Chủ đề đã tồn tại.");
      throw err;
    }
  }
  await audit({ actorId: admin.id, action: "category.upsert", targetType: "category", targetId: id, meta: input });
}

export async function listAudit(admin: Viewer, opts: { action?: string; page: number }) {
  requireAdmin(admin);
  const c = await cols();
  const filter: Filter<AuditLogDoc> = {};
  if (opts.action) filter.action = { $regex: `^${escapeRegex(opts.action.slice(0, 50))}` };
  const [items, total] = await Promise.all([c.auditLogs.find(filter).sort({ at: -1 }).skip((opts.page - 1) * 50).limit(50).toArray(), c.auditLogs.countDocuments(filter)]);
  const actors = await c.users.find({ _id: { $in: items.map((i) => i.actorId).filter((x): x is ObjectId => Boolean(x)) } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray();
  const am = new Map(actors.map((a) => [a._id.toHexString(), a.displayName]));
  return { total, items: items.map((i) => ({ ...i, actorName: i.actorId ? (am.get(i.actorId.toHexString()) ?? i.actorId.toHexString()) : "hệ thống" })) };
}

export async function reviewQueueCourses(admin: Viewer) {
  requireAdmin(admin);
  const c = await cols();
  const courses = await c.courses.find({ "review.state": "pending" }).sort({ "review.submittedAt": 1 }).limit(100).toArray();
  const users = await c.users.find({ _id: { $in: courses.map((x) => x.instructorId) } }).project<{ _id: ObjectId; displayName: string }>({ displayName: 1 }).toArray();
  const um = new Map(users.map((u) => [u._id.toHexString(), u.displayName]));
  return courses.map((x) => ({ id: x._id.toHexString(), title: x.draft.title, instructor: um.get(x.instructorId.toHexString()) ?? "", submittedAt: x.review.submittedAt?.toISOString() ?? null, isUpdate: Boolean(x.published), status: x.status }));
}

export async function allCoursesAdmin(admin: Viewer) {
  requireAdmin(admin);
  const c = await cols();
  return c.courses.find({}).project<{ _id: ObjectId; slug: string; status: string; draft: { title: string }; featuredRank: number | null; enrollmentCount: number; review: { state: string } }>({ slug: 1, status: 1, "draft.title": 1, featuredRank: 1, enrollmentCount: 1, "review.state": 1 }).sort({ updatedAt: -1 }).limit(200).toArray();
}

export async function courseEnrollmentsAdmin(admin: Viewer, courseId: ObjectId) {
  requireAdmin(admin);
  const c = await cols();
  const es = await c.enrollments.find({ courseId }).sort({ enrolledAt: -1 }).limit(200).toArray();
  const users = await c.users.find({ _id: { $in: es.map((e) => e.userId) } }).project<{ _id: ObjectId; displayName: string; email: string }>({ displayName: 1, email: 1 }).toArray();
  const um = new Map(users.map((u) => [u._id.toHexString(), u]));
  return es.map((e) => ({ id: e._id.toHexString(), status: e.status, enrolledAt: e.enrolledAt.toISOString(), completedAt: e.completedAt?.toISOString() ?? null, revokedReason: e.revokedReason, user: um.get(e.userId.toHexString()) ?? null }));
}

/** Thống kê cho giảng viên: aggregate theo khóa, không dữ liệu cá nhân không cần thiết. */
export async function instructorStats(viewer: Viewer) {
  const c = await cols();
  const courses = await c.courses.find(viewer.roles.includes("admin") && !viewer.roles.includes("instructor") ? {} : { instructorId: viewer.id }).project<{ _id: ObjectId; slug: string; status: string; draft: { title: string }; review: { state: string; rejectReason: string | null }; enrollmentCount: number; ratingAvg: number; ratingCount: number }>({ slug: 1, status: 1, "draft.title": 1, review: 1, enrollmentCount: 1, ratingAvg: 1, ratingCount: 1 }).toArray();
  const ids = courses.map((x) => x._id);
  const [completions, recent, openQuestions, pendingSubs] = await Promise.all([
    c.enrollments.aggregate<{ _id: ObjectId; n: number }>([{ $match: { courseId: { $in: ids }, completedAt: { $ne: null } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]).toArray(),
    c.enrollments.aggregate<{ _id: ObjectId; n: number }>([{ $match: { courseId: { $in: ids }, lastAccessedAt: { $gte: new Date(Date.now() - 7 * 86400_000) } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]).toArray(),
    c.questions.countDocuments({ courseId: { $in: ids }, status: "visible", hasInstructorAnswer: false }),
    c.projectSubmissions.countDocuments({ courseId: { $in: ids }, status: { $in: ["submitted", "resubmitted"] } }),
  ]);
  const cm = new Map(completions.map((x) => [x._id.toHexString(), x.n]));
  const rm = new Map(recent.map((x) => [x._id.toHexString(), x.n]));
  return {
    openQuestions,
    pendingSubs,
    courses: courses.map((x) => ({ id: x._id.toHexString(), slug: x.slug, title: x.draft.title, status: x.status, review: x.review, enrollments: x.enrollmentCount, completions: cm.get(x._id.toHexString()) ?? 0, active7d: rm.get(x._id.toHexString()) ?? 0, ratingAvg: x.ratingAvg, ratingCount: x.ratingCount })),
  };
}
