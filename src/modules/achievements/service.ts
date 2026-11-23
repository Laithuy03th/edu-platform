import "server-only";
import { unstable_cache } from "next/cache";
import type { ObjectId } from "mongodb";
import { AppError } from "@/lib/errors";
import { cols } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";

/** Hồ sơ thành quả riêng tư (chỉ chủ tài khoản). Kỹ năng = "đã thực hành", không phải chứng nhận. */
export async function myAchievements(viewer: Viewer) {
  const c = await cols();
  const enrollments = await c.enrollments.find({ userId: viewer.id, completedAt: { $ne: null } }).sort({ completedAt: -1 }).toArray();
  const courses = await c.courses.find({ _id: { $in: enrollments.map((e) => e.courseId) } }).project<{ _id: ObjectId; slug: string; published: { title: string } | null }>({ slug: 1, "published.title": 1 }).toArray();
  const cm = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const subs = await c.projectSubmissions.find({ userId: viewer.id, status: "reviewed" }).sort({ updatedAt: -1 }).toArray();
  const assignments = await c.projectAssignments.find({ _id: { $in: subs.map((s) => s.assignmentId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const am = new Map(assignments.map((a) => [a._id.toHexString(), a.published?.title ?? "Dự án"]));
  const skills = new Map<string, number>();
  for (const s of subs) for (const sk of s.skills) skills.set(sk, (skills.get(sk) ?? 0) + 1);
  return {
    courses: enrollments.map((e) => ({
      enrollmentId: e._id.toHexString(),
      title: cm.get(e.courseId.toHexString())?.published?.title ?? "Khóa học",
      slug: cm.get(e.courseId.toHexString())?.slug ?? "",
      completedAt: e.completedAt!.toISOString(),
      showOnProfile: Boolean(e.showOnProfile),
    })),
    projects: subs.map((s) => {
      const last = s.rounds.at(-1);
      return { id: s._id.toHexString(), title: am.get(s.assignmentId.toHexString()) ?? "Dự án", skills: s.skills, score: last?.feedback ? `${last.feedback.totalPoints}/${last.feedback.maxPoints}` : null, showOnProfile: s.showOnProfile, repoUrl: last?.repoUrl ?? "", demoUrl: last?.demoUrl ?? "" };
    }),
    skills: [...skills.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

export async function setCourseOnProfile(viewer: Viewer, enrollmentId: ObjectId, show: boolean) {
  const c = await cols();
  const r = await c.enrollments.updateOne({ _id: enrollmentId, userId: viewer.id, completedAt: { $ne: null } }, { $set: { showOnProfile: show } });
  if (r.matchedCount === 0) throw new AppError("NOT_FOUND", "Không tìm thấy khóa đã hoàn thành.");
}

export type PublicProfileDto = {
  displayName: string;
  bio: string;
  courses: { title: string; slug: string; completedAt: string }[];
  projects: { title: string; skills: string[]; repoUrl: string; demoUrl: string }[];
  skills: string[];
};

/**
 * Hồ sơ công khai (D7): CHỈ mục người dùng chọn. Không email, không điểm chi tiết, không ghi chú,
 * không enrollment chưa chọn, không bài nộp chưa chọn.
 */
async function loadPublicProfile(handle: string): Promise<PublicProfileDto | null> {
  const c = await cols();
  const user = await c.users.findOne({ "publicProfile.handle": handle, "publicProfile.enabled": true, status: "active" }, { projection: { displayName: 1, bio: 1 } });
  if (!user) return null;
  const enrollments = await c.enrollments.find({ userId: user._id, completedAt: { $ne: null }, showOnProfile: true }).toArray();
  const courses = await c.courses.find({ _id: { $in: enrollments.map((e) => e.courseId) }, status: { $in: ["published", "archived"] } }).project<{ _id: ObjectId; slug: string; published: { title: string } | null }>({ slug: 1, "published.title": 1 }).toArray();
  const cm = new Map(courses.map((x) => [x._id.toHexString(), x]));
  const subs = await c.projectSubmissions.find({ userId: user._id, status: "reviewed", showOnProfile: true }).toArray();
  const assignments = await c.projectAssignments.find({ _id: { $in: subs.map((s) => s.assignmentId) } }).project<{ _id: ObjectId; published: { title: string } | null }>({ "published.title": 1 }).toArray();
  const am = new Map(assignments.map((a) => [a._id.toHexString(), a.published?.title ?? "Dự án"]));
  return {
    displayName: user.displayName,
    bio: user.bio,
    courses: enrollments
      .filter((e) => cm.has(e.courseId.toHexString()))
      .map((e) => ({ title: cm.get(e.courseId.toHexString())!.published?.title ?? "", slug: cm.get(e.courseId.toHexString())!.slug, completedAt: e.completedAt!.toISOString() })),
    projects: subs.map((s) => ({ title: am.get(s.assignmentId.toHexString()) ?? "Dự án", skills: s.skills, repoUrl: s.rounds.at(-1)?.repoUrl ?? "", demoUrl: s.rounds.at(-1)?.demoUrl ?? "" })),
    skills: [...new Set(subs.flatMap((s) => s.skills))],
  };
}

export async function getPublicProfile(handle: string) {
  if (!/^[a-z0-9-]{3,30}$/.test(handle)) return null;
  // Cache theo handle; xóa bằng tag khi chủ hồ sơ đổi tùy chọn (revalidate tối đa 10 phút để phản ánh mục mới).
  return unstable_cache(() => loadPublicProfile(handle), ["public-profile-v1", handle], { revalidate: 600, tags: [`profile-handle:${handle}`] })();
}

export const __uncached = { loadPublicProfile };
