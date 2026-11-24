import "server-only";
import { unstable_cache } from "next/cache";
import { cols } from "@/server/db/models";
import { CATALOG_TAG } from "@/modules/courses/catalog";

export type PlatformStats = { courses: number; lessons: number; videoLessons: number; videoMinutes: number; quizzes: number; projects: number; technologies: number };

/**
 * Số liệu CÔNG KHAI, đếm thật từ nội dung đã xuất bản (không cộng nháp, không số ảo).
 * Không có số học viên: số nhỏ ở giai đoạn demo không giúp người đọc và dễ bị hiểu là chiêu marketing.
 */
async function load(): Promise<PlatformStats> {
  const c = await cols();
  const published = await c.courses.find({ status: "published" }, { projection: { _id: 1, "published.lessonCount": 1, "published.technologies": 1 } }).toArray();
  const ids = published.map((x) => x._id);
  const [video, quizzes, projects] = await Promise.all([
    c.lessons
      .aggregate<{ n: number; s: number }>([{ $match: { courseId: { $in: ids }, "published.type": "video" } }, { $group: { _id: null, n: { $sum: 1 }, s: { $sum: "$published.durationSeconds" } } }])
      .toArray(),
    c.quizzes.countDocuments({ courseId: { $in: ids }, publishedVersion: { $ne: null } }),
    c.projectAssignments.countDocuments({ courseId: { $in: ids }, published: { $ne: null } }),
  ]);
  const techs = new Set(published.flatMap((x) => (x.published?.technologies ?? []).map((t) => t.technologyId.toHexString())));
  return {
    courses: published.length,
    lessons: published.reduce((a, x) => a + (x.published?.lessonCount ?? 0), 0),
    videoLessons: video[0]?.n ?? 0,
    videoMinutes: Math.round((video[0]?.s ?? 0) / 60),
    quizzes,
    projects,
    technologies: techs.size,
  };
}

export const getPlatformStats = unstable_cache(load, ["platform-stats-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });
export const __uncachedStats = load;

export type ProjectShowcase = { courseTitle: string; courseSlug: string; title: string; brief: string; objectives: string[]; checklist: string[]; rubric: { title: string; max: number }[] };

/** Bỏ cú pháp markdown inline (**đậm**, `code`) để hiển thị dạng chữ thuần trên trang chủ. */
const plainText = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

/** Dự án THẬT của một khóa đã xuất bản (brief, mục tiêu, tiêu chí rubric) để giới thiệu trên trang chủ. */
async function loadShowcase(): Promise<ProjectShowcase | null> {
  const c = await cols();
  const published = await c.courses.find({ status: "published" }, { projection: { _id: 1, slug: 1, "published.title": 1, featuredRank: 1 } }).sort({ featuredRank: 1, _id: 1 }).toArray();
  for (const course of published) {
    const a = await c.projectAssignments.findOne({ courseId: course._id, published: { $ne: null } });
    if (!a?.published) continue;
    const p = a.published;
    return {
      courseTitle: course.published!.title,
      courseSlug: course.slug,
      title: p.title,
      brief: plainText(p.brief),
      objectives: p.objectives.slice(0, 4).map(plainText),
      checklist: p.checklist.slice(0, 4).map(plainText),
      rubric: p.rubric.map((r) => ({ title: r.title, max: r.maxPoints })),
    };
  }
  return null;
}
export const getProjectShowcase = unstable_cache(loadShowcase, ["project-showcase-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });
