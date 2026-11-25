import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { cols } from "@/server/db/models";

export type RateRule = { name: string; limit: number; windowSec: number };

/** Bộ quy tắc mặc định (AUTH_SECURITY.md §8). */
export const RULES = {
  loginIp: { name: "login:ip", limit: 20, windowSec: 900 },
  loginEmail: { name: "login:email", limit: 5, windowSec: 900 },
  registerIp: { name: "register:ip", limit: 5, windowSec: 3600 },
  registerEmail: { name: "register:email", limit: 3, windowSec: 3600 },
  resendVerify: { name: "resend:user", limit: 5, windowSec: 3600 },
  verifyIp: { name: "verify:ip", limit: 20, windowSec: 3600 },
  forgotIp: { name: "forgot:ip", limit: 5, windowSec: 3600 },
  forgotEmail: { name: "forgot:email", limit: 3, windowSec: 3600 },
  resetIp: { name: "reset:ip", limit: 10, windowSec: 3600 },
  passwordUser: { name: "password:user", limit: 5, windowSec: 900 },
  setPasswordUser: { name: "setpw:user", limit: 3, windowSec: 3600 },
  profileUser: { name: "profile:user", limit: 30, windowSec: 3600 },
  enrollUser: { name: "enroll:user", limit: 30, windowSec: 3600 },
  authoringUser: { name: "authoring:user", limit: 300, windowSec: 3600 },
  submitReviewUser: { name: "submit-review:user", limit: 10, windowSec: 86400 },
  createCourseUser: { name: "create-course:user", limit: 10, windowSec: 86400 },
  applyInstructor: { name: "apply-instructor:user", limit: 3, windowSec: 86400 },
  uploadUser: { name: "upload:user", limit: 20, windowSec: 3600 },
  finalizeUser: { name: "finalize:user", limit: 60, windowSec: 3600 },
  playbackUser: { name: "playback:user", limit: 120, windowSec: 3600 },
  progressUser: { name: "progress:user", limit: 240, windowSec: 3600 },
  completeUser: { name: "complete:user", limit: 120, windowSec: 3600 },
  quizUser: { name: "quiz:user", limit: 30, windowSec: 3600 },
  reviewAnswerUser: { name: "review-answer:user", limit: 300, windowSec: 3600 },
  notesUser: { name: "notes:user", limit: 60, windowSec: 3600 },
  contentIssueUser: { name: "content-issue:user", limit: 10, windowSec: 86400 },
  exerciseUser: { name: "exercise:user", limit: 200, windowSec: 3600 },
  snippetUser: { name: "snippet:user", limit: 120, windowSec: 3600 },
  bookmarkUser: { name: "bookmark:user", limit: 120, windowSec: 3600 },
  qaUser: { name: "qa:user", limit: 10, windowSec: 3600 },
  courseReviewUser: { name: "course-review:user", limit: 10, windowSec: 86400 },
  reportUser: { name: "report:user", limit: 20, windowSec: 86400 },
  projectSubmitUser: { name: "project-submit:user", limit: 10, windowSec: 86400 },
  projectDraftUser: { name: "project-draft:user", limit: 60, windowSec: 3600 },
  pathUser: { name: "path:user", limit: 30, windowSec: 3600 },
  adminUser: { name: "admin:user", limit: 300, windowSec: 3600 },
  usageRefresh: { name: "usage-refresh:global", limit: 1, windowSec: 900 },
  exportNotes: { name: "export-notes:user", limit: 10, windowSec: 3600 },
  health: { name: "health:ip", limit: 60, windowSec: 60 },
} satisfies Record<string, RateRule>;

function secret(): string {
  const e = env();
  const s = e.RATE_LIMIT_SECRET ?? e.AUTH_SECRET;
  if (s) return s;
  if (e.isProduction) throw new AppError("NOT_CONFIGURED", "Thiếu RATE_LIMIT_SECRET.");
  return "dev-only-rate-limit-secret";
}

/** Khóa bucket là HMAC — không lưu IP/email thô (ADR-012). */
export function bucketKey(rule: RateRule, subject: string): string {
  return createHmac("sha256", secret()).update(`${rule.name}:${subject}`).digest("base64url");
}

/**
 * Fixed-window counter trong MongoDB (dùng chung giữa nhiều instance).
 * Vượt giới hạn → AppError RATE_LIMITED kèm retryAfterSeconds. Không khóa vĩnh viễn.
 */
export async function consumeRate(rule: RateRule, subject: string, now = new Date()): Promise<void> {
  const c = await cols();
  const windowMs = rule.windowSec * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const key = bucketKey(rule, subject);
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt: new Date(windowStart.getTime() + windowMs + 60_000) },
  };
  let doc;
  try {
    doc = await c.rateLimitBuckets.findOneAndUpdate({ key, windowStart }, update, {
      upsert: true,
      returnDocument: "after",
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    doc = await c.rateLimitBuckets.findOneAndUpdate({ key, windowStart }, update, { returnDocument: "after" });
  }
  if (doc && doc.count > rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000));
    throw new AppError("RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.", { retryAfterSeconds });
  }
}
