import { flag } from "./_env";
import ts from "typescript";
import { closeMongo } from "@/server/db/client";
import { cols } from "@/server/db/models";
import { parseSections } from "./media-samples/render";

/**
 * T07: smoke check code mẫu trong nội dung ĐÃ xuất bản (bài học + bài hướng dẫn).
 * - js/jsx/ts/tsx/mjs: phân tích cú pháp bằng TypeScript (không chạy code, không cần mạng).
 * - json: JSON.parse.
 * - Các ngôn ngữ khác (bash, powershell, text, output…): bỏ qua — cần chạy thật theo môi trường (ghi ở testedOn).
 * Snippet cố ý rút gọn (có "...") được báo là cảnh báo, không phải lỗi.
 *   pnpm content:check            # in báo cáo, exit 1 nếu có lỗi cú pháp
 *   pnpm content:check --quiet    # chỉ in tóm tắt
 */
const quiet = flag("quiet");
const TS_LANGS: Record<string, ts.ScriptKind> = { js: ts.ScriptKind.JS, mjs: ts.ScriptKind.JS, javascript: ts.ScriptKind.JS, jsx: ts.ScriptKind.JSX, ts: ts.ScriptKind.TS, typescript: ts.ScriptKind.TS, tsx: ts.ScriptKind.TSX };

function syntaxErrors(code: string, kind: ts.ScriptKind): string[] {
  const ext = kind === ts.ScriptKind.TSX ? "tsx" : kind === ts.ScriptKind.JSX ? "jsx" : kind === ts.ScriptKind.TS ? "ts" : "js";
  const sf = ts.createSourceFile(`snippet.${ext}`, code, ts.ScriptTarget.Latest, false, kind);
  const diags = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return diags.map((d) => {
    const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    return `dòng ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
  });
}

async function main() {
  const c = await cols();
  const courses = await c.courses.find({ status: { $in: ["published", "archived"] } }, { projection: { slug: 1 } }).toArray();
  const lessons = await c.lessons.find({ courseId: { $in: courses.map((x) => x._id) }, published: { $ne: null } }, { projection: { courseId: 1, "published.title": 1, "published.content": 1 } }).toArray();
  const articles = await c.articles.find({ status: "published" }, { projection: { slug: 1, "published.title": 1, "published.content": 1 } }).toArray();
  const slugOf = new Map(courses.map((x) => [x._id.toHexString(), x.slug]));
  const docs = [
    ...lessons.map((l) => ({ where: `/learn/${slugOf.get(l.courseId.toHexString())}/${l._id.toHexString()} — ${l.published!.title}`, content: l.published!.content })),
    ...articles.map((a) => ({ where: `/huong-dan/${a.slug} — ${a.published!.title}`, content: a.published!.content })),
  ];
  let checked = 0, skipped = 0, warnings = 0, errors = 0;
  for (const d of docs) {
    const blocks = parseSections(d.content).flatMap((s) => s.blocks).filter((b) => b.kind === "code");
    for (const b of blocks) {
      if (b.kind !== "code") continue;
      const lang = b.lang.toLowerCase();
      const abbreviated = /(^|\n)\s*(\.\.\.|…|\/\/ \.\.\.)/.test(b.code);
      let problems: string[] = [];
      if (TS_LANGS[lang] !== undefined) problems = syntaxErrors(b.code, TS_LANGS[lang]!);
      else if (lang === "json") {
        try {
          JSON.parse(b.code);
        } catch (e) {
          problems = [(e as Error).message];
        }
      } else {
        skipped++;
        continue;
      }
      checked++;
      if (!problems.length) continue;
      if (abbreviated) {
        warnings++;
        if (!quiet) console.log(`⚠ ${d.where}\n   [${lang}${b.title ? ` ${b.title}` : ""}] snippet rút gọn ("..."), bỏ qua lỗi: ${problems[0]}`);
      } else {
        errors++;
        console.log(`✗ ${d.where}\n   [${lang}${b.title ? ` ${b.title}` : ""}] ${problems.slice(0, 3).join(" | ")}`);
      }
    }
  }
  console.log(`\nĐã kiểm ${checked} khối (bỏ qua ${skipped} khối shell/text/output) trong ${docs.length} bài · lỗi: ${errors} · cảnh báo: ${warnings}`);
  await closeMongo();
  if (errors) process.exit(1);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeMongo().catch(() => {});
  process.exit(1);
});
