import "server-only";
import { randomUUID } from "node:crypto";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError, notFound } from "@/lib/errors";
import { cols, type CodeExerciseDoc, type Doc } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";
import { requireLessonAccess, requireLessonAccessMemo } from "@/modules/learning/access";
import { loadEditableCourse } from "@/modules/courses/authoring";

export const MAX_PER_LESSON = 6;

/**
 * DTO gửi cho người học: KHÔNG có answer/explanation/fixedCode cho tới khi giải đúng hoặc chủ động xem lời giải;
 * gợi ý chỉ gồm các mức người học đã mở.
 */
export type ExerciseDto = {
  id: string;
  kind: CodeExerciseDoc["kind"];
  language: string;
  prompt: string;
  code: string;
  options: { optionId: string; text: string }[];
  hintCount: number;
  hints: string[];
  attempts: number;
  solved: boolean;
  revealed: boolean;
  solution: { explanation: string; fixedCode: string; optionId: string | null; lines: number[] } | null;
};

function toDto(e: Doc<CodeExerciseDoc>, a: { attempts: number; hintsUsed: number; solved: boolean; revealed: boolean; version: number } | null): ExerciseDto {
  const same = a && a.version === e.version;
  const st = same ? a : { attempts: 0, hintsUsed: 0, solved: false, revealed: false };
  const open = st.solved || st.revealed;
  return {
    id: e._id.toHexString(),
    kind: e.kind,
    language: e.language,
    prompt: e.prompt,
    code: e.code,
    options: e.options,
    hintCount: e.hints.length,
    hints: e.hints.slice(0, st.hintsUsed),
    attempts: st.attempts,
    solved: st.solved,
    revealed: st.revealed,
    solution: open ? { explanation: e.explanation, fixedCode: e.fixedCode, optionId: e.answer.optionId, lines: e.answer.lines } : null,
  };
}

/** Bài tập của một bài học — kiểm tra quyền đọc bài trước (enrollment hoặc học thử). */
export async function lessonExercises(viewer: Viewer | null, lessonId: ObjectId): Promise<ExerciseDto[]> {
  await requireLessonAccessMemo(viewer, lessonId);
  const c = await cols();
  const list = await c.codeExercises.find({ lessonId, status: "published" }).sort({ order: 1 }).limit(MAX_PER_LESSON).toArray();
  if (!list.length) return [];
  const attempts = viewer ? await c.exerciseAttempts.find({ userId: viewer.id, exerciseId: { $in: list.map((x) => x._id) } }).toArray() : [];
  const byId = new Map(attempts.map((a) => [a.exerciseId.toHexString(), a]));
  return list.map((e) => toDto(e, byId.get(e._id.toHexString()) ?? null));
}

async function loadForLearner(viewer: Viewer, exerciseId: ObjectId) {
  const c = await cols();
  const e = await c.codeExercises.findOne({ _id: exerciseId, status: "published" });
  if (!e) throw notFound("Không tìm thấy bài tập");
  await requireLessonAccess(viewer, e.lessonId);
  return e;
}

/** Lấy/khởi tạo trạng thái làm bài; đổi version bài tập → bắt đầu lại (đáp án cũ có thể không còn đúng). */
async function state(viewer: Viewer, e: Doc<CodeExerciseDoc>) {
  const c = await cols();
  const now = new Date();
  await c.exerciseAttempts.updateOne(
    { userId: viewer.id, exerciseId: e._id },
    { $setOnInsert: { userId: viewer.id, exerciseId: e._id, courseId: e.courseId, version: e.version, attempts: 0, hintsUsed: 0, solved: false, revealed: false, updatedAt: now } },
    { upsert: true },
  ).catch((err) => {
    if (err?.code !== 11000) throw err;
  });
  await c.exerciseAttempts.updateOne({ userId: viewer.id, exerciseId: e._id, version: { $ne: e.version } }, { $set: { version: e.version, attempts: 0, hintsUsed: 0, solved: false, revealed: false, updatedAt: now } });
  return (await c.exerciseAttempts.findOne({ userId: viewer.id, exerciseId: e._id }))!;
}

/** Mở gợi ý kế tiếp (tăng nguyên tử, không vượt số gợi ý). */
export async function requestHint(viewer: Viewer, exerciseId: ObjectId): Promise<ExerciseDto> {
  const e = await loadForLearner(viewer, exerciseId);
  await state(viewer, e);
  const c = await cols();
  await c.exerciseAttempts.updateOne({ userId: viewer.id, exerciseId, hintsUsed: { $lt: e.hints.length } }, { $inc: { hintsUsed: 1 }, $set: { updatedAt: new Date() } });
  return toDto(e, await c.exerciseAttempts.findOne({ userId: viewer.id, exerciseId }));
}

export const answerInput = z.object({ optionId: z.string().max(40).nullable().default(null), lines: z.array(z.number().int().min(1).max(500)).max(20).default([]) });

