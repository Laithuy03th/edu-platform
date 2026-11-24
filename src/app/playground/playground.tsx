"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconCheck, IconLink, IconPlay, IconRepeat, IconTerminal } from "@/components/icons";
import { Button } from "@/components/ui";
import { protectLoops } from "@/lib/loop-protect";

type Files = { html: string; css: string; js: string };
type Line = { level: "log" | "info" | "warn" | "error" | "system"; text: string };

const EXAMPLES: Record<string, { label: string; files: Files }> = {
  counter: {
    label: "Bộ đếm (DOM + sự kiện)",
    files: {
      html: '<main>\n  <h1>Bộ đếm</h1>\n  <p>Đã bấm <strong id="n">0</strong> lần</p>\n  <button id="btn">Bấm tôi</button>\n</main>',
      css: "body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0; background: #fff1f2; }\nmain { text-align: center; }\nbutton { font: inherit; padding: .6rem 1.2rem; border: 0; border-radius: 999px; background: #b91c1c; color: #fff; cursor: pointer; }\nbutton:active { transform: scale(.96); }",
      js: 'let count = 0;\nconst n = document.querySelector("#n");\ndocument.querySelector("#btn").addEventListener("click", () => {\n  count++;\n  n.textContent = count;\n  console.log("Số lần bấm:", count);\n});',
    },
  },
  array: {
    label: "Mảng: map / filter / reduce",
    files: {
      html: "<p>Mở tab Console bên dưới để xem kết quả.</p>",
      css: "body { font-family: system-ui, sans-serif; padding: 1rem; }",
      js: 'const scores = [7, 9.5, 4, 8, 6.5];\nconst passed = scores.filter((s) => s >= 5);\nconst avg = scores.reduce((a, b) => a + b, 0) / scores.length;\nconsole.log("Đạt:", passed);\nconsole.log("Điểm trung bình:", avg.toFixed(2));\nconsole.log("Nhân đôi:", scores.map((s) => s * 2));',
    },
  },
  flex: {
    label: "CSS Flexbox: thẻ khóa học",
    files: {
      html: '<div class="list">\n  <article class="card">Next.js cơ bản</article>\n  <article class="card">MongoDB</article>\n  <article class="card">React</article>\n</div>',
      css: ".list { display: flex; gap: 12px; flex-wrap: wrap; padding: 16px; font-family: system-ui; }\n.card { flex: 1 1 160px; padding: 24px; border-radius: 16px; background: linear-gradient(135deg, #fecaca, #fff); box-shadow: 0 8px 20px -10px #b91c1c; }",
      js: "",
    },
  },
};
const STORE = "tuhoc:playground:v1";
const MAX_CHARS = 50_000;

function encodeShare(f: Files) {
  const bytes = new TextEncoder().encode(JSON.stringify(f));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeShare(s: string): Files | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const f = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (typeof f?.html !== "string" || typeof f?.css !== "string" || typeof f?.js !== "string") return null;
    return { html: f.html.slice(0, MAX_CHARS), css: f.css.slice(0, MAX_CHARS), js: f.js.slice(0, MAX_CHARS) };
  } catch {
    return null;
  }
}
/** Link chia sẻ: code nằm trong #hash (không gửi lên server). Dùng cho nút "Chạy thử" ở khối code bài học. */
export function playgroundHref(f: Partial<Files>) {
  return `/playground#code=${encodeShare({ html: f.html ?? "", css: f.css ?? "", js: f.js ?? "" })}`;
}

