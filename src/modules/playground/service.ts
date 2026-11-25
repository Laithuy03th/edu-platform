import "server-only";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError, notFound } from "@/lib/errors";
import { cols, type SnippetKind } from "@/server/db/models";
import type { Viewer } from "@/server/auth/viewer-core";

export const MAX_SNIPPETS = 100;
export const MAX_SNIPPET_BYTES = 120_000;
const FILE_KEYS: Record<SnippetKind, string[]> = { web: ["html", "css", "js"], sql: ["sql", "dataset"], python: ["py", "stdin"] };

export const snippetInput = z
  .object({
    kind: z.enum(["web", "sql", "python"]),
    title: z.string().trim().min(1, "Đặt tên cho bản lưu").max(80),
    files: z.record(z.string(), z.string()),
  })
  .superRefine((v, ctx) => {
    const allowed = FILE_KEYS[v.kind];
    const extra = Object.keys(v.files).filter((k) => !allowed.includes(k));
    if (extra.length) ctx.addIssue({ code: "custom", path: ["files"], message: `Tệp không hợp lệ: ${extra.join(", ")}` });
    const bytes = Object.values(v.files).reduce((a, s) => a + Buffer.byteLength(s, "utf8"), 0);
    if (bytes > MAX_SNIPPET_BYTES) ctx.addIssue({ code: "custom", path: ["files"], message: "Bản lưu quá lớn (tối đa ~120 KB)." });
  });
export type SnippetInput = z.infer<typeof snippetInput>;

export type SnippetDto = { id: string; kind: SnippetKind; title: string; files: Record<string, string>; updatedAt: string };

/** Tạo mới (id = null) hoặc cập nhật bản lưu CỦA CHÍNH người xem; người khác → NOT_FOUND (không lộ tồn tại). */
export async function saveSnippet(viewer: Viewer, id: ObjectId | null, raw: SnippetInput): Promise<SnippetDto> {
  const v = snippetInput.parse(raw);
  const c = await cols();
  const now = new Date();
  const files = Object.fromEntries(FILE_KEYS[v.kind].map((k) => [k, v.files[k] ?? ""]));
  if (id) {
    const r = await c.playgroundSnippets.findOneAndUpdate({ _id: id, userId: viewer.id, kind: v.kind }, { $set: { title: v.title, files, updatedAt: now } }, { returnDocument: "after" });
    if (!r) throw notFound("Không tìm thấy bản lưu");
    return toDto(r);
  }
  if ((await c.playgroundSnippets.countDocuments({ userId: viewer.id })) >= MAX_SNIPPETS) {
    throw new AppError("LIMIT_REACHED", `Tối đa ${MAX_SNIPPETS} bản lưu. Xóa bớt bản cũ rồi thử lại.`);
  }
  const doc = { userId: viewer.id, kind: v.kind, title: v.title, files, createdAt: now, updatedAt: now };
  const res = await c.playgroundSnippets.insertOne(doc);
  return toDto({ _id: res.insertedId, ...doc });
}

export async function listSnippets(viewer: Viewer, kind: SnippetKind): Promise<Omit<SnippetDto, "files">[]> {
  const c = await cols();
  const rows = await c.playgroundSnippets.find({ userId: viewer.id, kind }, { projection: { title: 1, kind: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(MAX_SNIPPETS).toArray();
  return rows.map((r) => ({ id: r._id.toHexString(), kind: r.kind, title: r.title, updatedAt: r.updatedAt.toISOString() }));
}

export async function getSnippet(viewer: Viewer, id: ObjectId): Promise<SnippetDto> {
  const c = await cols();
  const r = await c.playgroundSnippets.findOne({ _id: id, userId: viewer.id });
  if (!r) throw notFound("Không tìm thấy bản lưu");
  return toDto(r);
}

export async function deleteSnippet(viewer: Viewer, id: ObjectId) {
  const c = await cols();
  const r = await c.playgroundSnippets.deleteOne({ _id: id, userId: viewer.id });
  if (r.deletedCount === 0) throw notFound("Không tìm thấy bản lưu");
}

function toDto(r: { _id: ObjectId; kind: SnippetKind; title: string; files: Record<string, string>; updatedAt: Date }): SnippetDto {
  return { id: r._id.toHexString(), kind: r.kind, title: r.title, files: r.files, updatedAt: r.updatedAt.toISOString() };
}
