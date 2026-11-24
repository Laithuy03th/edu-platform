import { describe, expect, it } from "vitest";
import { __uncachedAnnouncement, announcementInput, updateAnnouncement } from "@/modules/site/announcement";
import { __uncachedStats } from "@/modules/site/stats";
import { makeUser, publishedCourse } from "./helpers";

const base = { enabled: true, message: "Khóa mới đã ra mắt", linkHref: "/courses", linkLabel: "Xem", tone: "brand" as const };

describe("banner thông báo (admin)", () => {
  it("chỉ admin sửa; xung đột phiên bản bị từ chối; đọc lại đúng nội dung", async () => {
    const admin = await makeUser(["admin"]);
    const student = await makeUser(["student"]);
    const v0 = (await __uncachedAnnouncement()).version;
    await expect(updateAnnouncement(student, v0, base)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const v1 = await updateAnnouncement(admin, v0, base);
    await expect(updateAnnouncement(admin, v0, { ...base, message: "Bản cũ ghi đè" })).rejects.toMatchObject({ code: "STALE_REVISION" });
    const a = await __uncachedAnnouncement();
    expect(a).toMatchObject({ ...base, version: v1 });
  });

  it("validate: chặn javascript:, http://, //host; bật phải có nội dung; link cần chữ", () => {
    for (const href of ["javascript:alert(1)", "http://example.com", "//evil.example", "https://", "data:text/html,x"]) {
      expect(announcementInput.safeParse({ ...base, linkHref: href }).success, href).toBe(false);
    }
    expect(announcementInput.safeParse({ ...base, linkHref: "https://nextjs.org/docs" }).success).toBe(true);
    expect(announcementInput.safeParse({ ...base, message: "" }).success).toBe(false);
    expect(announcementInput.safeParse({ ...base, enabled: false, message: "" }).success).toBe(true);
    expect(announcementInput.safeParse({ ...base, linkLabel: "" }).success).toBe(false);
  });
});

describe("số liệu công khai trang chủ", () => {
  it("chỉ đếm nội dung đã xuất bản", async () => {
    const before = await __uncachedStats();
    await publishedCourse();
    const after = await __uncachedStats();
    expect(after.courses).toBe(before.courses + 1);
    expect(after.lessons).toBeGreaterThan(before.lessons);
  });
});
