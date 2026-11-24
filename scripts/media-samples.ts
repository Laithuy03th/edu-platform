import { arg, flag } from "./_env";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "@playwright/test";
import type { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { closeMongo } from "@/server/db/client";
import { cols, type Level, type MediaPurpose } from "@/server/db/models";
import { toViewer, type Viewer } from "@/server/auth/viewer-core";
import * as authoring from "@/modules/courses/authoring";
import { finalizeReservation, requestUpload } from "@/modules/media/service";
import { coverHtml, H, lessonVideo, parseSections, W } from "./media-samples/render";

/**
 * Sinh MEDIA MẪU cho các khóa học hiện có: ảnh bìa 1280×720 (JPEG) + một video minh họa không lời cho mỗi bài (WebM),
 * dựng từ chính nội dung bài, rồi tải lên Cloudinary qua ĐÚNG luồng của web (requestUpload → upload có chữ ký → finalize tra Admin API).
 *
 *   pnpm media:samples                      # chỉ dựng file vào .data/media-samples (không mạng, không ghi DB)
 *   pnpm media:samples --apply              # tải lên + gắn vào BẢN NHÁP (bài đọc → bài video, giữ nguyên nội dung chữ)
 *   pnpm media:samples --apply --submit     # ... rồi gửi duyệt; admin duyệt trong /admin/courses để xuất bản
 *   --course=<slug>                         # chỉ một khóa
 *
 * Idempotent: bỏ qua khóa đã có ảnh bìa, bài đã gắn video. Mọi quota/kill switch/ngân sách của web vẫn áp dụng.
 * Chỉ chạy khi chủ dự án yêu cầu (tốn dung lượng Cloudinary: ước tính in ra ở chế độ dựng).
 */

const OUT = path.join(".data", "media-samples");
const LEVEL: Record<Level, string> = { beginner: "Cơ bản", intermediate: "Trung cấp", advanced: "Nâng cao" };
const apply = flag("apply");
const submit = flag("submit");
const only = arg("course");

async function renderCover(browser: Browser, html: string, file: string) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: file, type: "jpeg", quality: 88 });
  await page.close();
}

/** ffmpeg đi kèm Playwright (đã cài cùng trình duyệt cho E2E): có mjpeg decoder + libvpx-vp9 + muxer webm. */
async function playwrightFfmpeg(): Promise<string> {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === "win32" ? path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright") : process.platform === "darwin" ? path.join(process.env.HOME ?? "", "Library/Caches/ms-playwright") : path.join(process.env.HOME ?? "", ".cache/ms-playwright"));
  const dirs = (await readdir(root)).filter((d) => d.startsWith("ffmpeg-")).sort();
  if (!dirs.length) throw new Error("Không thấy ffmpeg của Playwright — chạy `pnpm exec playwright install ffmpeg`.");
  const bin = process.platform === "win32" ? "ffmpeg-win64.exe" : process.platform === "darwin" ? "ffmpeg-mac" : "ffmpeg-linux";
  return path.join(root, dirs[dirs.length - 1]!, bin);
}

const FPS = 25;
/**
 * Ghi video: CDP screencast (JPEG, chỉ phát khung khi màn hình đổi) → nhân khung theo thời gian thực về 25 fps →
 * VP9 chất lượng cố định (CRF). Slide tĩnh nén rất nhỏ; không phụ thuộc bitrate cố định của recordVideo.
 */
