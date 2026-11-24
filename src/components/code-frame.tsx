"use client";

import { useRef, useState, type ComponentProps } from "react";
import { IconCheck, IconCopy, IconPlay, IconTerminal } from "@/components/icons";
import { playgroundHref } from "@/app/playground/playground";

/** Ngôn ngữ chạy được trong playground (P05). */
const RUNNABLE: Record<string, "html" | "css" | "js"> = {
  html: "html",
  css: "css",
  js: "js",
  javascript: "js",
};

const LANG_LABEL: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  powershell: "PowerShell",
  ps1: "PowerShell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  python: "Python",
  py: "Python",
  java: "Java",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
  cs: "C#",
  php: "PHP",
  yaml: "YAML",
  yml: "YAML",
  diff: "Diff",
  text: "Text",
  output: "Kết quả mong đợi",
};

/**
 * Khung code (T07): tên file/ngôn ngữ + nút sao chép. Phần tô màu đã được shiki tạo sẵn ở server,
 * component này chỉ thêm tương tác sao chép (vài trăm byte JS).
 */
export function CodeFrame({
  title,
  lang,
  ...pre
}: ComponentProps<"pre"> & { title?: string; lang?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "error">("idle");
  const isOutput = lang === "output";
  const label = title ?? LANG_LABEL[lang ?? ""] ?? lang ?? "Code";

  async function copy() {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? "");
      setCopied("ok");
    } catch {
      setCopied("error");
    }
    setTimeout(() => setCopied("idle"), 1800);
  }

  return (
    <figure
      className={`code-frame not-prose my-6 overflow-hidden rounded-[var(--radius-md)] border ${isOutput ? "border-line bg-surface-muted" : "border-[#30363d] bg-[#0d1117]"}`}
    >
      <figcaption
        className={`flex items-center justify-between gap-3 px-4 py-2 text-xs ${isOutput ? "border-b border-line text-ink-soft" : "border-b border-white/10 text-white/70"}`}
      >
        <span className="flex min-w-0 items-center gap-2 font-medium">
          {isOutput ? <IconTerminal size={14} /> : null}
          <span className={title ? "truncate font-mono" : "truncate"}>{label}</span>
          {title && lang && !isOutput ? (
            <span className="shrink-0 opacity-70">· {LANG_LABEL[lang] ?? lang}</span>
          ) : null}
        </span>
        {isOutput ? null : (
          <span className="flex shrink-0 items-center gap-1">
            {lang && RUNNABLE[lang] ? (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    playgroundHref({ [RUNNABLE[lang]!]: ref.current?.innerText ?? "" }),
                    "_blank",
                    "noopener",
                  )
                }
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-300"
                aria-label="Chạy thử đoạn code trong playground (tab mới)"
              >
                <IconPlay size={12} /> Chạy thử
              </button>
            ) : null}
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-300"
              aria-label={copied === "ok" ? "Đã sao chép" : "Sao chép đoạn code"}
            >
              {copied === "ok" ? <IconCheck size={14} /> : <IconCopy size={14} />}
              <span aria-live="polite">
                {copied === "ok" ? "Đã chép" : copied === "error" ? "Không chép được" : "Sao chép"}
              </span>
            </button>
          </span>
        )}
      </figcaption>
      <pre
        ref={ref}
        {...pre}
        tabIndex={0}
        className={`overflow-x-auto p-4 text-[13.5px] leading-relaxed ${isOutput ? "text-ink" : ""} ${pre.className ?? ""}`}
      />
    </figure>
  );
}
