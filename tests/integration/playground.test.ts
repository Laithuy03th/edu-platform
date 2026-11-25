import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { cols } from "@/server/db/models";
import { deleteSnippet, getSnippet, listSnippets, MAX_SNIPPETS, saveSnippet } from "@/modules/playground/service";
import { makeUser } from "./helpers";

/** P05/P06: bản lưu playground — riêng tư theo chủ sở hữu, chỉ nhận tệp đúng loại, giới hạn số lượng/kích thước. */
describe("bản lưu playground", () => {
  it("tạo, liệt kê theo loại, sửa, xóa — người khác không đọc/sửa/xóa được (NOT_FOUND)", async () => {
    const u = await makeUser(["student"]);
    const other = await makeUser(["student"]);
    const web = await saveSnippet(u, null, { kind: "web", title: "  Bộ đếm  ", files: { html: "<button>+</button>", js: "let n = 0;" } });
    expect(web.title).toBe("Bộ đếm");
    // Tệp thiếu được lưu thành chuỗi rỗng — luôn đủ khóa của loại
    expect(web.files).toEqual({ html: "<button>+</button>", css: "", js: "let n = 0;" });
    const sql = await saveSnippet(u, null, { kind: "sql", title: "Doanh thu", files: { sql: "SELECT 1;", dataset: "cua-hang" } });
    await saveSnippet(u, null, { kind: "python", title: "Xin chào", files: { py: "print('hi')", stdin: "" } });

    expect((await listSnippets(u, "web")).map((s) => s.title)).toEqual(["Bộ đếm"]);
    expect((await listSnippets(u, "sql")).map((s) => s.id)).toEqual([sql.id]);
    expect(await listSnippets(other, "web")).toEqual([]);

    const id = new ObjectId(web.id);
    await expect(getSnippet(other, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(saveSnippet(other, id, { kind: "web", title: "Chiếm", files: {} })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteSnippet(other, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Đổi loại khi cập nhật không được (khớp cả kind)
    await expect(saveSnippet(u, id, { kind: "sql", title: "Đổi loại", files: { sql: "x" } })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const upd = await saveSnippet(u, id, { kind: "web", title: "Bộ đếm v2", files: { html: "<p>2</p>", css: "p{}", js: "" } });
    expect(upd.id).toBe(web.id);
    expect((await getSnippet(u, id)).files.css).toBe("p{}");

    await deleteSnippet(u, id);
    await expect(getSnippet(u, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("từ chối tệp không thuộc loại, bản lưu quá lớn, tên trống", async () => {
    const u = await makeUser(["student"]);
    await expect(saveSnippet(u, null, { kind: "python", title: "x", files: { py: "", html: "<p>" } })).rejects.toThrow(/Tệp không hợp lệ/);
    await expect(saveSnippet(u, null, { kind: "web", title: "x", files: { js: "a".repeat(130_000) } })).rejects.toThrow(/quá lớn/);
    await expect(saveSnippet(u, null, { kind: "web", title: "   ", files: {} })).rejects.toThrow();
    const c = await cols();
    expect(await c.playgroundSnippets.countDocuments({ userId: u.id })).toBe(0);
  });

  it(`tối đa ${MAX_SNIPPETS} bản lưu mỗi người (LIMIT_REACHED), sửa bản cũ vẫn được`, async () => {
    const u = await makeUser(["student"]);
    const c = await cols();
    const now = new Date();
    await c.playgroundSnippets.insertMany(Array.from({ length: MAX_SNIPPETS }, (_, i) => ({ userId: u.id, kind: "web" as const, title: `B${i}`, files: { html: "", css: "", js: "" }, createdAt: now, updatedAt: now })));
    await expect(saveSnippet(u, null, { kind: "web", title: "Thêm", files: {} })).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    const first = (await c.playgroundSnippets.findOne({ userId: u.id }))!;
    await expect(saveSnippet(u, first._id, { kind: "web", title: "Sửa được", files: {} })).resolves.toMatchObject({ title: "Sửa được" });
  });
});
