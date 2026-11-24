import { arg } from "./_env";
import { randomBytes, randomUUID } from "node:crypto";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { normalizeForSearch } from "@/lib/text";
import { closeMongo, getDb } from "@/server/db/client";
import { ensureIndexes } from "@/server/db/indexes";
import { cols, type QuizQuestion, type Role } from "@/server/db/models";
import { hashPassword } from "@/server/auth/password";
import { normalizeEmail } from "@/server/auth/email";
import { ARTICLES, EXERCISES, CATEGORIES, COURSES, COURSE_TECHNOLOGIES, PATH, TECHNOLOGIES, type SeedQuestion } from "./seed-content";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { TechDomain, TechType } from "@/server/db/models";

/**
 * Seed idempotent theo natural key (slug/email): chạy lại không nhân đôi. Không upload media.
 * Người dùng demo CHỈ tạo khi APP_ENV ≠ production; mật khẩu từ SEED_DEMO_PASSWORD hoặc sinh ngẫu nhiên (in ra một lần).
 */
async function main() {
  const e = env();
  const db = await getDb();
  await ensureIndexes(db);
  const c = await cols();
  const now = new Date();
  console.log(`Seed vào DB "${db.databaseName}" (APP_ENV=${e.appEnv})`);

  for (const cat of CATEGORIES) {
    await c.categories.updateOne({ slug: cat.slug }, { $setOnInsert: { ...cat, isActive: true } }, { upsert: true });
  }
  const catId = new Map((await c.categories.find({}).toArray()).map((x) => [x.slug, x._id]));

  // ---- Taxonomy công nghệ: chỉ chèn mục chưa có ($setOnInsert) → không ghi đè chỉnh sửa của admin ----
  let techAdded = 0;
  for (const t of TECHNOLOGIES) {
    const r = await c.technologies.updateOne(
      { slug: t.slug },
      { $setOnInsert: { ...t, type: t.type as TechType, domain: t.domain as TechDomain, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
    techAdded += r.upsertedCount;
  }
  console.log(`Công nghệ: thêm ${techAdded}, đã có ${TECHNOLOGIES.length - techAdded}`);
  const techBySlug = new Map((await c.technologies.find({}).toArray()).map((x) => [x.slug, x]));
  // T03: kiến thức nền mặc định — chỉ đặt cho công nghệ CHƯA có trường prerequisites (không ghi đè admin)
  const PREREQ: Record<string, string[]> = { css: ["html"], javascript: ["html"], typescript: ["javascript"], react: ["javascript"], nextjs: ["react"], nodejs: ["javascript"], vue: ["javascript"], angular: ["typescript"], svelte: ["javascript"], django: ["python"], fastapi: ["python"], "spring-boot": ["java"], dotnet: ["csharp"], laravel: ["php"], postgresql: ["sql"], mysql: ["sql"], kubernetes: ["docker"], docker: ["linux"] };
  let prereqSet = 0;
  for (const [slug, deps] of Object.entries(PREREQ)) {
    const ids = deps.map((d) => techBySlug.get(d)?._id).filter((x): x is ObjectId => Boolean(x));
    const r = await c.technologies.updateOne({ slug, prerequisites: { $exists: false } }, { $set: { prerequisites: ids } });
    prereqSet += r.modifiedCount;
  }
  console.log(`Kiến thức nền: đặt cho ${prereqSet} công nghệ`);

  // ---- Người dùng ----
  let instructorId: ObjectId;
  if (e.appEnv !== "production") {
    const password = process.env.SEED_DEMO_PASSWORD || randomBytes(9).toString("base64url");
    const demo: { email: string; name: string; roles: Role[] }[] = [
      { email: "admin@demo.local", name: "Quản trị Demo", roles: ["student", "admin"] },
      { email: "giangvien@demo.local", name: "Giảng viên Demo", roles: ["student", "instructor"] },
      { email: "hocvien@demo.local", name: "Học viên Demo", roles: ["student"] },
    ];
    let created = false;
    for (const d of demo) {
      const exists = await c.users.findOne({ emailNormalized: normalizeEmail(d.email) });
      if (exists) continue;
      created = true;
      await c.users.insertOne({
        email: d.email,
        emailNormalized: normalizeEmail(d.email),
        emailVerifiedAt: now,
        passwordHash: await hashPassword(password.length >= 12 ? password : password + "-demo-pass"),
        passwordUpdatedAt: now,
        displayName: d.name,
        bio: d.roles.includes("instructor") ? "Tài khoản giảng viên demo — nội dung do dự án tự biên soạn." : "",
        timezone: "Asia/Ho_Chi_Minh",
        learningGoal: "",
        avatar: { kind: "initials" },
        roles: d.roles,
        status: "active",
        blockedReason: null,
        authVersion: 1,
        dataSaver: false,
        publicProfile: { enabled: false, handle: null },
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
    }
    if (created) {
      const shown = password.length >= 12 ? password : password + "-demo-pass";
      console.log(`Tài khoản demo (chỉ dev/test): admin@demo.local, giangvien@demo.local, hocvien@demo.local — mật khẩu: ${process.env.SEED_DEMO_PASSWORD ? "(SEED_DEMO_PASSWORD)" : shown}`);
    }
    instructorId = (await c.users.findOne({ emailNormalized: "giangvien@demo.local" }))!._id;
  } else {
    const email = arg("instructor-email");
    if (!email) throw new Error("Production: cần --instructor-email của một giảng viên đã tồn tại.");
    const u = await c.users.findOne({ emailNormalized: normalizeEmail(email), roles: "instructor" });
    if (!u) throw new Error("Không tìm thấy giảng viên.");
    instructorId = u._id;
  }

  // ---- Bài công khai (T04/T05): chỉ chèn bài chưa có ($setOnInsert) — không ghi đè chỉnh sửa của tác giả/admin ----
  let articlesAdded = 0;
  for (const a of ARTICLES) {
    const content = readFileSync(path.join("scripts", "content", "articles", `${a.slug}.md`), "utf8");
    const technologyIds = a.tech.map((s) => techBySlug.get(s)?._id).filter((x): x is ObjectId => Boolean(x));
    const body = { kind: a.kind, title: a.title, summary: a.summary, content, level: a.level, technologyIds, testedOn: a.testedOn.map((t) => ({ ...t, testedAt: new Date(t.testedAt) })) };
    const r = await c.articles.updateOne(
      { slug: a.slug },
      {
        $setOnInsert: {
          slug: a.slug,
          slugHistory: [],
          authorId: instructorId,
          status: "published",
          review: { state: "approved", submittedRevision: 1, submittedAt: now, reviewedAt: now, reviewerId: null, rejectReason: null },
          draftRevision: 1,
          publishedVersion: 1,
          draft: body,
          published: { ...body, publishedAt: now, contentUpdatedAt: now },
          contentReview: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    articlesAdded += r.upsertedCount;
  }
  console.log(`Bài hướng dẫn: thêm ${articlesAdded}, đã có ${ARTICLES.length - articlesAdded}`);

  const toQuestion = (q: SeedQuestion): QuizQuestion => {
    const options = q.options.map((text) => ({ optionId: randomUUID().slice(0, 8), text }));
    return { questionId: randomUUID(), version: 1, kind: "single_choice", prompt: q.prompt, options, correctOptionId: options[q.correct]!.optionId, explanation: q.explanation, topicKey: q.topicKey ?? null };
  };

  const courseIds: ObjectId[] = [];
  for (const sc of COURSES) {
    const existing = await c.courses.findOne({ slug: sc.slug });
    if (existing) {
      console.log(`= Bỏ qua khóa đã có: ${sc.slug}`);
      courseIds.push(existing._id);
      continue;
    }
    const courseRes = await c.courses.insertOne({
      slug: sc.slug,
      instructorId,
      status: "draft",
      review: { state: "none", submittedRevision: null, submittedAt: null, reviewedAt: null, reviewerId: null, rejectReason: null },
      draftRevision: 1,
      publishedVersion: 0,
      draft: { title: sc.title, shortDescription: sc.shortDescription, description: sc.description, learningObjectives: sc.objectives, prerequisites: sc.prerequisites, categoryId: catId.get(sc.category) ?? null, level: sc.level, thumbnailMediaId: null, placementQuizId: null },
      published: null,
      ratingAvg: 0,
      ratingCount: 0,
      enrollmentCount: 0,
      featuredRank: null,
      suspendedReason: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    const courseId = courseRes.insertedId;
    courseIds.push(courseId);

    let assignmentId: ObjectId | null = null;
    if (sc.project) {
      const p = sc.project;
      const content = {
        title: p.title,
        brief: p.brief,
        objectives: p.objectives,
        requirements: p.requirements,
        checklist: p.checklist,
        rubric: p.rubric.map((r) => ({ criterionId: randomUUID().slice(0, 8), title: r.title, maxPoints: r.max, passDescription: r.pass, failDescription: r.fail, skillTag: r.skill })),
        resources: [{ title: "Tài liệu Next.js (chính thức)", url: "https://nextjs.org/docs" }],
        maxRounds: 3,
      };
      assignmentId = (await c.projectAssignments.insertOne({ courseId, draft: { ...content, deleted: false }, published: content, createdAt: now, updatedAt: now })).insertedId;
    }

    let lessonCount = 0;
    let requiredLessonCount = 0;
    let totalDurationSeconds = 0;
    const chapterIdByTopic = new Map<string, ObjectId>();
    for (const [ci, ch] of sc.chapters.entries()) {
      const chContent = { title: ch.title, description: ch.description, order: ci + 1 };
      const chapterId = (await c.chapters.insertOne({ courseId, draft: { ...chContent, deleted: false }, published: chContent, createdAt: now, updatedAt: now })).insertedId;
      chapterIdByTopic.set(ch.topicKey, chapterId);
      for (const [li, l] of ch.lessons.entries()) {
        let quizId: ObjectId | null = null;
        if (l.quiz) {
          const draft = { title: l.quiz.title, passPercent: 70, showExplanations: "after_submit" as const, questions: l.quiz.questions.map(toQuestion), rules: [] };
          quizId = (await c.quizzes.insertOne({ courseId, kind: "lesson", draft, publishedVersion: 1, createdAt: now, updatedAt: now })).insertedId;
          await c.quizVersions.insertOne({ quizId, version: 1, courseId, kind: "lesson", ...draft, createdAt: now });
        }
        const content = {
          chapterId,
          order: li + 1,
          title: l.title,
          type: "reading" as const,
          objectives: l.objectives,
          content: l.content,
          durationSeconds: l.minutes * 60,
          isPreview: Boolean(l.preview),
          isRequired: !l.optional,
          mediaId: null,
          transcript: null,
          quizId,
          projectAssignmentId: l.project ? assignmentId : null,
        };
        await c.lessons.insertOne({ courseId, draft: { ...content, deleted: false }, published: content, createdAt: now, updatedAt: now });
        lessonCount++;
        if (content.isRequired) requiredLessonCount++;
        totalDurationSeconds += content.durationSeconds;
      }
    }

    let placementQuizId: ObjectId | null = null;
    if (sc.placement) {
      const rules = [...new Set(sc.placement.map((q) => q.topicKey!))]
        .map((topicKey) => ({ topicKey, chapterId: chapterIdByTopic.get(topicKey) ?? [...chapterIdByTopic.values()][0]!, thresholdPercent: 60 }));
      const draft = { title: `Đánh giá đầu vào: ${sc.title}`, passPercent: 0, showExplanations: "after_submit" as const, questions: sc.placement.map(toQuestion), rules };
      placementQuizId = (await c.quizzes.insertOne({ courseId, kind: "placement", draft, publishedVersion: 1, createdAt: now, updatedAt: now })).insertedId;
      await c.quizVersions.insertOne({ quizId: placementQuizId, version: 1, courseId, kind: "placement", ...draft, createdAt: now });
    }

    const d = { title: sc.title, shortDescription: sc.shortDescription, description: sc.description, learningObjectives: sc.objectives, prerequisites: sc.prerequisites, categoryId: catId.get(sc.category) ?? null, level: sc.level, thumbnailMediaId: null, placementQuizId };
    await c.courses.updateOne(
      { _id: courseId },
      {
        $set: {
          draft: d,
          published: { ...d, searchText: normalizeForSearch(`${sc.title} ${sc.shortDescription}`), lessonCount, requiredLessonCount, totalDurationSeconds, chapterCount: sc.chapters.length, publishedAt: now, thumbnailUrl: null },
          status: "published",
          publishedVersion: 1,
          review: { state: "approved", submittedRevision: 1, submittedAt: now, reviewedAt: now, reviewerId: null, rejectReason: null },
          featuredRank: courseIds.length,
        },
      },
    );
    console.log(`+ Đã tạo khóa: ${sc.slug} (${lessonCount} bài)`);
  }

  if (!(await c.learningPaths.findOne({ slug: PATH.slug }))) {
    await c.learningPaths.insertOne({
      ...PATH,
      ownerId: instructorId,
      status: "published",
      featured: true,
      items: [
        { itemId: "c1", kind: "course", refId: courseIds[0]!, title: null, required: true, order: 0, dependsOn: [] },
        { itemId: "m1", kind: "milestone", refId: null, title: "Cột mốc: hoàn thành dự án blog cá nhân", required: false, order: 1, dependsOn: ["c1"] },
        { itemId: "c2", kind: "course", refId: courseIds[1]!, title: null, required: true, order: 2, dependsOn: ["c1"] },
      ],
      createdAt: now,
      updatedAt: now,
    });
    console.log(`+ Đã tạo lộ trình: ${PATH.slug}`);
  }

  // ---- Migration schemaVersion 1 → 2 cho khóa seed: gắn công nghệ, searchText có alias, contentUpdatedAt ----
  // Chỉ chạm khóa CHƯA có field draft.technologies (idempotent; không ghi đè khai báo của giảng viên).
  for (const [slug, techSlugs] of Object.entries(COURSE_TECHNOLOGIES)) {
    const course = await c.courses.findOne({ slug, "draft.technologies": { $exists: false } });
    if (!course) continue;
    const techs = techSlugs.map((x) => techBySlug.get(x)).filter((x) => x !== undefined);
    const items = techs.map((t) => ({ technologyId: t._id, testedVersion: "" }));
    const set: Record<string, unknown> = { "draft.technologies": items, schemaVersion: 2 };
    if (course.published) {
      const words = techs.flatMap((t) => [t.name, ...t.aliases]).join(" ");
      set["published.technologies"] = items;
      set["published.searchText"] = normalizeForSearch(`${course.published.title} ${course.published.shortDescription} ${words}`);
      if (!course.published.contentUpdatedAt) set["published.contentUpdatedAt"] = course.published.publishedAt;
    }
    await c.courses.updateOne({ _id: course._id }, { $set: set });
    console.log(`~ Gắn công nghệ cho khóa ${slug}: ${techSlugs.join(", ")}`);
  }
  // ---- Bài tập đọc code (P04): chỉ thêm cho bài học CHƯA có bài tập ----
  let exAdded = 0;
  for (const e of EXERCISES) {
    const course = await c.courses.findOne({ slug: e.course });
    if (!course) continue;
    const lesson = await c.lessons.findOne({ courseId: course._id, "draft.title": e.lesson });
    if (!lesson || (await c.codeExercises.countDocuments({ lessonId: lesson._id, prompt: e.prompt }))) continue;
    const options = (e.options ?? []).map((text) => ({ optionId: randomUUID().slice(0, 8), text }));
    const order = (await c.codeExercises.countDocuments({ lessonId: lesson._id })) + 1;
    await c.codeExercises.insertOne({
      courseId: course._id,
      lessonId: lesson._id,
      order,
      kind: e.kind,
      language: e.language,
      prompt: e.prompt,
      code: e.code,
      options,
      answer: { optionId: e.kind === "predict_output" ? options[e.correct ?? 0]!.optionId : null, lines: e.bugLines ?? [] },
      hints: e.hints,
      explanation: e.explanation,
      fixedCode: e.fixedCode ?? "",
      version: 1,
      status: "published",
      createdAt: now,
      updatedAt: now,
    });
    exAdded++;
  }
  console.log(`Bài tập đọc code: thêm ${exAdded}`);
  console.log("✓ Seed xong.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
