import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as authoring from "@/modules/courses/authoring";
import { __uncached as catalog, parseCatalogQuery } from "@/modules/courses/catalog";
import * as tech from "@/modules/technologies/service";
import { makeUser, publishedCourse, revision } from "./helpers";

let n = 0;
const uniq = () => `t${Date.now().toString(36)}${n++}`;
const input = (over: Record<string, unknown> = {}): tech.TechnologyInput =>
  tech.technologyInput.parse({ name: "Tech", type: "language", domain: "web", aliases: "", description: "", officialUrl: "", status: "active", order: 1, ...over });

async function createTech(admin: Awaited<ReturnType<typeof makeUser>>, slug: string, over: Record<string, unknown> = {}) {
  await tech.upsertTechnology(admin, null, input({ name: slug.toUpperCase(), slug, ...over }));
  const c = await cols();
  return (await c.technologies.findOne({ slug }))!;
}

/** T01: taxonomy — slug/alias không trùng, chỉ admin sửa. */
describe("taxonomy công nghệ (T01)", () => {
  it("chỉ admin; alias không được trùng slug/alias của công nghệ khác", async () => {
    const admin = await makeUser(["admin"]);
    const student = await makeUser(["student"]);
    const a = uniq();
    await expect(tech.upsertTechnology(student, null, input({ name: "X", slug: a }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await createTech(admin, a, { aliases: `${a}-alias` });
    await expect(tech.upsertTechnology(admin, null, input({ name: "Y", slug: `${a}-alias` }))).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
    await expect(tech.upsertTechnology(admin, null, input({ name: "Z", slug: uniq(), aliases: a }))).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
  });

  it("validate: link tài liệu phải https, alias đúng định dạng", () => {
    expect(() => input({ officialUrl: "http://insecure.example" })).toThrow();
    expect(() => tech.technologyInput.parse({ ...input(), aliases: "có dấu cách" })).toThrow();
    expect(input({ aliases: "js, ECMAScript ,js" }).aliases).toEqual(["js", "ecmascript"]);
  });
});

/** T06: khai báo công nghệ của khóa đi qua quyền + revision của bản nháp, chỉ công khai sau khi duyệt. */
describe("công nghệ của khóa học (T06)", () => {
  it("chủ khóa khai báo; người khác/revision cũ/công nghệ planned bị từ chối; công khai sau khi duyệt", async () => {
    const p = await publishedCourse();
    const slug = uniq();
    const t = await createTech(p.admin, slug, { aliases: `${slug}x` });
    const planned = await createTech(p.admin, uniq(), { status: "planned" });
    const other = await makeUser(["instructor"]);

    await expect(tech.setCourseTechnologies(other, p.courseId, await revision(p.courseId), [{ technologyId: t._id, testedVersion: "1.0" }])).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tech.setCourseTechnologies(p.instructor, p.courseId, 0, [{ technologyId: t._id, testedVersion: "1.0" }])).rejects.toMatchObject({ code: "STALE_REVISION" });
    await expect(tech.setCourseTechnologies(p.instructor, p.courseId, await revision(p.courseId), [{ technologyId: planned._id, testedVersion: "" }])).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(
      tech.setCourseTechnologies(p.instructor, p.courseId, await revision(p.courseId), [
        { technologyId: t._id, testedVersion: "" },
        { technologyId: t._id, testedVersion: "" },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    await tech.setCourseTechnologies(p.instructor, p.courseId, await revision(p.courseId), [{ technologyId: t._id, testedVersion: "16.4" }]);
    // Chưa duyệt: trang công khai chưa đổi, hub chưa tồn tại
    const c = await cols();
    const course = (await c.courses.findOne({ _id: p.courseId }))!;
    expect((await catalog.courseDetail(course.slug))!.technologies).toEqual([]);
    expect(await tech.__uncached.hub(slug)).toBeNull();

    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);
    const detail = (await catalog.courseDetail(course.slug))!;
    expect(detail.technologies).toEqual([{ slug, name: slug.toUpperCase(), testedVersion: "16.4" }]);

    // Lọc catalog theo slug và theo alias; tìm theo alias qua searchText
    for (const q of [{ tech: slug }, { tech: `${slug}x` }, { q: `${slug}x` }]) {
      const list = await catalog.listCatalog(parseCatalogQuery(q));
      expect(list.items.map((x) => x.id)).toContain(p.courseId.toHexString());
    }
  });
});

/** T02/§32.2: hub chỉ có khi có khóa đã xuất bản; alias chuyển về slug chuẩn; planned không có trang. */
describe("hub công nghệ (T02)", () => {
  it("rỗng → null (404); alias → redirect; có khóa → liệt kê đúng khóa đã xuất bản", async () => {
    const p = await publishedCourse();
    const slug = uniq();
    const t = await createTech(p.admin, slug, { aliases: `${slug}-al` });
    expect(await tech.__uncached.hub(slug)).toBeNull();

    await tech.setCourseTechnologies(p.instructor, p.courseId, await revision(p.courseId), [{ technologyId: t._id, testedVersion: "" }]);
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);

    expect(await tech.__uncached.hub(`${slug}-al`)).toEqual({ redirectTo: slug });
    const hub = await tech.__uncached.hub(slug);
    expect(hub && "courses" in hub ? hub.courses.length : 0).toBe(1);

    // Khóa bị lưu trữ → không còn trong hub → hub biến mất (không còn trang rỗng)
    await authoring.setCourseStatus(p.admin, p.courseId, "archive", "test");
    expect(await tech.__uncached.hub(slug)).toBeNull();

    const planned = await createTech(p.admin, uniq(), { status: "planned" });
    expect(await tech.__uncached.hub(planned.slug)).toBeNull();
    const dir = await tech.__uncached.directory();
    expect(dir.hubs.some((h) => h.slug === planned.slug)).toBe(false);
    expect(dir.planned.some((h) => h.slug === planned.slug)).toBe(true);
  });
});

/** T06: review chuyên môn gắn với phiên bản xuất bản; nội dung đổi sau đó → "outdated". */
describe("review chuyên môn (T06)", () => {
  it("chỉ admin; đánh dấu outdated khi có bản xuất bản mới", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const slug = (await c.courses.findOne({ _id: p.courseId }))!.slug;
    await expect(tech.recordContentReview(p.instructor, p.courseId, { reviewerName: "Tự review", note: "" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await tech.recordContentReview(p.admin, p.courseId, { reviewerName: "Nguyễn Reviewer", note: "" });
    expect((await catalog.courseDetail(slug))!.contentReview).toMatchObject({ reviewerName: "Nguyễn Reviewer", outdated: false });

    const pc = (await c.courses.findOne({ _id: p.courseId }))!;
    await authoring.updateCourseDraft(p.instructor, p.courseId, await revision(p.courseId), { ...pc.draft, title: "Tiêu đề mới sau review" });
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);
    const d = (await catalog.courseDetail(slug))!;
    expect(d.contentReview?.outdated).toBe(true);
    expect(new Date(d.contentUpdatedAt).getTime()).toBeGreaterThan(pc.published!.publishedAt.getTime());
  });
});

/** T03: kiến thức nền — chặn tự tham chiếu, slug không tồn tại, vòng lặp; hub hiển thị nên-biết-trước/học-tiếp. */
describe("đồ thị kiến thức nền (T03)", () => {
  it("A → B → C; C → A bị chặn; hub hiện quan hệ hai chiều", async () => {
    const p = await publishedCourse();
    const [a, b, cc] = [uniq(), uniq(), uniq()];
    await createTech(p.admin, a);
    const tb = await createTech(p.admin, b, { prerequisites: a });
    const tc = await createTech(p.admin, cc, { prerequisites: b });
    await expect(tech.upsertTechnology(p.admin, tc._id, input({ name: cc.toUpperCase(), slug: cc, prerequisites: cc }))).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(tech.upsertTechnology(p.admin, tc._id, input({ name: cc.toUpperCase(), slug: cc, prerequisites: "khong-ton-tai-xyz" }))).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    const ta = (await (await cols()).technologies.findOne({ slug: a }))!;
    await expect(tech.upsertTechnology(p.admin, ta._id, input({ name: a.toUpperCase(), slug: a, prerequisites: cc }))).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    // Gắn B vào khóa đã xuất bản → hub B có "nên biết trước A" và "học tiếp C"
    await tech.setCourseTechnologies(p.instructor, p.courseId, await revision(p.courseId), [{ technologyId: tb._id, testedVersion: "" }]);
    const rev = await revision(p.courseId);
    await authoring.submitForReview(p.instructor, p.courseId, rev);
    await authoring.approveCourse(p.admin, p.courseId, rev);
    const hub = await tech.__uncached.hub(b);
    expect(hub && "prerequisites" in hub ? hub.prerequisites.map((x) => x.slug) : []).toEqual([a]);
    expect(hub && "next" in hub ? hub.next.map((x) => x.slug) : []).toEqual([cc]);
  });
});
