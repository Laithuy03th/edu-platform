import { describe, expect, it } from "vitest";
import { cols } from "@/server/db/models";
import * as enroll from "@/modules/enrollments/service";
import * as ex from "@/modules/exercises/service";
import { makeUser, publishedCourse } from "./helpers";

const predict: ex.ExerciseInput = {
  kind: "predict_output",
  language: "js",
  prompt: "Đoạn code sau in ra gì trên console?",
  code: "const a = [1, 2, 3];\nconsole.log(a.map((x) => x * 2).join('-'));",
  options: ["2-4-6", "1-2-3", "[2,4,6]"],
  correctOption: 0,
  bugLines: [],
  hints: ["map trả về mảng mới", "join nối phần tử bằng chuỗi"],
  explanation: "map nhân đôi từng phần tử, join('-') nối thành chuỗi 2-4-6.",
  fixedCode: "",
  status: "published",
};
const bug: ex.ExerciseInput = {
  kind: "find_bug",
  language: "ts",
  prompt: "Dòng nào làm trang lỗi khi đọc slug trong Next.js 15+?",
  code: "export default async function Page({ params }) {\n  const slug = params.slug;\n  return <h1>{slug}</h1>;\n}",
  options: [],
  correctOption: null,
  bugLines: [2],
  hints: ["params là Promise"],
  explanation: "params phải được await: const { slug } = await params;",
  fixedCode: "const { slug } = await params;",
  status: "published",
};

/** P04: đọc code/tìm lỗi — chấm ở server, đáp án không có trong payload trước khi giải, gợi ý theo mức, version. */
describe("bài tập đọc code (P04)", () => {
  it("không lộ đáp án; chấm đúng/sai; gợi ý từng mức; xem lời giải; quyền", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const lesson = (await c.lessons.findOne({ courseId: p.courseId, published: { $ne: null } }))!;
    const other = await makeUser(["instructor"]);
    await expect(ex.upsertExercise(other, p.courseId, lesson._id, null, predict)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const pid = await ex.upsertExercise(p.instructor, p.courseId, lesson._id, null, predict);
    const bid = await ex.upsertExercise(p.instructor, p.courseId, lesson._id, null, bug);

    const learner = await makeUser(["student"]);
    await enroll.enroll(learner, p.courseId);
    const list = await ex.lessonExercises(learner, lesson._id);
    expect(list).toHaveLength(2);
    const payload = JSON.stringify(list);
    expect(payload).not.toContain("map nhân đôi");
    expect(payload).not.toContain("await params;");
    expect(list.every((x) => x.solution === null && x.hints.length === 0)).toBe(true);

    // Sai → không lộ lời giải
    const wrongOpt = list.find((x) => x.id === pid.toHexString())!.options[1]!.optionId;
    const wrong = await ex.submitAnswer(learner, pid, { optionId: wrongOpt, lines: [] });
    expect(wrong.correct).toBe(false);
    expect(wrong.solution).toBeNull();

    // Gợi ý mở dần, không vượt số gợi ý
    expect((await ex.requestHint(learner, pid)).hints).toHaveLength(1);
    expect((await ex.requestHint(learner, pid)).hints).toHaveLength(2);
    expect((await ex.requestHint(learner, pid)).hints).toHaveLength(2);

    // Đúng → có lời giải
    const rightOpt = (await c.codeExercises.findOne({ _id: pid }))!.answer.optionId;
    const right = await ex.submitAnswer(learner, pid, { optionId: rightOpt, lines: [] });
    expect(right.correct).toBe(true);
    expect(right.solution?.explanation).toContain("map");
    expect(right.attempts).toBe(2);

    // find_bug: thừa dòng là sai, đúng tập dòng là đúng
    expect((await ex.submitAnswer(learner, bid, { optionId: null, lines: [2, 3] })).correct).toBe(false);
    expect((await ex.submitAnswer(learner, bid, { optionId: null, lines: [2] })).correct).toBe(true);
    await expect(ex.submitAnswer(learner, bid, { optionId: null, lines: [99] })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    // Sửa bài tập → version mới → trạng thái làm bài bắt đầu lại
    await ex.upsertExercise(p.instructor, p.courseId, lesson._id, pid, { ...predict, prompt: "Đoạn code (đã sửa đề) in ra gì?" });
    const after = (await ex.lessonExercises(learner, lesson._id)).find((x) => x.id === pid.toHexString())!;
    expect(after.solved).toBe(false);
    expect(after.solution).toBeNull();

    // Xem lời giải chủ động
    const rev = await ex.revealSolution(learner, pid);
    expect(rev.revealed && rev.solution !== null).toBe(true);
  });

  it("người chưa đăng ký không làm được bài tập của bài không phải học thử", async () => {
    const p = await publishedCourse();
    const c = await cols();
    const lesson = await c.lessons.findOne({ courseId: p.courseId, "published.isPreview": false, published: { $ne: null } });
    if (!lesson) return;
    const id = await ex.upsertExercise(p.instructor, p.courseId, lesson._id, null, predict);
    const stranger = await makeUser(["student"]);
    await expect(ex.requestHint(stranger, id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
