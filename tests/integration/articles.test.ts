import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as art from "@/modules/articles/service";
import * as tech from "@/modules/technologies/service";
import { makeUser } from "./helpers";

let n = 0;
const uniq = () => `a${Date.now().toString(36)}${n++}`;

async function activeTech(admin: Awaited<ReturnType<typeof makeUser>>) {
  const slug = uniq();
  await tech.upsertTechnology(admin, null, tech.technologyInput.parse({ name: slug.toUpperCase(), slug, type: "language", domain: "web", aliases: "", description: "", officialUrl: "", status: "active", order: 1 }));
  return (await (await cols()).technologies.findOne({ slug }))!._id;
}

const CONTENT = `## Chuẩn bị\n\nĐoạn mở đầu đủ dài để vượt ngưỡng tối thiểu của bài viết công khai, giải thích mục tiêu và điều kiện cần có trước khi làm theo, gồm quyền quản trị máy, kết nối mạng ổn định và một terminal mới mở sau khi cài đặt xong.\n\n## Thực hiện\n\n\`\`\`bash\nnode -v\n\`\`\`\n\n\`\`\`output\nv22.13.0\n\`\`\`\n\nKết quả cần thấy là số phiên bản Node.js đã cài; nếu báo không tìm thấy lệnh, mở lại terminal.`;

/** T05/T04/S06: vòng đời bài công khai — quyền, điều kiện xuất bản, duyệt, slug cũ 308, lưu trữ. */
describe("bài hướng dẫn công khai (T05)", () => {
  it("chỉ tác giả/admin; người khác không thấy nháp; nháp không công khai", async () => {
    const author = await makeUser(["instructor"]);
    const other = await makeUser(["instructor"]);
    const student = await makeUser(["student"]);
    await expect(art.createArticle(student, { title: "Bài của học viên", kind: "tutorial" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const id = await art.createArticle(author, { title: `Cài Node ${uniq()}`, kind: "recipe" });
    await expect(art.loadEditableArticle(other, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const a = (await (await cols()).articles.findOne({ _id: id }))!;
    expect(await art.__uncached.detail(a.slug)).toBeNull();
  });

  it("recipe phải có môi trường đã chạy thử; duyệt → công khai; đổi slug → slug cũ redirect; lưu trữ", async () => {
    const admin = await makeUser(["admin"]);
    const author = await makeUser(["instructor"]);
    const techId = await activeTech(admin);
    const id = await art.createArticle(author, { title: `Cài môi trường ${uniq()}`, kind: "recipe" });
    const c = await cols();
    let doc = (await c.articles.findOne({ _id: id }))!;
    const base = { kind: "recipe" as const, title: doc.draft.title, summary: "Cài Node.js LTS và kiểm tra phiên bản trên Windows.", content: CONTENT, level: "beginner" as const, technologyIds: [techId], testedOn: [] };
    let rev = await art.updateArticleDraft(author, id, doc.draftRevision, base);
    await expect(art.submitArticle(author, id, rev)).rejects.toMatchObject({ code: "PUBLISH_REQUIREMENTS_FAILED" });
    rev = await art.updateArticleDraft(author, id, rev, { ...base, testedOn: [{ os: "Windows 11", tools: "Node 22.13.0", testedAt: new Date() }] });
    await expect(art.updateArticleDraft(author, id, rev - 1, base)).rejects.toMatchObject({ code: "STALE_REVISION" });

    await art.submitArticle(author, id, rev);
    await expect(art.updateArticleDraft(author, id, rev, base)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(art.approveArticle(author, id, rev)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await art.approveArticle(admin, id, rev);

    doc = (await c.articles.findOne({ _id: id }))!;
    const detail = await art.__uncached.detail(doc.slug);
    expect(detail && "title" in detail ? detail.testedOn.length : 0).toBe(1);
    expect(detail && "title" in detail ? detail.reviewed : true).toBe(false);
    const list = await art.__uncached.list({ kind: "recipe" });
    expect(list.some((x) => x.slug === doc.slug)).toBe(true);

    // Đổi slug sau khi công khai: slug cũ → redirect; bài khác không lấy được slug cũ
    const oldSlug = doc.slug;
    const newSlug = `${oldSlug}-moi`;
    await art.changeArticleSlug(author, id, newSlug);
    expect(await art.__uncached.detail(oldSlug)).toEqual({ redirectTo: newSlug });
    const other = await art.createArticle(author, { title: `Khác ${uniq()}`, kind: "tutorial" });
    await expect(art.changeArticleSlug(author, other, oldSlug)).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
    await expect(art.changeArticleSlug(author, other, "Có Dấu")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    // Review chuyên môn → reviewed; lưu trữ → vẫn đọc được nhưng archived, không trong danh sách
    await art.recordArticleReview(admin, id, "Nguyễn Reviewer", "");
    const reviewed = await art.__uncached.detail(newSlug);
    expect(reviewed && "title" in reviewed ? reviewed.reviewed : false).toBe(true);
    await art.setArticleArchived(admin, id, true);
    const archived = await art.__uncached.detail(newSlug);
    expect(archived && "title" in archived ? archived.archived : false).toBe(true);
    expect((await art.__uncached.list({})).some((x) => x.slug === newSlug)).toBe(false);
  });
});
