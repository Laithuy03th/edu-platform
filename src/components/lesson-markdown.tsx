import "server-only";
import { MarkdownAsync, type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";

/**
 * Cache kết quả tô màu theo (ngôn ngữ, meta, code) — giống nhau giữa các request nên không cần tô lại.
 * Đo tải cục bộ: tô màu là phần tốn CPU nhất của trang bài viết. LRU giới hạn để không phình bộ nhớ.
 */
class LruMap<V> {
  private m = new Map<string, V>();
  constructor(private max: number) {}
  get(k: string) {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: V) {
    this.m.set(k, v);
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value!);
    return this;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- kiểu hast Root của shiki
const highlightCache = new LruMap<any>(3000);
import type { ShikiTransformer } from "shiki";
import { CodeFrame } from "@/components/code-frame";
import { safeUrl } from "@/components/markdown";
import { slugify } from "@/lib/text";

/**
 * Markdown cho NỘI DUNG BÀI HỌC (T05/T07), render ở server:
 * - Tô màu cú pháp bằng shiki lúc render server → không gửi highlighter xuống trình duyệt.
 * - Meta khối code: ```ts title="app/page.tsx"  → hiển thị tên file; ```output → khung "Kết quả mong đợi".
 * - Heading h2/h3 có id ổn định (anchor + mục lục).
 * Vẫn giữ chính sách an toàn của `Markdown` (ADR-017): skipHtml, URL allowlist, ảnh chỉ từ Cloudinary.
 * Nội dung do người dùng nhập ở hỏi đáp/ghi chú vẫn dùng `Markdown` đồng bộ (không cần tô màu).
 */
const metaTitle: ShikiTransformer = {
  name: "tuhoc:meta",
  pre(node) {
    const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw ?? "";
    const title = raw.match(/title="([^"]{1,120})"/)?.[1];
    if (title) node.properties["data-title"] = title;
    node.properties["data-lang"] = this.options.lang;
  },
};

type HastNode = NonNullable<ExtraProps["node"]>;
type HastChild = HastNode["children"][number];

function textOf(node: HastNode | HastChild | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) return (node.children as HastChild[]).map((c) => textOf(c)).join("");
  return "";
}

export function headingId(text: string): string {
  return slugify(text).slice(0, 80) || "muc";
}

/** Lấy mục lục (h2/h3) từ Markdown thô — cùng thuật toán id với renderer. */
export function extractToc(md: string): { id: string; text: string; level: 2 | 3 }[] {
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(##|###)\s+(.+?)\s*#*\s*$/);
    if (m) {
      const text = m[2]!.replace(/[*_`]/g, "");
      out.push({ id: headingId(text), text, level: m[1] === "##" ? 2 : 3 });
    }
  }
  return out;
}

export async function LessonMarkdown({ children, allowImages = true }: { children: string; allowImages?: boolean }) {
  const components: Components = {
    a: ({ href, children: c }) => {
      const safe = safeUrl(href ?? "");
      if (!safe) return <span>{c}</span>;
      const external = /^https?:/.test(safe);
      return (
        <a href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}>
          {c}
        </a>
      );
    },
    img: ({ src, alt, title }) => {
      const s = typeof src === "string" ? src : "";
      if (!allowImages || !/^https:\/\/res\.cloudinary\.com\//.test(s)) return <span className="text-ink-faint">[ảnh: {alt || "không hiển thị"}]</span>;
      // M03: title của ảnh Markdown = chú thích/nguồn/giấy phép, hiển thị dưới ảnh (span block vì ảnh nằm trong <p>).
      return (
        <span className="my-6 block">
          <img src={s} alt={alt ?? ""} loading="lazy" decoding="async" className="mx-auto max-w-full rounded-[var(--radius-md)] border border-line" />
          {title ? <span className="mt-2 block text-center text-sm text-ink-faint">{title}</span> : null}
        </span>
      );
    },
    h2: ({ node, children: c }) => {
      const id = headingId(textOf(node));
      return (
        <h2 id={id} className="group scroll-mt-24">
          {c}
          <a href={`#${id}`} className="ml-2 text-brand-300 no-underline opacity-0 transition group-hover:opacity-100 focus:opacity-100" aria-label="Liên kết tới mục này">
            #
          </a>
        </h2>
      );
    },
    h3: ({ node, children: c }) => {
      const id = headingId(textOf(node));
      return (
        <h3 id={id} className="scroll-mt-24">
          {c}
        </h3>
      );
    },
    pre: ({ node, ...props }) => {
      const p = props as Record<string, unknown>;
      const lang = (p["data-lang"] as string | undefined) ?? (node?.properties?.dataLang as string | undefined);
      const title = (p["data-title"] as string | undefined) ?? (node?.properties?.dataTitle as string | undefined);
      const { style, className, children: c } = props;
      // Khối output: không dùng nền tối của theme để phân biệt với code.
      return (
        <CodeFrame lang={lang} title={title} className={className} style={lang === "output" ? undefined : style}>
          {c}
        </CodeFrame>
      );
    },
  };
  return (
    <div className="prose max-w-none">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeShiki, { theme: "github-dark-default", cache: highlightCache, lazy: true, fallbackLanguage: "text", defaultLanguage: "text", transformers: [metaTitle] }]]}
        components={components}
        urlTransform={safeUrl}
        skipHtml
      >
        {children}
      </MarkdownAsync>
    </div>
  );
}