/** Chấm ở server. find_bug: tập dòng chọn phải TRÙNG tập dòng lỗi (không thừa, không thiếu). */
export async function submitAnswer(viewer: Viewer, exerciseId: ObjectId, raw: z.infer<typeof answerInput>): Promise<ExerciseDto & { correct: boolean }> {
  const answer = answerInput.parse(raw);
  const e = await loadForLearner(viewer, exerciseId);
  const st = await state(viewer, e);
  const c = await cols();
  let correct: boolean;
  if (e.kind === "predict_output") {
    if (!answer.optionId || !e.options.some((o) => o.optionId === answer.optionId)) throw new AppError("VALIDATION_FAILED", "Chọn một đáp án.");
    correct = answer.optionId === e.answer.optionId;
  } else {
    const picked = [...new Set(answer.lines)].sort((a, b) => a - b);
    if (!picked.length) throw new AppError("VALIDATION_FAILED", "Bấm vào dòng bạn cho là có lỗi.");
    const lineCount = e.code.split("\n").length;
    if (picked.some((l) => l > lineCount)) throw new AppError("VALIDATION_FAILED", "Dòng không hợp lệ.");
    const want = [...e.answer.lines].sort((a, b) => a - b);
    correct = picked.length === want.length && picked.every((l, i) => l === want[i]);
  }
  await c.exerciseAttempts.updateOne(
    { _id: st._id, version: e.version },
    { $inc: { attempts: 1 }, $set: { updatedAt: new Date(), ...(correct ? { solved: true } : {}) } },
  );
  return { ...toDto(e, await c.exerciseAttempts.findOne({ _id: st._id })), correct };
}

/** Người học chủ động xem lời giải (ghi nhận revealed — tách khỏi "tự giải được"). */
export async function revealSolution(viewer: Viewer, exerciseId: ObjectId): Promise<ExerciseDto> {
  const e = await loadForLearner(viewer, exerciseId);
  const st = await state(viewer, e);
  const c = await cols();
  await c.exerciseAttempts.updateOne({ _id: st._id }, { $set: { revealed: true, updatedAt: new Date() } });
  return toDto(e, await c.exerciseAttempts.findOne({ _id: st._id }));
}

/* ---------------- Soạn bài tập (giảng viên của khóa) ---------------- */

export const exerciseInput = z
  .object({
    kind: z.enum(["predict_output", "find_bug"]),
    language: z.string().trim().regex(/^[a-z0-9+#-]{1,20}$/),
    prompt: z.string().trim().min(10).max(1000),
    code: z.string().min(1).max(4000),
    options: z.array(z.string().trim().min(1).max(300)).max(6).default([]),
    correctOption: z.number().int().min(0).max(5).nullable().default(null),
    bugLines: z.array(z.number().int().min(1).max(500)).max(20).default([]),
    hints: z.array(z.string().trim().min(3).max(500)).max(4).default([]),
    explanation: z.string().trim().min(10).max(3000),
    fixedCode: z.string().max(4000).default(""),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "predict_output") {
      if (v.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Cần ít nhất 2 lựa chọn" });
      if (v.correctOption === null || v.correctOption >= v.options.length) ctx.addIssue({ code: "custom", path: ["correctOption"], message: "Chọn đáp án đúng" });
    } else {
      const n = v.code.split("\n").length;
      if (!v.bugLines.length || v.bugLines.some((l) => l > n)) ctx.addIssue({ code: "custom", path: ["bugLines"], message: `Chọn dòng lỗi trong khoảng 1–${n}` });
    }
  });
export type ExerciseInput = z.infer<typeof exerciseInput>;

/** Tạo/sửa bài tập: chỉ chủ khóa/admin; sửa nội dung → version +1 (trạng thái làm bài cũ bắt đầu lại). */
export async function upsertExercise(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId, id: ObjectId | null, raw: ExerciseInput) {
  const v = exerciseInput.parse(raw);
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  if (!(await c.lessons.findOne({ _id: lessonId, courseId }, { projection: { _id: 1 } }))) throw notFound("Không tìm thấy bài học");
  const existing = id ? await c.codeExercises.findOne({ _id: id, courseId, lessonId }) : null;
  if (id && !existing) throw notFound("Không tìm thấy bài tập");
  const options = v.kind === "predict_output" ? v.options.map((text, i) => ({ optionId: existing?.options[i]?.optionId ?? randomUUID().slice(0, 8), text })) : [];
  const doc = {
    kind: v.kind,
    language: v.language,
    prompt: v.prompt,
    code: v.code,
    options,
    answer: { optionId: v.kind === "predict_output" ? options[v.correctOption!]!.optionId : null, lines: v.kind === "find_bug" ? [...new Set(v.bugLines)].sort((a, b) => a - b) : [] },
    hints: v.hints,
    explanation: v.explanation,
    fixedCode: v.fixedCode,
    status: v.status,
    updatedAt: new Date(),
  };
  if (existing) {
    await c.codeExercises.updateOne({ _id: existing._id }, { $set: doc, $inc: { version: 1 } });
    return existing._id;
  }
  if ((await c.codeExercises.countDocuments({ lessonId })) >= MAX_PER_LESSON) throw new AppError("LIMIT_REACHED", `Tối đa ${MAX_PER_LESSON} bài tập mỗi bài học.`);
  const last = await c.codeExercises.find({ lessonId }).sort({ order: -1 }).limit(1).next();
  const r = await c.codeExercises.insertOne({ courseId, lessonId, order: (last?.order ?? 0) + 1, version: 1, createdAt: new Date(), ...doc });
  return r.insertedId;
}

export async function deleteExercise(viewer: Viewer, courseId: ObjectId, id: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  await c.codeExercises.deleteOne({ _id: id, courseId });
}

/** Cho trình soạn: đầy đủ (gồm đáp án) — chỉ chủ khóa/admin. */
export async function exercisesForEditor(viewer: Viewer, courseId: ObjectId, lessonId: ObjectId) {
  await loadEditableCourse(viewer, courseId);
  const c = await cols();
  return c.codeExercises.find({ courseId, lessonId }).sort({ order: 1 }).toArray();
}
