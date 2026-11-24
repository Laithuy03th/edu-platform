import "server-only";
import type { ObjectId } from "mongodb";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { isValidTimeZone } from "@/lib/time";
import { cols } from "@/server/db/models";

export type ProfileInput = {
  displayName: string;
  bio: string;
  timezone: string;
  learningGoal: string;
  dataSaver: boolean;
  weeklyGoalLessons: number | null;
};

/**
 * Cập nhật hồ sơ: CHỈ các field trong allowlist (A8).
 * roles/status/emailVerifiedAt/authVersion/email không bao giờ được đọc từ input.
 */
export async function updateProfile(userId: ObjectId, input: ProfileInput) {
  if (!isValidTimeZone(input.timezone)) {
    throw new AppError("VALIDATION_FAILED", "Múi giờ không hợp lệ.", { fieldErrors: { timezone: ["Múi giờ không hợp lệ."] } });
  }
  const c = await cols();
  await c.users.updateOne(
    { _id: userId },
    {
      $set: {
        displayName: input.displayName,
        bio: input.bio,
        timezone: input.timezone,
        learningGoal: input.learningGoal,
        dataSaver: input.dataSaver,
        weeklyGoalLessons: input.weeklyGoalLessons,
        updatedAt: new Date(),
      },
    },
  );
}

export async function updatePublicProfile(userId: ObjectId, enabled: boolean, handle: string | null) {
  const c = await cols();
  const h = handle ? handle.toLowerCase() : null;
  if (enabled && !h) throw new AppError("VALIDATION_FAILED", "Cần chọn đường dẫn hồ sơ.", { fieldErrors: { handle: ["Cần chọn đường dẫn hồ sơ."] } });
  try {
    await c.users.updateOne({ _id: userId }, { $set: { publicProfile: { enabled, handle: h }, updatedAt: new Date() } });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError("ALREADY_EXISTS", "Đường dẫn này đã có người dùng.", { fieldErrors: { handle: ["Đường dẫn này đã có người dùng."] } });
    }
    throw err;
  }
}

export async function getProfile(userId: ObjectId) {
  const c = await cols();
  const u = await c.users.findOne(
    { _id: userId },
    { projection: { email: 1, displayName: 1, bio: 1, timezone: 1, learningGoal: 1, dataSaver: 1, weeklyGoalLessons: 1, publicProfile: 1, emailVerifiedAt: 1, passwordHash: 1, roles: 1, createdAt: 1 } },
  );
  if (!u) throw new AppError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  return {
    email: u.email,
    displayName: u.displayName,
    bio: u.bio,
    timezone: u.timezone,
    learningGoal: u.learningGoal,
    dataSaver: u.dataSaver,
    weeklyGoalLessons: u.weeklyGoalLessons ?? null,
    publicProfile: u.publicProfile,
    emailVerified: Boolean(u.emailVerifiedAt),
    hasPassword: Boolean(u.passwordHash),
    roles: u.roles,
  };
}

/* ---- Đơn xin làm giảng viên ---- */

export async function applyInstructor(userId: ObjectId, motivation: string, sampleUrl: string | null) {
  const c = await cols();
  const u = await c.users.findOne({ _id: userId }, { projection: { roles: 1 } });
  if (u?.roles.includes("instructor")) throw new AppError("INVALID_STATE", "Bạn đã là giảng viên.");
  const now = new Date();
  try {
    await c.instructorApplications.insertOne({
      userId,
      status: "pending",
      motivation,
      sampleUrl,
      reviewedBy: null,
      reviewedAt: null,
      decisionReason: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError("ALREADY_EXISTS", "Bạn đã có một đơn đang chờ duyệt.");
    throw err;
  }
}

export async function myInstructorApplication(userId: ObjectId) {
  const c = await cols();
  return c.instructorApplications.find({ userId }).sort({ createdAt: -1 }).limit(1).next();
}
