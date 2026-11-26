import { describe, expect, it } from "vitest";
import type { ObjectId } from "mongodb";
import { cols } from "@/server/db/models";
import { __uncached, getCourseAnalytics, MIN_GROUP } from "@/modules/courses/analytics";
import { makeUser, publishedCourse } from "./helpers";

async function enroll(userId: ObjectId, courseId: ObjectId, completed = false) {
  const c = await cols();
  const now = new Date();
  await c.enrollments.insertOne({ userId, courseId, source: "free", status: "active", revokedAt: null, revokedBy: null, revokedReason: null, lastLessonId: null, lastAccessedAt: now, completedAt: completed ? now : null, completedVersion: completed ? 1 : null, enrolledAt: now });
}
async function complete(userId: ObjectId, courseId: ObjectId, lessonId: ObjectId) {
  const c = await cols();
  const now = new Date();
  await c.lessonProgress.insertOne({ userId, courseId, lessonId, lastPositionSeconds: 0, lastPositionClientAt: now, furthestPositionSeconds: 0, completedAt: now, completionSource: "manual", understanding: null, understandingUpdatedAt: null, lastSavedAt: now });
}

/** Phân tích khóa (giảng viên): chỉ số tổng hợp đúng, ẩn điểm khi nhóm < MIN_GROUP, chỉ chủ khóa/admin xem. */
describe("phân tích khóa học", () => {
  it("phễu, tỉ lệ từng bài, quiz và đánh giá là số tổng hợp đúng", async () => {
    const p = await publishedCourse({ lessons: 3, withQuiz: true });
    const users = await Promise.all([1, 2, 3, 4].map(() => makeUser(["student"])));
    for (const [i, u] of users.entries()) await enroll(u.id, p.courseId, i === 0);
    // u0, u1, u2 xong bài 1; u0, u1 xong bài 2; u0 xong bài 3; u3 chưa học gì
    for (const u of users.slice(0, 3)) await complete(u.id, p.courseId, p.lessonIds[0]!);
    for (const u of users.slice(0, 2)) await complete(u.id, p.courseId, p.lessonIds[1]!);
    await complete(users[0]!.id, p.courseId, p.lessonIds[2]!);
    const c = await cols();
    const now = new Date();
    // quiz: 2 người làm → chưa đủ MIN_GROUP để hiện điểm
    for (const [i, u] of users.slice(0, 2).entries()) {
      await c.quizResults.insertOne({ userId: u.id, quizId: p.quizId!, courseId: p.courseId, bestScorePercent: i ? 50 : 100, latestScorePercent: 50, attemptCount: 2, firstPassedAt: i ? null : now, lastAttemptAt: now });
    }
    await c.courseReviews.insertOne({ userId: users[0]!.id, courseId: p.courseId, rating: 5, comment: "", status: "visible", hiddenReason: null, hiddenBy: null, createdAt: now, updatedAt: now });

    const a = await __uncached.analytics(p.courseId.toHexString());
    expect(a).toMatchObject({ enrolled: 4, started: 3, completed: 1, requiredLessons: 3 });
    // qua nửa chặng = xong >= 2/3 bài bắt buộc → u0, u1
    expect(a.halfway).toBe(2);
    expect(a.lessons.map((l) => l.completed)).toEqual([3, 2, 1]);
    const quiz = a.quizzes.find((q) => q.id === p.quizId!.toHexString())!;
    expect(quiz).toMatchObject({ learners: 2, attempts: 4, avgBest: null, passRate: null });
    expect(a.ratings.find((r) => r.star === 5)!.count).toBe(1);
    // Không có khóa nào chứa id/email người học trong kết quả
    const json = JSON.stringify(a);
    for (const u of users) {
      expect(json).not.toContain(u.idStr);
      expect(json).not.toContain(u.email);
    }

    // Thêm người làm quiz → đủ nhóm thì hiện điểm trung bình và tỉ lệ đạt
    await c.quizResults.insertOne({ userId: users[2]!.id, quizId: p.quizId!, courseId: p.courseId, bestScorePercent: 75, latestScorePercent: 75, attemptCount: 1, firstPassedAt: now, lastAttemptAt: now });
    const b = await __uncached.analytics(p.courseId.toHexString());
    expect(b.quizzes.find((q) => q.id === p.quizId!.toHexString())).toMatchObject({ learners: MIN_GROUP, avgBest: 75, passRate: 67 });
  });

  it("chỉ giảng viên chủ khóa hoặc admin xem được", async () => {
    const p = await publishedCourse({ lessons: 1 });
    const other = await makeUser(["instructor"]);
    const student = await makeUser(["student"]);
    await expect(getCourseAnalytics(other, p.courseId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getCourseAnalytics(student, p.courseId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const admin = await makeUser(["admin"]);
    // getCourseAnalytics dùng unstable_cache (chỉ chạy trong Next) — kiểm tra quyền là bước trước cache
    await expect(getCourseAnalytics(admin, p.courseId)).rejects.not.toMatchObject({ code: "NOT_FOUND" });
  });
});