async function renderVideo(browser: Browser, html: string, seconds: number, file: string) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(html, { waitUntil: "load" });
  const ff = spawn(await playwrightFfmpeg(), [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "36", "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-g", String(FPS * 10),
    file,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = "";
  ff.stderr.on("data", (d) => (ffErr += String(d)));
  const done = new Promise<void>((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg lỗi (${code}): ${ffErr.slice(0, 300)}`)))));

  const cdp = await page.context().newCDPSession(page);
  let last: Buffer | null = null;
  let t0 = 0;
  let emitted = 0;
  const write = (buf: Buffer) => ff.stdin.write(buf);
  // Phát lại khung gần nhất cho mọi mốc thời gian ≤ ts (giống cách Playwright ghi video, nhưng mình chọn encoder).
  const emitUntil = (ts: number) => {
    if (!last || !t0) return;
    while (t0 + emitted / FPS < ts && emitted < seconds * FPS) {
      write(last);
      emitted++;
    }
  };
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    emitUntil(f.metadata.timestamp ?? Date.now() / 1000);
    last = Buffer.from(f.data, "base64");
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.waitForTimeout(400); // có khung đầu tiên
  t0 = Date.now() / 1000;
  await page.evaluate(() => (window as unknown as { __start: () => void }).__start());
  await page.waitForTimeout(seconds * 1000 + 200);
  await cdp.send("Page.stopScreencast");
  emitUntil(t0 + seconds + 1);
  ff.stdin.end();
  await done;
  await page.close();
}

async function upload(viewer: Viewer, courseId: ObjectId, purpose: MediaPurpose, file: string, declaredDurationSeconds: number | null) {
  const bytes = await readFile(file);
  const isVideo = purpose.endsWith("video");
  const type = isVideo ? "video/webm" : "image/jpeg";
  const ticket = await requestUpload(viewer, { courseId, purpose, fileName: path.basename(file), declaredBytes: bytes.length, declaredType: type, declaredDurationSeconds });
  const form = new FormData();
  for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v);
  form.append("file", new Blob([bytes], { type }), path.basename(file));
  const res = await fetch(ticket.uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Cloudinary từ chối (${res.status}): ${body?.error?.message ?? "không rõ"}`);
  }
  const { ObjectId: OID } = await import("mongodb");
  const r = await finalizeReservation(new OID(ticket.reservationId), { userId: viewer.id });
  return new OID(r.mediaId);
}

async function main() {
  const e = env();
  if (apply && !e.cloudinaryEnabled) throw new Error("Cloudinary chưa cấu hình — không thể --apply.");
  const c = await cols();
  const courses = await c.courses.find({ status: "published", ...(only ? { slug: only } : {}) }).sort({ createdAt: 1 }).toArray();
  if (!courses.length) throw new Error("Không có khóa học đã xuất bản phù hợp.");
  console.log(`${apply ? "ÁP DỤNG" : "CHỈ DỰNG FILE"} · ${courses.length} khóa · DB "${e.mongoDbName}" · APP_ENV=${e.appEnv}`);

  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  let totalBytes = 0;
  try {
    for (const course of courses) {
      if (course.review.state === "pending") {
        console.log(`- ${course.slug}: đang chờ duyệt → bỏ qua (duyệt/từ chối trước rồi chạy lại).`);
        continue;
      }
      const owner = await c.users.findOne({ _id: course.instructorId });
      if (!owner) throw new Error(`Không tìm thấy giảng viên của ${course.slug}`);
      const viewer = toViewer(owner);
      const d = course.draft;
      const techIds = (d.technologies ?? []).map((t) => t.technologyId);
      const techs = techIds.length ? await c.technologies.find({ _id: { $in: techIds } }).toArray() : [];
      const techNames = techIds.map((id) => techs.find((t) => t._id.equals(id))?.name).filter((x): x is string => Boolean(x));
      const category = d.categoryId ? await c.categories.findOne({ _id: d.categoryId }) : null;
      const chapters = (await c.chapters.find({ courseId: course._id, "draft.deleted": false }).toArray()).sort((a, b) => a.draft!.order - b.draft!.order);
      const lessons = await c.lessons.find({ courseId: course._id, "draft.deleted": false }).toArray();
      const dir = path.join(OUT, course.slug);
      await mkdir(dir, { recursive: true });
      console.log(`\n# ${d.title} (${course.slug})`);

      // ---- Ảnh bìa ----
      let rev = course.draftRevision;
      if (!d.thumbnailMediaId) {
        const firstCode = lessons
          .sort((a, b) => a.draft!.order - b.draft!.order)
          .flatMap((l) => parseSections(l.draft!.content).flatMap((s) => s.blocks))
          .find((b) => b.kind === "code" && b.lang !== "text" && b.lang !== "output" && b.code.split("\n").length >= 3);
        const file = path.join(dir, "cover.jpg");
        await renderCover(
          browser,
          await coverHtml({ title: d.title, shortDescription: d.shortDescription, category: category?.name ?? null, level: LEVEL[d.level], technologies: techNames, snippet: firstCode && firstCode.kind === "code" ? firstCode : null }),
          file,
        );
        const size = (await readFile(file)).length;
        totalBytes += size;
        console.log(`  ảnh bìa: ${(size / 1024).toFixed(0)} KiB`);
        if (apply) {
          const mediaId = await upload(viewer, course._id, "course_thumbnail", file, null);
          rev = await authoring.updateCourseDraft(viewer, course._id, rev, { ...d, thumbnailMediaId: mediaId });
          console.log(`  → đã tải lên + gắn ảnh bìa (${mediaId.toHexString()})`);
        }
      } else console.log("  ảnh bìa: đã có → giữ nguyên");

      // ---- Video từng bài ----
      for (const [ci, ch] of chapters.entries()) {
        const chLessons = lessons.filter((l) => l.draft!.chapterId.equals(ch._id)).sort((a, b) => a.draft!.order - b.draft!.order);
        for (const [li, l] of chLessons.entries()) {
          const ld = l.draft!;
          if (ld.mediaId) {
            console.log(`  [${ci + 1}.${li + 1}] ${ld.title}: đã có video → bỏ qua`);
            continue;
          }
          const v = await lessonVideo({ courseTitle: d.title, chapterTitle: ch.draft!.title, chapterNo: ci + 1, lessonNo: li + 1, lessonTitle: ld.title, objectives: ld.objectives, content: ld.content, technologies: techNames });
          const file = path.join(dir, `${ci + 1}-${li + 1}.webm`);
          // Dùng lại file đã dựng ở lần chạy trước (nội dung bài không đổi) — xóa .data/media-samples để dựng lại
          const exists = await stat(file).then((s) => s.size > 0).catch(() => false);
          if (!exists || flag("rerender")) await renderVideo(browser, v.html, v.seconds, file);
          const size = (await readFile(file)).length;
          totalBytes += size;
          await writeFile(file.replace(/\.webm$/, ".transcript.txt"), v.transcript);
          console.log(`  [${ci + 1}.${li + 1}] ${ld.title}: ${Math.round(v.seconds)} giây, ${(size / 1024 / 1024).toFixed(2)} MiB${ld.isPreview ? " (học thử, công khai)" : ""}`);
          if (apply) {
            const mediaId = await upload(viewer, course._id, ld.isPreview ? "preview_video" : "lesson_video", file, Math.ceil(v.seconds) + 1);
            const { order: _o, deleted: _d, ...rest } = ld;
            rev = await authoring.updateLesson(viewer, course._id, l._id, rev, { ...rest, type: "video", mediaId, transcript: v.transcript });
            console.log(`      → đã tải lên + gắn (${mediaId.toHexString()})`);
          }
        }
      }

      if (apply && submit) {
        const fresh = (await c.courses.findOne({ _id: course._id }))!;
        if (fresh.draftRevision !== course.draftRevision) {
          await authoring.submitForReview(viewer, course._id, fresh.draftRevision);
          console.log("  → đã gửi duyệt (admin duyệt trong /admin/courses)");
        }
      }
    }
  } finally {
    await browser.close();
    await rm(path.join(OUT, "_rec"), { recursive: true, force: true });
    await closeMongo();
  }
  console.log(`\nTổng dung lượng file: ${(totalBytes / 1024 / 1024).toFixed(1)} MiB${apply ? "" : " (chưa tải lên — thêm --apply)"}`);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeMongo().catch(() => {});
  process.exit(1);
});
