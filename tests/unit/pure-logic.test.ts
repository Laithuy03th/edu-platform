import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { nextSchedule, endOfTodayLocal } from "@/modules/review/schedule";
import { gradeQuiz, placementRecommendations, questionFingerprint } from "@/modules/quizzes/grading";
import { findCycle, pathProgress } from "@/modules/learning-paths/graph";
import { rubricTotal } from "@/modules/projects/rubric";
import { verifyWebhookSignature } from "@/server/cloudinary";
import { validateResource } from "@/modules/media/service";
import { normalizeForSearch, slugify } from "@/lib/text";
import { canReadLesson, canEditCourse } from "@/modules/courses/policy";
import { startOfLocalDayPlus } from "@/lib/time";

const TZ = "Asia/Ho_Chi_Minh";

describe("lịch ôn tập (D3)", () => {
  it("đúng liên tiếp: 1 → 3 → 7 → 14 → mastered; sai quay về 1 ngày", () => {
    const now = new Date("2026-11-24T10:00:00Z");
    let s = { intervalStep: 0, correctStreak: 0 };
    const days: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = nextSchedule(s, true, now, TZ);
      days.push(Math.round((r.nextReviewAt.getTime() - startOfLocalDayPlus(now, 0, TZ).getTime()) / 86400_000));
      s = r;
    }
    expect(days).toEqual([3, 7, 14]);
    expect(nextSchedule(s, true, now, TZ).status).toBe("mastered");
    const wrong = nextSchedule(s, false, now, TZ);
    expect(wrong).toMatchObject({ intervalStep: 0, correctStreak: 0, status: "active" });
  });

  it("qua timezone: 23:30 giờ VN vẫn tính là ngày hôm đó", () => {
    const lateNight = new Date("2026-11-24T16:30:00Z"); // 23:30 ngày 24 ở VN
    const end = endOfTodayLocal(lateNight, TZ);
    expect(end.toISOString()).toBe("2026-11-24T17:00:00.000Z"); // 00:00 ngày 25 giờ VN
    const sched = nextSchedule({ intervalStep: 0, correctStreak: 0 }, false, lateNight, TZ);
    expect(sched.nextReviewAt.toISOString()).toBe("2026-11-24T17:00:00.000Z");
  });
});

describe("chấm quiz & đánh giá đầu vào (C12, D4)", () => {
  const qs = [
    { questionId: "q1", version: 1, kind: "single_choice" as const, prompt: "", options: [{ optionId: "a", text: "" }, { optionId: "b", text: "" }], correctOptionId: "b", explanation: "", topicKey: "http" },
    { questionId: "q2", version: 1, kind: "single_choice" as const, prompt: "", options: [{ optionId: "a", text: "" }, { optionId: "b", text: "" }], correctOptionId: "a", explanation: "", topicKey: "http" },
    { questionId: "q3", version: 1, kind: "single_choice" as const, prompt: "", options: [{ optionId: "a", text: "" }, { optionId: "b", text: "" }], correctOptionId: "a", explanation: "", topicKey: "css" },
  ];
  it("lựa chọn không tồn tại không được tính đúng", () => {
    const g = gradeQuiz(qs, [{ questionId: "q1", optionId: "b" }, { questionId: "q2", optionId: "zzz" }], 50);
    expect(g).toMatchObject({ correctCount: 1, total: 3, scorePercent: 33, passed: false });
  });
  it("dưới ngưỡng → học trước; đạt → ôn nhanh; không tự hoàn thành bài", () => {
    const ch1 = new ObjectId(), ch2 = new ObjectId();
    const g = gradeQuiz(qs, [{ questionId: "q1", optionId: "b" }, { questionId: "q3", optionId: "a" }], 0);
    const r = placementRecommendations(g.graded, [{ topicKey: "http", chapterId: ch1, thresholdPercent: 60 }, { topicKey: "css", chapterId: ch2, thresholdPercent: 60 }]);
    expect(r.recommendations.map((x) => [x.topicKey, x.kind, x.percent])).toEqual([["http", "study_first", 50], ["css", "quick_review", 100]]);
  });
  it("fingerprint đổi khi đáp án đúng đổi", () => {
    const base = { prompt: "p", options: [{ optionId: "a", text: "x" }], correctOptionId: "a", explanation: "" };
    expect(questionFingerprint(base)).not.toBe(questionFingerprint({ ...base, correctOptionId: "b" }));
  });
});

describe("lộ trình (D8, D9)", () => {
  it("phát hiện chu trình và phụ thuộc tới mục không tồn tại", () => {
    expect(findCycle([{ itemId: "a", dependsOn: [] }, { itemId: "b", dependsOn: ["a"] }])).toBeNull();
    expect(findCycle([{ itemId: "a", dependsOn: ["c"] }, { itemId: "b", dependsOn: ["a"] }, { itemId: "c", dependsOn: ["b"] }])).not.toBeNull();
    expect(findCycle([{ itemId: "a", dependsOn: ["x"] }])).toEqual(["a", "x"]);
  });
  it("không đếm trùng; mục không khả dụng bị loại", () => {
    const p = pathProgress(
      [
        { required: true, available: true, lessonIds: ["1", "2"] },
        { required: true, available: true, lessonIds: ["2"] },
        { required: true, available: false, lessonIds: ["3"] },
        { required: false, available: true, lessonIds: ["4"] },
      ],
      new Set(["2"]),
    );
    expect(p).toEqual({ completed: 1, total: 2, percent: 50 });
  });
});

