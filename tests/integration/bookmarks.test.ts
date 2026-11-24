import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { cols } from "@/server/db/models";
import * as authoring from "@/modules/courses/authoring";
import { isBookmarked, listBookmarks, setBookmark } from "@/modules/bookmarks/service";
import { makeUser, publishedCourse } from "./helpers";

/** L10: bookmark khóa/bài — unique theo user+target, idempotent, chỉ nội dung công khai, riêng tư theo user. */
describe("bookmark (L10)", () => {
  it("lưu hai lần (song song) chỉ tạo 1 bản ghi; bỏ lưu idempotent; người khác không thấy", async () => {
    const p = await publishedCourse();
    const u = await makeUser(["student"]);
    const other = await makeUser(["student"]);
    await Promise.all([setBookmark(u, "course", p.courseId, true), setBookmark(u, "course", p.courseId, true)]);
    const c = await cols();
    expect(await c.bookmarks.countDocuments({ userId: u.id })).toBe(1);
    expect(await isBookmarked(u, "course", p.courseId)).toBe(true);
    expect(await isBookmarked(other, "course", p.courseId)).toBe(false);
    expect(await listBookmarks(other)).toEqual([]);

    const lesson = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    await setBookmark(u, "lesson", lesson._id, true);
    const list = await listBookmarks(u);
    expect(list.map((x) => x.type).sort()).toEqual(["course", "lesson"]);
    expect(list.every((x) => x.available)).toBe(true);

    await setBookmark(u, "course", p.courseId, false);
    await setBookmark(u, "course", p.courseId, false);
    expect(await isBookmarked(u, "course", p.courseId)).toBe(false);
  });

  it("không lưu được khóa nháp/không tồn tại; khóa bị lưu trữ vẫn hiện, bị đình chỉ → không khả dụng", async () => {
    const u = await makeUser(["student"]);
    await expect(setBookmark(u, "course", new ObjectId(), true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const instructor = await makeUser(["instructor"]);
    const draft = await authoring.createCourse(instructor, { title: "Khóa nháp bookmark", categoryId: null, level: "beginner" });
    await expect(setBookmark(u, "course", draft, true)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const p = await publishedCourse();
    await setBookmark(u, "course", p.courseId, true);
    await authoring.setCourseStatus(p.admin, p.courseId, "suspend", "vi phạm");
    const item = (await listBookmarks(u)).find((x) => x.id === p.courseId.toHexString())!;
    expect(item.available).toBe(false);
  });
});
