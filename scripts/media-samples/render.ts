import { codeToHtml } from "shiki";

/**
 * Dựng HTML cho ảnh bìa (chụp JPEG) và video minh họa bài học (Playwright ghi màn hình → WebM).
 * Thuần dữ liệu → HTML: không đụng DB, không mạng. Font hệ thống (Segoe UI / Cascadia Code) có đủ dấu tiếng Việt.
 */

export const W = 1280;
export const H = 720;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Inline markdown tối thiểu: **đậm**, `code`. */
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
const plain = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

/* ---------------- Markdown → khối ---------------- */

export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "code"; lang: string; title: string | null; code: string };
export type Section = { heading: string | null; blocks: Block[] };

export function parseSections(md: string): Section[] {
  const sections: Section[] = [{ heading: null, blocks: [] }];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const cur = () => sections[sections.length - 1]!;
  let para: string[] = [];
  const flush = () => {
    if (para.length) cur().blocks.push({ kind: "p", text: para.join(" ").trim() });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fence = line.match(/^```\s*([\w+-]*)(.*)$/);
    if (fence) {
      flush();
      const body: string[] = [];
      while (++i < lines.length && !lines[i]!.startsWith("```")) body.push(lines[i]!);
      const title = fence[2]?.match(/title="([^"]+)"/)?.[1] ?? null;
      cur().blocks.push({ kind: "code", lang: fence[1] || "text", title, code: body.join("\n") });
      continue;
    }
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h) {
      flush();
      sections.push({ heading: h[1]!.trim(), blocks: [] });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]!) || /^\s*\d+\.\s+/.test(lines[i]!))) {
        items.push(lines[i]!.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim());
        i++;
      }
      i--;
      cur().blocks.push({ kind: "list", items });
      continue;
    }
    if (line.trim().startsWith("|")) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = lines[i]!.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
        if (!cells.every((x) => /^:?-{2,}:?$/.test(x))) rows.push(cells);
        i++;
      }
      i--;
      cur().blocks.push({ kind: "table", rows });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return sections.filter((s) => s.heading || s.blocks.length);
}

/* ---------------- Code (shiki, cùng theme với trang học) ---------------- */

const LANG_ALIAS: Record<string, string> = { sh: "bash", shell: "bash", js: "javascript", ts: "typescript", output: "text" };
async function codeHtml(code: string, lang: string): Promise<string> {
  const l = LANG_ALIAS[lang] ?? lang;
  let html: string;
  try {
    html = await codeToHtml(code, { lang: l, theme: "github-dark-default" });
  } catch {
    html = await codeToHtml(code, { lang: "text", theme: "github-dark-default" });
  }
  let n = 0;
  return html.replace(/<span class="line">/g, () => `<span class="line" style="--i:${n++}">`);
}