export function Playground() {
  const [files, setFiles] = useState<Files>(EXAMPLES.counter!.files);
  const [tab, setTab] = useState<keyof Files>("js");
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const runId = useRef("");
  const pending = useRef<Files | null>(null);
  const lastAlive = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(files));
      } catch {
        /* hết dung lượng/chế độ riêng tư */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [files]);

  const startRun = useCallback((f: Files) => {
    pending.current = f;
    runId.current = Math.random().toString(36).slice(2);
    setLines([{ level: "system", text: "▶ Chạy lại" }]);
    setRunning(true);
    setStuck(false);
    lastAlive.current = Date.now();
    setFrameKey((k) => k + 1); // iframe mới mỗi lần chạy → sạch trạng thái cũ
  }, []);
  const run = useCallback(() => startRun(files), [startRun, files]);

  // Nạp: #code= (link chia sẻ / nút "Chạy thử") > bản nháp đã lưu > ví dụ mặc định.
  // Phải chạy sau khi mount (location/localStorage không có lúc render server → tránh lệch hydrate).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const m = location.hash.match(/#code=([A-Za-z0-9_-]+)/);
    const shared = m ? decodeShare(m[1]!) : null;
    let initial: Files = EXAMPLES.counter!.files;
    if (shared) {
      initial = shared;
      setTab(shared.js ? "js" : shared.html ? "html" : "css");
      history.replaceState(null, "", location.pathname);
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (saved && typeof saved.html === "string" && typeof saved.css === "string" && typeof saved.js === "string") initial = saved;
      } catch {
        /* bản nháp hỏng → bỏ qua */
      }
    }
    setFiles(initial);
    startRun(initial); // chạy một lần khi mở trang, với đúng nội dung vừa nạp
  }, [startRun]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stop = useCallback(() => {
    pending.current = null;
    setRunning(false);
    setStuck(false);
    setFrameKey((k) => k + 1);
    setLines((l) => [...l, { level: "system", text: "■ Đã dừng" }]);
  }, []);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!frame.current || ev.source !== frame.current.contentWindow) return; // chỉ nhận từ iframe của mình
      const d = ev.data as { type?: string; runId?: string; level?: Line["level"]; args?: string[] };
      if (d?.type === "ready" && pending.current) {
        frame.current.contentWindow?.postMessage({ type: "run", runId: runId.current, ...pending.current, js: protectLoops(pending.current.js) }, "*");
        pending.current = null;
      } else if (d?.runId === runId.current && d.type === "alive") {
        lastAlive.current = Date.now();
      } else if (d?.runId === runId.current && d.type === "console") {
        const text = (Array.isArray(d.args) ? d.args : []).map((a) => String(a).slice(0, 2000)).join(" ");
        setLines((l) => (l.length > 300 ? l : [...l, { level: (["log", "info", "warn", "error"] as const).includes(d.level as "log") ? (d.level as Line["level"]) : "log", text }]));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Phát hiện vòng lặp vô hạn: khung không còn gửi tín hiệu "alive" → gợi ý Dừng.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStuck(Date.now() - lastAlive.current > 3000), 1000);
    return () => clearInterval(t);
  }, [running]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab chèn 2 dấu cách; Esc rồi Tab để rời ô (không bẫy bàn phím)
      const el = e.currentTarget;
      if (el.dataset.escaped === "1") return;
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value } = el;
      const v = value.slice(0, s) + "  " + value.slice(en);
      setFiles((f) => ({ ...f, [tab]: v }));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    } else if (e.key === "Escape") e.currentTarget.dataset.escaped = "1";
    else e.currentTarget.dataset.escaped = "0";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>
          <IconPlay size={16} /> Chạy <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">Ctrl+Enter</kbd>
        </Button>
        <Button variant="outline" onClick={stop} disabled={!running}>
          Dừng
        </Button>
        <label className="sr-only" htmlFor="pg-example">
          Ví dụ
        </label>
        <select
          id="pg-example"
          className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm"
          defaultValue=""
          onChange={(e) => {
            const ex = EXAMPLES[e.target.value];
            if (ex) {
              setFiles(ex.files);
              setTab(ex.files.js ? "js" : "html");
            }
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Mở ví dụ…
          </option>
          {Object.entries(EXAMPLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => setFiles({ html: "", css: "", js: "" })}>
          <IconRepeat size={15} /> Trang trắng
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.origin + playgroundHref(files));
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* trình duyệt chặn clipboard */
            }
          }}
        >
          {copied ? <IconCheck size={15} /> : <IconLink size={15} />} <span aria-live="polite">{copied ? "Đã chép link" : "Chép link chia sẻ"}</span>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[#30363d] bg-[#0d1117] shadow-md">
          <div role="tablist" aria-label="Tệp" className="flex border-b border-white/10">
            {(["html", "css", "js"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                aria-controls="pg-editor"
                onClick={() => setTab(k)}
                className={`relative px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide transition ${tab === k ? "text-white" : "text-white/50 hover:text-white/80"}`}
              >
                {k === "js" ? "JavaScript" : k.toUpperCase()}
                {tab === k ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-400" /> : null}
              </button>
            ))}
          </div>
          <label htmlFor="pg-editor" className="sr-only">
            Mã {tab.toUpperCase()}
          </label>
          <textarea
            id="pg-editor"
            role="tabpanel"
            value={files[tab]}
            maxLength={MAX_CHARS}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={onKey}
            onChange={(e) => setFiles((f) => ({ ...f, [tab]: e.target.value }))}
            className="block h-[420px] w-full resize-y bg-transparent p-4 font-mono text-[13.5px] leading-6 text-[#e6edf3] caret-brand-300 outline-none placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60"
            placeholder={`Viết ${tab === "js" ? "JavaScript" : tab.toUpperCase()} ở đây…`}
          />
        </div>

        <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-md">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs font-semibold text-ink-soft">
            <span>Kết quả</span>
            {stuck ? <span className="font-semibold text-warning-700">Có vẻ đang lặp vô hạn — bấm Dừng</span> : running ? <span className="text-success-700">● đang chạy</span> : <span>đã dừng</span>}
          </div>
          <iframe
            key={frameKey}
            ref={frame}
            title="Kết quả chạy code (khung cách ly)"
            src={running ? "/api/sandbox/runner" : "about:blank"}
            // KHÔNG allow-same-origin: origin opaque → không cookie/localStorage của site, không chạm trang cha.
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="h-[260px] w-full flex-none bg-white"
          />
          <div className="flex items-center gap-2 border-y border-line bg-surface-muted px-4 py-2 text-xs font-semibold text-ink-soft">
            <IconTerminal size={14} /> Console
            <button type="button" className="ml-auto text-ink-faint hover:text-ink" onClick={() => setLines([])}>
              Xóa
            </button>
          </div>
          <ol aria-live="polite" className="h-[118px] flex-1 overflow-auto bg-[#0d1117] px-4 py-2 font-mono text-[12.5px] leading-5">
            {lines.map((l, i) => (
              <li key={i} className={l.level === "error" ? "text-[#ff7b72]" : l.level === "warn" ? "text-[#e3b341]" : l.level === "system" ? "text-white/40" : "text-[#e6edf3]"}>
                {l.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-xs text-ink-faint">
        Giới hạn: không gọi được mạng (fetch/XHR bị chặn), alert/confirm và mở cửa sổ mới bị tắt — dùng console.log. Vòng lặp for/while/do có ngoặc nhọn chạy liên tục quá 1,5 giây sẽ tự dừng; trường hợp khác bấm Dừng (nếu tab bị đơ, đóng tab rồi mở lại — bản nháp đã lưu).
      </p>
    </div>
  );
}
