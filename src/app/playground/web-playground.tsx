"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/code-editor";
import { IconCheck, IconLink, IconPlay, IconRepeat, IconSparkle, IconTerminal } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Badge, Button } from "@/components/ui";
import { protectLoops } from "@/lib/loop-protect";
import { decodeShare, encodeShare, MAX_CHARS, type WebFiles } from "@/lib/playground-share";
import { WEB_CHALLENGES, type WebChallenge } from "./challenges";
import { WEB_EXAMPLES } from "./examples";
import { downloadText, SnippetsMenu, SplitPane, useChallengeProgress, useIsNarrow } from "./shared";

type Tab = keyof WebFiles;
type Level = "log" | "info" | "warn" | "error";
type Entry = { id: number; level: Level | "system"; text: string; line?: number | null; table?: { columns: string[]; rows: string[][] } };
type TestResult = { name: string; pass: boolean; message?: string };
type Layout = "row" | "column" | "preview";
const DEVICES = [
  { k: "auto", label: "Tự động", w: 0 },
  { k: "375", label: "Điện thoại 375", w: 375 },
  { k: "768", label: "Máy tính bảng 768", w: 768 },
  { k: "1280", label: "Desktop 1280", w: 1280 },
] as const;
const STORE = "tuhoc:playground:v1";
const PREF = "tuhoc:playground:prefs:v1";
const TAB_LABEL: Record<Tab, string> = { html: "HTML", css: "CSS", js: "JavaScript" };
const LANG: Record<Tab, "html" | "css" | "javascript"> = { html: "html", css: "css", js: "javascript" };

