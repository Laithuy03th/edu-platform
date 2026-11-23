import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown an toàn (ADR-017): KHÔNG rehype-raw → HTML hiển thị như text;
 * URL chỉ http/https/mailto/nội bộ; ảnh chỉ từ res.cloudinary.com và chỉ khi allowImages.
 */
function safeUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (u.startsWith("#")) return u;
  try {
    const parsed = new URL(u);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) return u;
  } catch {
    /* ignore */
  }
  return "";
}

export function Markdown({ children, allowImages = false, className }: { children: string; allowImages?: boolean; className?: string }) {
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
    img: ({ src, alt }) => {
      const s = typeof src === "string" ? src : "";
      if (!allowImages || !/^https:\/\/res\.cloudinary\.com\//.test(s)) return <span className="text-ink-faint">[ảnh: {alt || "không hiển thị"}]</span>;
      return <img src={s} alt={alt ?? ""} loading="lazy" decoding="async" className="max-w-full rounded" />;
    },
  };
  return (
    <div className={className ?? "prose max-w-none prose-pre:bg-ink prose-pre:text-white"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={safeUrl} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