describe("rubric (D6)", () => {
  const rubric = [
    { criterionId: "a", title: "A", maxPoints: 10, passDescription: "", failDescription: "", skillTag: "" },
    { criterionId: "b", title: "B", maxPoints: 5, passDescription: "", failDescription: "", skillTag: "" },
  ];
  it("tổng đúng; thiếu tiêu chí / vượt điểm / tiêu chí lạ đều báo lỗi", () => {
    expect(rubricTotal(rubric, [{ criterionId: "a", points: 7 }, { criterionId: "b", points: 5 }])).toEqual({ total: 12, maxPoints: 15, problems: [] });
    expect(rubricTotal(rubric, [{ criterionId: "a", points: 11 }]).problems.length).toBe(2);
    expect(rubricTotal(rubric, [{ criterionId: "a", points: 1 }, { criterionId: "b", points: 1 }, { criterionId: "zz", points: 1 }]).problems.length).toBe(1);
  });
});

describe("webhook Cloudinary (M5)", () => {
  const secret = "s3cr3t";
  const now = 1_800_000_000;
  const body = '{"notification_type":"upload"}';
  const sig = (algo: "sha1" | "sha256", ts: number) => createHash(algo).update(body + ts + secret).digest("hex");
  it("chấp nhận SHA-1/SHA-256 hợp lệ, từ chối sai chữ ký, quá cũ hoặc ở tương lai", () => {
    expect(verifyWebhookSignature(body, String(now), sig("sha1", now), now, secret)).toBe(true);
    expect(verifyWebhookSignature(body, String(now), sig("sha256", now), now, secret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", String(now), sig("sha1", now), now, secret)).toBe(false);
    expect(verifyWebhookSignature(body, String(now - 8000), sig("sha1", now - 8000), now, secret)).toBe(false);
    expect(verifyWebhookSignature(body, String(now + 1000), sig("sha1", now + 1000), now, secret)).toBe(false);
    expect(verifyWebhookSignature(body, null, null, now, secret)).toBe(false);
  });
});

describe("xác minh metadata media (M3)", () => {
  const res = { publicId: "lms/test/c/1/2", resourceType: "video" as const, deliveryType: "authenticated" as const, purpose: "lesson_video" as const, createdAt: new Date("2026-11-24T00:00:00Z") };
  const limits = { videoMaxBytes: 20 * 1048576, imageMaxBytes: 1048576, videoMaxSeconds: 300 };
  const ok = { asset_id: "x", public_id: "lms/test/c/1/2", resource_type: "video", type: "authenticated", format: "mp4", bytes: 1048576, duration: 60, width: 1280, height: 720, version: 1, created_at: "2026-11-24T00:01:00Z" };
  it("hợp lệ → null; sai từng điều kiện → lý do cụ thể", () => {
    expect(validateResource(ok, res, limits)).toBeNull();
    expect(validateResource({ ...ok, public_id: "other" }, res, limits)).toMatch(/định danh/);
    expect(validateResource({ ...ok, bytes: 21 * 1048576 }, res, limits)).toMatch(/vượt giới hạn/);
    expect(validateResource({ ...ok, duration: 301 }, res, limits)).toMatch(/vượt giới hạn/);
    expect(validateResource({ ...ok, format: "mkv" }, res, limits)).toMatch(/không được hỗ trợ/);
    expect(validateResource({ ...ok, type: "upload" }, res, limits)).toMatch(/Kiểu lưu trữ/);
    expect(validateResource({ ...ok, created_at: "2026-11-20T00:00:00Z" }, res, limits)).toMatch(/trước/);
  });
});

describe("policy (A9, C5)", () => {
  const owner = new ObjectId();
  const course = { instructorId: owner, status: "published" as const, hasPublished: true };
  it("chỉ chủ khóa (giảng viên) hoặc admin sửa được", () => {
    expect(canEditCourse({ id: owner, roles: ["student", "instructor"], emailVerified: true }, course)).toBe(true);
    expect(canEditCourse({ id: owner, roles: ["student"], emailVerified: true }, course)).toBe(false);
    expect(canEditCourse({ id: new ObjectId(), roles: ["student", "instructor"], emailVerified: true }, course)).toBe(false);
    expect(canEditCourse({ id: new ObjectId(), roles: ["admin"], emailVerified: true }, course)).toBe(true);
  });
  it("khóa lưu trữ: học viên cũ vẫn học; đình chỉ: không ai trừ admin/chủ khóa", () => {
    const v = { id: new ObjectId(), roles: ["student" as const], emailVerified: true };
    expect(canReadLesson(v, { ...course, status: "archived" }, { isPreview: false }, { status: "active" }).ok).toBe(true);
    expect(canReadLesson(v, { ...course, status: "suspended" }, { isPreview: false }, { status: "active" }).ok).toBe(false);
    expect(canReadLesson(v, course, { isPreview: false }, { status: "revoked" })).toEqual({ ok: false, reason: "revoked" });
  });
});

describe("văn bản tiếng Việt", () => {
  it("bỏ dấu & slug", () => {
    expect(normalizeForSearch("  Lập Trình   ĐƯỜNG đi ")).toBe("lap trinh duong di");
    expect(slugify("Next.js cơ bản cho người mới!")).toBe("next-js-co-ban-cho-nguoi-moi");
  });
});