/** Định dạng code bằng Prettier — chỉ tải (~1 MB) khi người học bấm "Định dạng". */
async function formatCode(tab: Tab, code: string) {
  const [prettier, html, postcss, babel, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/html"),
    import("prettier/plugins/postcss"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);
  return prettier.format(code, { parser: tab === "html" ? "html" : tab === "css" ? "css" : "babel", plugins: [html, postcss, babel, estree], printWidth: 90 });
}

export function WebPlayground({ signedIn, initialSnippet }: { signedIn: boolean; initialSnippet: { id: string; title: string; files: Record<string, string> } | null }) {
  const toast = useToast();
  const [files, setFiles] = useState<WebFiles>(WEB_EXAMPLES[0]!.files);
  const [tab, setTab] = useState<Tab>("js");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "log">("all");
  const [running, setRunning] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [autoRun, setAutoRun] = useState(true);
  const [layout, setLayout] = useState<Layout>("row");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["k"]>("auto");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [challenge, setChallenge] = useState<WebChallenge | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [current, setCurrent] = useState<{ id: string; title: string } | null>(initialSnippet ? { id: initialSnippet.id, title: initialSnippet.title } : null);
  const [formatting, setFormatting] = useState(false);
  const { done, mark } = useChallengeProgress();
  const narrow = useIsNarrow();
  // Điện thoại: bố cục "Ngang" chuyển thành xếp dọc (hai cột quá hẹp để gõ code)
  const view: Layout = narrow && layout === "row" ? "column" : layout;

  const root = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const editor = useRef<CodeEditorHandle | null>(null);
  const previewBox = useRef<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(0);
  const runId = useRef("");
  const pending = useRef<(WebFiles & { tests?: string }) | null>(null);
  const lastAlive = useRef(0);
  const seq = useRef(0);
  const loaded = useRef(false);
  const lastRun = useRef("");
  const resultsRef = useRef<TestResult[]>([]);

  const push = useCallback((e: Omit<Entry, "id">) => setEntries((l) => (l.length > 400 ? l : [...l, { ...e, id: ++seq.current }])), []);

  /** Chạy: iframe MỚI mỗi lần (sạch trạng thái), gửi code khi runner báo "ready". */
  const startRun = useCallback(
    (f: WebFiles, tests?: string) => {
      pending.current = { ...f, js: protectLoops(f.js), tests };
      lastRun.current = JSON.stringify(f);
      resultsRef.current = [];
      runId.current = Math.random().toString(36).slice(2);
      setEntries([{ id: ++seq.current, level: "system", text: tests ? "▶ Chạy kiểm tra thử thách" : "▶ Chạy lại" }]);
      if (tests) setResults([]);
      setRunning(true);
      setStuck(false);
      lastAlive.current = Date.now();
      setFrameKey((k) => k + 1);
    },
    [],
  );
  const run = useCallback(() => startRun(files), [files, startRun]);
  const stop = useCallback(() => {
    pending.current = null;
    setRunning(false);
    setStuck(false);
    setFrameKey((k) => k + 1);
    push({ level: "system", text: "■ Đã dừng" });
  }, [push]);

  // Nạp ban đầu: bản lưu (?s=) > link chia sẻ (#code=) > ?thu-thach= > bản nháp máy này > ví dụ mặc định
  /* eslint-disable react-hooks/set-state-in-effect -- đọc URL/localStorage sau khi mount (không có ở server) */
  useEffect(() => {
    let initial: WebFiles = WEB_EXAMPLES[0]!.files;
    const params = new URLSearchParams(location.search);
    const m = location.hash.match(/#code=([A-Za-z0-9_-]+)/);
    const ch = WEB_CHALLENGES.find((c) => c.id === params.get("thu-thach"));
    try {
      const p = JSON.parse(localStorage.getItem(PREF) ?? "{}");
      if (p.layout) setLayout(p.layout);
      if (p.device) setDevice(p.device);
      if (typeof p.autoRun === "boolean") setAutoRun(p.autoRun);
    } catch {
      /* bỏ qua */
    }
    if (initialSnippet) initial = { html: initialSnippet.files.html ?? "", css: initialSnippet.files.css ?? "", js: initialSnippet.files.js ?? "" };
    else if (m) {
      const shared = decodeShare(m[1]!, ["html", "css", "js"] as const);
      if (shared) {
        initial = shared;
        history.replaceState(null, "", location.pathname);
      }
    } else if (ch) {
      setChallenge(ch);
      initial = ch.starter;
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (saved && typeof saved.html === "string" && typeof saved.css === "string" && typeof saved.js === "string") initial = saved;
      } catch {
        /* bản nháp hỏng → bỏ qua */
      }
    }
    setFiles(initial);
    setTab(initial.js ? "js" : initial.css && !initial.html ? "css" : "html");
    loaded.current = true;
    startRun(initial);
  }, [initialSnippet, startRun]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Tự lưu bản nháp trên máy (không phải bản lưu tài khoản) + tùy chọn giao diện
  useEffect(() => {
    if (!loaded.current || challenge) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(files));
      } catch {
        /* hết dung lượng / chế độ riêng tư */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [files, challenge]);
  useEffect(() => {
    try {
      localStorage.setItem(PREF, JSON.stringify({ layout, device, autoRun }));
    } catch {
      /* bỏ qua */
    }
  }, [layout, device, autoRun]);

  // Tự chạy khi gõ (debounce)
  useEffect(() => {
    if (!autoRun || !loaded.current || JSON.stringify(files) === lastRun.current) return;
    const t = setTimeout(() => startRun(files), 900);
    return () => clearTimeout(t);
  }, [files, autoRun, startRun]);

  // Tin nhắn từ khung chạy code — chỉ nhận đúng iframe của mình, đúng lượt chạy
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!frame.current || ev.source !== frame.current.contentWindow) return;
      const d = ev.data as { type?: string; runId?: string; level?: Level; args?: string[]; line?: number | null; columns?: string[]; rows?: string[][]; name?: string; pass?: boolean; message?: string; total?: number };
      if (d?.type === "ready" && pending.current) {
        frame.current.contentWindow?.postMessage({ type: "run", runId: runId.current, ...pending.current }, "*");
        pending.current = null;
        return;
      }
      if (d?.runId !== runId.current) return;
      if (d.type === "alive") lastAlive.current = Date.now();
      else if (d.type === "console") push({ level: (["log", "info", "warn", "error"] as const).includes(d.level as Level) ? (d.level as Level) : "log", text: (d.args ?? []).join(" "), line: d.line ?? null });
      else if (d.type === "table") push({ level: "log", text: "console.table", table: { columns: d.columns ?? [], rows: d.rows ?? [] } });
      else if (d.type === "console-clear") setEntries([{ id: ++seq.current, level: "system", text: "console.clear()" }]);
      else if (d.type === "test") {
        resultsRef.current = [...resultsRef.current, { name: d.name ?? "", pass: Boolean(d.pass), message: d.message }];
        setResults(resultsRef.current);
      } else if (d.type === "tests-done") {
        const all = resultsRef.current;
        if (challenge && all.length && all.every((x) => x.pass)) {
          mark(challenge.id);
          toast({ tone: "success", message: `Hoàn thành thử thách “${challenge.title}”!` });
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [challenge, mark, push, toast]);

  // Phát hiện treo (vòng lặp không có ngoặc nhọn…): khung không gửi tín hiệu "alive"
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStuck(Date.now() - lastAlive.current > 3000), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Độ rộng vùng xem trước → thu nhỏ khung thiết bị cho vừa
  useEffect(() => {
    const el = previewBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const deviceW = DEVICES.find((d) => d.k === device)!.w;
  const scale = deviceW && boxW ? Math.min(1, boxW / deviceW) : 1;
  const counts = useMemo(() => ({ error: entries.filter((e) => e.level === "error").length, warn: entries.filter((e) => e.level === "warn").length }), [entries]);
  const shown = entries.filter((e) => filter === "all" || e.level === "system" || (filter === "log" ? e.level === "log" || e.level === "info" : e.level === filter));

  const setFile = (k: Tab, v: string) => setFiles((f) => ({ ...f, [k]: v.slice(0, MAX_CHARS) }));
  const openChallenge = (c: WebChallenge | null) => {
    setChallenge(c);
    setResults(null);
    setShowHint(false);
    if (c) {
      setFiles(c.starter);
      setTab(c.starter.js || c.topic !== "CSS" ? "js" : "css");
      startRun(c.starter);
    }
  };
  const fullHtml = () =>
    `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Tự Học Playground</title>\n<style>\n${files.css}\n</style>\n</head>\n<body>\n${files.html}\n<script>\n${files.js}\n</script>\n</body>\n</html>\n`;

  const editorPane = (
    <div className="flex h-full min-h-0 flex-col bg-[#0d1117]">
      <div role="tablist" aria-label="Tệp" className="flex items-center border-b border-white/10">
        {(["html", "css", "js"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`relative px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide transition ${tab === k ? "text-white" : "text-white/50 hover:text-white/80"}`}
          >
            {TAB_LABEL[k]}
            {files[k] ? <span aria-hidden className="ml-1.5 inline-block size-1.5 rounded-full bg-brand-400 align-middle" /> : null}
            {tab === k ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-400" /> : null}
          </button>
        ))}
        <span className="ml-auto hidden pr-3 text-[11px] text-white/40 xl:block">Emmet: gõ ul&gt;li*3 rồi Tab · Esc rồi Tab để rời editor</span>
      </div>
      <CodeEditor
        ref={editor}
        docKey={tab}
        value={files[tab]}
        language={LANG[tab]}
        onChange={(v) => setFile(tab, v)}
        onRun={run}
        onSave={() => window.dispatchEvent(new Event("playground:save"))}
        ariaLabel={`Mã ${TAB_LABEL[tab]}`}
        className="min-h-[300px] flex-1"
      />
    </div>
  );

  const previewPane = (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-1.5 text-xs font-semibold text-ink-soft">
        <span>Kết quả</span>
        <label className="sr-only" htmlFor="pg-device">
          Kích thước màn hình xem trước
        </label>
        <select id="pg-device" value={device} onChange={(e) => setDevice(e.target.value as typeof device)} className="h-7 rounded-full border border-line bg-surface px-2 text-xs">
          {DEVICES.map((d) => (
            <option key={d.k} value={d.k}>
              {d.label}
            </option>
          ))}
        </select>
        <span className="ml-auto" aria-live="polite">
          {stuck ? <span className="text-warning-700">Có vẻ bị treo — bấm Dừng</span> : running ? <span className="text-success-700">● đang chạy</span> : "đã dừng"}
        </span>
      </div>
      <div ref={previewBox} className="relative min-h-[200px] flex-1 overflow-hidden bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] [background-size:16px_16px]">
        <iframe
          key={frameKey}
          ref={frame}
          title="Kết quả chạy code (khung cách ly)"
          src={running ? "/api/sandbox/runner" : "about:blank"}
          // KHÔNG allow-same-origin: origin opaque → không cookie/localStorage của site, không chạm trang cha.
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="absolute left-0 top-0 origin-top-left bg-white"
          style={deviceW ? { width: deviceW, height: `${100 / scale}%`, transform: `scale(${scale})`, left: scale < 1 ? 0 : `calc(50% - ${deviceW / 2}px)` } : { width: "100%", height: "100%" }}
        />
      </div>
      <div className="flex items-center gap-1 border-y border-line bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-soft">
        <button type="button" onClick={() => setConsoleOpen((o) => !o)} aria-expanded={consoleOpen} className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-brand-50">
          <IconTerminal size={14} /> Console
        </button>
        {(["all", "error", "warn", "log"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`rounded px-2 py-1 ${filter === k ? "bg-brand-100 text-brand-800" : "hover:bg-brand-50"}`}>
            {k === "all" ? "Tất cả" : k === "error" ? `Lỗi${counts.error ? ` (${counts.error})` : ""}` : k === "warn" ? `Cảnh báo${counts.warn ? ` (${counts.warn})` : ""}` : "Log"}
          </button>
        ))}
        <button type="button" className="ml-auto rounded px-2 py-1 text-ink-faint hover:bg-brand-50 hover:text-ink" onClick={() => setEntries([])}>
          Xóa
        </button>
      </div>
      {consoleOpen ? (
        <ol aria-live="polite" aria-label="Console" className="h-40 shrink-0 overflow-auto bg-[#0d1117] px-3 py-2 font-mono text-[12.5px] leading-5">
          {shown.map((e) => (
            <li key={e.id} className={`border-b border-white/5 py-0.5 ${e.level === "error" ? "text-[#ff7b72]" : e.level === "warn" ? "text-[#e3b341]" : e.level === "system" ? "text-white/40" : e.level === "info" ? "text-[#79c0ff]" : "text-[#e6edf3]"}`}>
              {e.table ? (
                <table className="my-1 border-collapse text-[11.5px]">
                  <thead>
                    <tr>
                      {e.table.columns.map((c) => (
                        <th key={c} className="border border-white/15 px-2 py-0.5 text-left text-white/70">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {e.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => (
                          <td key={j} className="border border-white/15 px-2 py-0.5">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="whitespace-pre-wrap break-words">{e.text}</span>
              )}
              {e.line ? (
                <button
                  type="button"
                  onClick={() => {
                    setTab("js");
                    setTimeout(() => editor.current?.gotoLine(e.line!), 60);
                  }}
                  className="ml-2 rounded bg-white/10 px-1.5 text-[11px] text-white/80 hover:bg-white/20"
                >
                  main.js:{e.line} →
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );

  return (
    <div ref={root} className="space-y-3 bg-canvas [&:fullscreen]:overflow-auto [&:fullscreen]:p-4">
      {/* ---- Thanh công cụ ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} size="sm">
          <IconPlay size={14} /> Chạy <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-[11px] sm:inline">Ctrl+Enter</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={stop} disabled={!running}>
          Dừng
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} className="accent-brand-700" /> Tự chạy khi gõ
        </label>
        <label className="sr-only" htmlFor="pg-example">
          Mở ví dụ
        </label>
        <select
          id="pg-example"
          className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm"
          value=""
          onChange={(e) => {
            const ex = WEB_EXAMPLES.find((x) => x.id === e.target.value);
            if (ex) {
              openChallenge(null);
              setFiles(ex.files);
              setTab(ex.files.js ? "js" : "html");
              setCurrent(null);
              startRun(ex.files);
            }
          }}
        >
          <option value="" disabled>
            Mở ví dụ…
          </option>
          {WEB_EXAMPLES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="pg-challenge">
          Thử thách
        </label>
        <select
          id="pg-challenge"
          className="h-9 rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-800"
          value={challenge?.id ?? ""}
          onChange={(e) => openChallenge(WEB_CHALLENGES.find((c) => c.id === e.target.value) ?? null)}
        >
          <option value="">🎯 Thử thách ({Object.keys(done).filter((k) => WEB_CHALLENGES.some((c) => c.id === k)).length}/{WEB_CHALLENGES.length})</option>
          {WEB_CHALLENGES.map((c) => (
            <option key={c.id} value={c.id}>
              {done[c.id] ? "✓ " : ""}
              {c.topic} · {c.title}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          pending={formatting}
          onClick={async () => {
            if (!files[tab].trim()) return;
            setFormatting(true);
            try {
              setFile(tab, (await formatCode(tab, files[tab])).trimEnd() + "\n");
            } catch (err) {
              toast({ tone: "error", message: `Không định dạng được: ${String((err as Error).message).split("\n")[0]}` });
            }
            setFormatting(false);
          }}
        >
          <IconSparkle size={14} /> Định dạng
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SnippetsMenu
            kind="web"
            signedIn={signedIn}
            loginNext="/playground"
            current={current}
            setCurrent={setCurrent}
            getFiles={() => ({ ...files })}
            onOpen={(s) => {
              const f = { html: s.files.html ?? "", css: s.files.css ?? "", js: s.files.js ?? "" };
              openChallenge(null);
              setFiles(f);
              startRun(f);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${location.origin}/playground#code=${encodeShare({ ...files })}`);
                toast({ tone: "success", message: "Đã chép link chia sẻ (code nằm trong link, không lưu trên server)." });
              } catch {
                toast({ tone: "error", message: "Trình duyệt chặn sao chép." });
              }
            }}
          >
            <IconLink size={14} /> Chia sẻ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadText(`${current?.title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "playground"}.html`, fullHtml(), "text/html")}>
            Tải .html
          </Button>
          <div role="group" aria-label="Bố cục" className="flex rounded-full border border-line bg-surface p-0.5">
            {(
              [
                ["row", "Ngang"],
                ["column", "Dọc"],
                ["preview", "Chỉ kết quả"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setLayout(k)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${view === k ? "bg-brand-700 text-white" : "text-ink-soft hover:bg-brand-50"}`}>
                {l}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void root.current?.requestFullscreen?.().catch(() => {}))}
            aria-label="Toàn màn hình"
          >
            ⛶
          </Button>
        </div>
      </div>

      {/* ---- Thử thách ---- */}
      {challenge ? (
        <section aria-label="Thử thách" className="rounded-[var(--radius-lg)] border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{challenge.topic}</Badge>
            <Badge>{challenge.level}</Badge>
            <h2 className="font-display text-lg font-bold text-ink">{challenge.title}</h2>
            {done[challenge.id] ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-700">
                <IconCheck size={15} /> Đã hoàn thành
              </span>
            ) : null}
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => startRun(files, challenge.tests)}>
                Kiểm tra
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowHint((h) => !h)}>
                {showHint ? "Ẩn gợi ý" : "Gợi ý"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setFiles(challenge.starter), startRun(challenge.starter))}>
                <IconRepeat size={14} /> Làm lại
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openChallenge(null)}>
                Thoát
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink">{challenge.description.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith("`") ? <code key={i} className="rounded bg-surface px-1.5 font-mono text-[0.9em] text-brand-800">{p.slice(1, -1)}</code> : p))}</p>
          {showHint ? <p className="mt-2 rounded-[var(--radius-sm)] border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">💡 {challenge.hint}</p> : null}
          {results ? (
            <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
              {results.length === 0 ? <li className="text-ink-faint">Đang kiểm tra…</li> : null}
              {results.map((r, i) => (
                <li key={i} className={`flex gap-2 ${r.pass ? "text-success-700" : "text-danger-700"}`}>
                  <span aria-hidden>{r.pass ? "✓" : "✗"}</span>
                  <span>
                    <strong>{r.name}</strong>
                    {r.message ? <span className="text-ink-soft"> — {r.message}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* ---- Vùng làm việc ---- */}
      <div className={`${narrow ? "h-[88vh]" : "h-[min(78vh,760px)]"} min-h-[520px] overflow-hidden rounded-[var(--radius-lg)] border border-line shadow-md`}>
        {view === "preview" ? (
          previewPane
        ) : (
          <SplitPane key={view} direction={view} storageKey={`tuhoc:pg:split:${view}`} first={editorPane} second={previewPane} />
        )}
      </div>
      <p className="text-xs text-ink-faint">
        Code chạy trong khung cách ly: không gọi được mạng, không đọc được cookie/tài khoản của trang. Vòng lặp for/while/do chạy liên tục quá 1,5 giây sẽ tự dừng. alert/confirm/prompt được in ra Console. Tìm/thay: Ctrl+F · Lưu: Ctrl+S.
      </p>
    </div>
  );
}
