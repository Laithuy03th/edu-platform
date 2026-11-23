import { ObjectId } from "mongodb";
import { AppError } from "./errors";

/** Parse ObjectId an toàn từ input client; sai định dạng → null (không ném lỗi Mongo). */
export function parseId(value: unknown): ObjectId | null {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) return null;
  return new ObjectId(value);
}

/** Như parseId nhưng ném NOT_FOUND để không lộ thông tin về định dạng. */
export function requireId(value: unknown, what = "Không tìm thấy nội dung"): ObjectId {
  const id = parseId(value);
  if (!id) throw new AppError("NOT_FOUND", what);
  return id;
}

export const idStr = (id: ObjectId) => id.toHexString();