/* ---------------- CSS chung ---------------- */

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Segoe UI","Be Vietnam Pro",system-ui,sans-serif;color:#18181b;background:#fff1f2;-webkit-font-smoothing:antialiased}
code{font-family:"Cascadia Code","Consolas",monospace}
.bg{position:absolute;inset:0;background:radial-gradient(1200px 600px at 110% -10%,#fecaca 0%,transparent 60%),radial-gradient(900px 500px at -10% 120%,#fee2e2 0%,transparent 60%),linear-gradient(135deg,#fff1f2,#ffffff 55%,#fff7ed)}
.dots{position:absolute;inset:0;background-image:radial-gradient(#fca5a5 1.2px,transparent 1.2px);background-size:26px 26px;opacity:.35;mask-image:linear-gradient(135deg,#000 0%,transparent 55%)}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:22px;color:#b91c1c;letter-spacing:-.01em}
.brand i{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#dc2626;color:#fff;font-style:normal;font-size:18px;box-shadow:0 6px 18px -6px #dc2626}
.chip{display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;background:#fff;border:1px solid #fecaca;color:#991b1b;font-weight:600;font-size:18px}
.codewin{border-radius:18px;background:#0d1117;box-shadow:0 30px 60px -20px rgba(127,29,29,.45),0 0 0 1px rgba(255,255,255,.06) inset;overflow:hidden}
.codewin .bar{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#161b22;color:#8b949e;font:600 15px "Segoe UI",sans-serif}
.codewin .bar b{width:12px;height:12px;border-radius:50%;display:inline-block}
.codewin pre{margin:0;padding:18px 22px;background:transparent!important;font:500 20px/1.55 "Cascadia Code","Consolas",monospace;white-space:pre}
.codewin pre code{font-family:inherit}
`;

const Logo = `<div class="brand"><i>TH</i>Tự Học</div>`;

/* ---------------- Ảnh bìa ---------------- */

export type CoverInput = { title: string; shortDescription: string; category: string | null; level: string; technologies: string[]; snippet: { code: string; lang: string; title: string | null } | null };

export async function coverHtml(c: CoverInput): Promise<string> {
  const snippet = c.snippet ? await codeHtml(c.snippet.code.split("\n").slice(0, 9).join("\n"), c.snippet.lang) : "";
  const titleSize = c.title.length > 34 ? 60 : 70;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${BASE_CSS}
.wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
.cat{font-size:20px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#dc2626;margin-top:54px}
h1{font-size:${titleSize}px;line-height:1.08;font-weight:800;letter-spacing:-.025em;max-width:640px;margin-top:16px;color:#18181b}
.desc{font-size:23px;line-height:1.45;color:#52525b;max-width:600px;margin-top:22px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;max-width:640px}
.chip.lv{background:#dc2626;border-color:#dc2626;color:#fff}
.code{position:absolute;right:-30px;top:120px;width:560px;transform:rotate(-4deg)}
.glow{position:absolute;right:40px;top:80px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,#fca5a5 0%,transparent 65%);opacity:.55}
</style></head><body>
<div class="bg"></div><div class="dots"></div><div class="glow"></div>
${snippet ? `<div class="code codewin"><div class="bar"><b style="background:#ff5f56"></b><b style="background:#ffbd2e"></b><b style="background:#27c93f"></b><span style="margin-left:8px">${esc(c.snippet!.title ?? c.snippet!.lang)}</span></div>${snippet}</div>` : ""}
<div class="wrap">
  ${Logo}
  ${c.category ? `<div class="cat">${esc(c.category)}</div>` : ""}
  <h1>${esc(c.title)}</h1>
  <p class="desc">${esc(c.shortDescription)}</p>
  <div class="chips"><span class="chip lv">${esc(c.level)}</span>${c.technologies.slice(0, 4).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
</div>
</body></html>`;
}

/* ---------------- Video bài học ---------------- */

export type LessonVideoInput = {
  courseTitle: string;
  chapterTitle: string;
  chapterNo: number;
  lessonNo: number;
  lessonTitle: string;
  objectives: string[];
  content: string;
  technologies: string[];
};
type Slide = { html: string; seconds: number; caption: string };

const CHARS_PER_SECOND = 15; // tốc độ đọc tiếng Việt thoải mái trên màn hình
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function blockText(b: Block): string {
  if (b.kind === "p") return plain(b.text);
  if (b.kind === "list") return b.items.map((x) => `• ${plain(x)}`).join("\n");
  if (b.kind === "table") return b.rows.map((r) => r.map(plain).join(" | ")).join("\n");
  return `[Code ${b.lang}]\n${b.code}`;
}

async function blockHtml(b: Block): Promise<string> {
  if (b.kind === "p") return `<p class="r">${inline(b.text)}</p>`;
  if (b.kind === "list") return `<ul>${b.items.map((x, i) => `<li class="r" style="--d:${0.35 + i * 0.55}s">${inline(x)}</li>`).join("")}</ul>`;
  if (b.kind === "table") {
    const [head, ...rows] = b.rows;
    return `<table class="r"><thead><tr>${(head ?? []).map((x) => `<th>${inline(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${inline(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const isOutput = b.lang === "output";
  // Khối dài: thu nhỏ chữ để vừa khung (≈11 dòng ở cỡ 22px), không cắt dòng
  const lines = b.code.split("\n").length;
  const fit = lines > 11 ? ` style="font-size:${Math.max(14, Math.floor((22 * 11) / lines))}px"` : "";
  return `<div class="codewin typing r"${fit ? ` data-fit${fit}` : ""}><div class="bar"><b style="background:#ff5f56"></b><b style="background:#ffbd2e"></b><b style="background:#27c93f"></b><span style="margin-left:8px">${esc(b.title ?? (isOutput ? "Kết quả mong đợi" : b.lang))}</span></div>${await codeHtml(b.code, b.lang)}</div>`;
}

/** Gom khối thành slide: code luôn đứng riêng; chữ tối đa ~380 ký tự/slide. */
function paginate(blocks: Block[]): Block[][] {
  const pages: Block[][] = [];
  let curr: Block[] = [];
  let size = 0;
  for (const b of blocks) {
    const len = b.kind === "code" ? 999 : blockText(b).length;
    if (b.kind === "code" || (curr.length && size + len > 380)) {
      if (curr.length) pages.push(curr);
      curr = [];
      size = 0;
    }
    if (b.kind === "code") {
      pages.push([b]);
      continue;
    }
    // Đoạn văn ngắn ngay sau code → chú thích dưới khối code (không tách slide gần như trống)
    const prev = pages[pages.length - 1];
    if (!curr.length && prev?.length === 1 && prev[0]!.kind === "code" && b.kind === "p" && len <= 220) {
      prev.push(b);
      continue;
    }
    curr.push(b);
    size += len;
  }
  if (curr.length) pages.push(curr);
  return pages;
}

export async function lessonVideo(v: LessonVideoInput): Promise<{ html: string; seconds: number; transcript: string }> {
  const slides: Slide[] = [];
  const kicker = `Chương ${v.chapterNo} · Bài ${v.lessonNo}`;

  slides.push({
    seconds: 5,
    caption: `${v.courseTitle} — ${kicker}: ${v.lessonTitle}`,
    html: `<section class="intro"><div class="kicker r">${esc(v.courseTitle)}</div><h1 class="r" style="--d:.25s">${esc(v.lessonTitle)}</h1><div class="meta r" style="--d:.6s"><span class="chip lv">${esc(kicker)}</span><span class="chip">${esc(v.chapterTitle)}</span>${v.technologies.slice(0, 3).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div></section>`,
  });

  if (v.objectives.length) {
    slides.push({
      seconds: clamp(2.5 + v.objectives.length * 2.2, 5, 12),
      caption: `Mục tiêu bài học:\n${v.objectives.map((o) => `• ${o}`).join("\n")}`,
      html: `<section class="std"><h2 class="r">Mục tiêu bài học</h2><ul class="goals">${v.objectives.map((o, i) => `<li class="r" style="--d:${0.4 + i * 0.6}s"><span>${i + 1}</span>${esc(o)}</li>`).join("")}</ul></section>`,
    });
  }

  for (const s of parseSections(v.content)) {
    const pages = paginate(s.blocks);
    if (!pages.length && s.heading) pages.push([]);
    for (const [pi, page] of pages.entries()) {
      const heading = s.heading ?? v.lessonTitle;
      const label = pages.length > 1 ? `${heading} (${pi + 1}/${pages.length})` : heading;
      const code = page[0]?.kind === "code" ? page[0] : null;
      const text = page.map(blockText).join("\n");
      const note = page.slice(1).map(blockText).join(" ");
      const seconds = code ? clamp(3.5 + code.code.split("\n").length * 0.9 + note.length / CHARS_PER_SECOND, 6, 26) : clamp(3 + text.length / CHARS_PER_SECOND, 5, 26);
      const body = (await Promise.all(page.map(blockHtml))).join("");
      slides.push({ seconds, caption: `${label}\n${text}`, html: `<section class="std${code ? " is-code" : ""}"><h2 class="r">${esc(label)}</h2><div class="body">${body}</div></section>` });
    }
  }

  slides.push({
    seconds: 5,
    caption: "Hết video. Đọc phần chi tiết và làm bài tập bên dưới video.",
    html: `<section class="intro outro"><div class="kicker r">Hết phần tóm tắt</div><h1 class="r" style="--d:.2s">Đọc chi tiết &amp; thực hành<br>ngay bên dưới video</h1><div class="meta r" style="--d:.5s">${Logo}</div></section>`,
  });

  const total = slides.reduce((a, s) => a + s.seconds, 0);
  const starts: number[] = [];
  slides.reduce((t, s) => (starts.push(t), t + s.seconds), 0);
  const transcript = [
    "Video minh họa tự sinh từ nội dung bài (không có lời thoại). Nội dung trên màn hình theo thứ tự:",
    ...slides.map((s, i) => `[${fmt(starts[i]!)}] ${s.caption}`),
  ].join("\n\n");

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${BASE_CSS}
.slide{position:absolute;inset:0;opacity:0;transform:translateY(18px) scale(.995);transition:opacity .55s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.slide.on{opacity:1;transform:none}
.slide.off{opacity:0;transform:translateY(-14px)}
.r{opacity:0;transform:translateY(14px)}
.slide.on .r{animation:rise .6s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:var(--d,.15s)}
@keyframes rise{to{opacity:1;transform:none}}
section{position:absolute;inset:0;padding:70px 90px 96px}
.intro{display:flex;flex-direction:column;justify-content:center}
.intro .kicker{font-size:24px;font-weight:700;color:#dc2626;letter-spacing:.06em;text-transform:uppercase}
.intro h1{font-size:68px;line-height:1.1;font-weight:800;letter-spacing:-.025em;margin-top:18px;max-width:1000px}
.intro .meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}
.chip.lv{background:#dc2626;border-color:#dc2626;color:#fff}
.std h2{font-size:42px;font-weight:800;letter-spacing:-.02em;color:#991b1b;margin-bottom:28px;max-width:1080px}
.std .body{font-size:29px;line-height:1.55;color:#27272a;max-width:1080px}
.std .body p+p,.std .body p+ul,.std .body ul+p,.std .body table+p,.std .body p+table{margin-top:20px}
.std ul{list-style:none}
.std .body li{position:relative;padding-left:34px;margin-top:12px}
.std .body li:before{content:"";position:absolute;left:4px;top:.62em;width:12px;height:12px;border-radius:4px;background:#ef4444}
.std strong{color:#b91c1c}
.std :not(pre)>code{background:#fee2e2;color:#991b1b;padding:1px 8px;border-radius:8px;font-size:.88em}
.goals li{display:flex;gap:18px;align-items:flex-start;font-size:32px;line-height:1.4;margin-top:20px}
.goals li span{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:#dc2626;color:#fff;font-weight:800;font-size:22px}
table{border-collapse:separate;border-spacing:0;border:1px solid #fecaca;border-radius:16px;overflow:hidden;background:#fff;font-size:25px}
th{background:#fee2e2;color:#7f1d1d;text-align:left;padding:12px 22px}
td{padding:12px 22px;border-top:1px solid #fee2e2}
.is-code .codewin{max-width:1100px;font-size:22px}
.is-code pre{font-size:inherit;max-height:420px;overflow:hidden}
.is-code .body>p{margin-top:26px;--d:2.2s}
.typing .line{opacity:0}
.slide.on .typing .line{animation:type .35s ease forwards;animation-delay:calc(.9s + var(--i) * .45s)}
@keyframes type{from{opacity:0;filter:blur(3px);transform:translateX(-6px)}to{opacity:1;filter:none;transform:none}}
.foot{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;gap:18px;padding:0 90px;color:#71717a;font-size:17px}
.foot .brand{font-size:17px}.foot .brand i{width:28px;height:28px;font-size:13px;border-radius:9px}
.foot .t{margin-left:auto;max-width:640px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prog{position:absolute;left:0;bottom:0;height:6px;width:100%;background:#fee2e2}
.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ef4444,#b91c1c)}
.prog.go i{width:100%;transition:width ${total}s linear}
.tag{position:absolute;top:26px;right:34px;font-size:14px;color:#a1a1aa;font-weight:600;letter-spacing:.04em}
</style></head><body>
<div class="bg"></div><div class="dots"></div>
${slides.map((s, i) => `<div class="slide" id="s${i}">${s.html}</div>`).join("\n")}
<div class="tag">VIDEO MINH HỌA TỰ SINH · KHÔNG LỜI</div>
<div class="foot">${Logo}<span class="t">${esc(v.courseTitle)} — ${esc(v.lessonTitle)}</span></div>
<div class="prog" id="prog"><i></i></div>
<script>
const starts=${JSON.stringify(starts)};
window.__start=()=>{
  document.getElementById("prog").classList.add("go");
  starts.forEach((t,i)=>setTimeout(()=>{
    if(i>0){const p=document.getElementById("s"+(i-1));p.classList.remove("on");p.classList.add("off");}
    document.getElementById("s"+i).classList.add("on");
  },t*1000));
};
</script>
</body></html>`;
  return { html, seconds: total, transcript };
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
