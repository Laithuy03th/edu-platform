"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/code-editor";
import { IconCheck, IconLink, IconPlay, IconRepeat, IconTerminal } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Badge, Button } from "@/components/ui";
import { decodeShare, encodeShare, MAX_CHARS } from "@/lib/playground-share";
import { PYTHON_CHALLENGES, type PythonChallenge } from "../challenges";
import { PY_EXAMPLES } from "../python-examples";
import { downloadText, SnippetsMenu, SplitPane, useChallengeProgress, useIsNarrow } from "../shared";

type Kind = "stdout" | "stderr" | "system" | "error" | "image";
type Entry = { id: number; kind: Kind; text: string; line?: number | null };
type TestResult = { name: string; pass: boolean; message?: string };
type RunMsg = { type: "run"; runId: string; code: string; stdin: string; tests?: string };
type Status = "loading" | "ready" | "running" | "failed";

const STORE = "tuhoc:python:v1";
const LIMIT_RUN_S = 20;
const LIMIT_CHECK_S = 10;

/** Diễn giải lỗi Python phổ biến (dòng cuối traceback) thành gợi ý tiếng Việt. */
function explain(tb: string) {
  const last = tb.trim().split("\n").pop() ?? "";
  const m = (re: RegExp) => last.match(re);
  let r: RegExpMatchArray | null;
  if ((r = m(/^NameError: name '([^']+)'/))) return `Tên “${r[1]}” chưa được định nghĩa — kiểm tra chính tả (phân biệt hoa thường) hoặc phải gán/định nghĩa trước khi dùng.`;
  if (/^IndentationError|^TabError/.test(last)) return "Thụt lề chưa đúng — các dòng trong cùng một khối phải thụt lề bằng nhau (4 dấu cách), sau dấu “:” phải có khối thụt vào.";
  if (/^SyntaxError/.test(last)) return "Sai cú pháp — hay gặp: thiếu dấu “:” sau if/for/while/def, thiếu ngoặc đóng, thiếu dấu nháy, dùng = thay cho ==.";
  if (/^TypeError: can only concatenate str|unsupported operand type/.test(last)) return "Không cộng/trừ được hai kiểu khác nhau (vd chuỗi + số) — đổi kiểu bằng str(), int() hoặc dùng f-string.";
  if (/^TypeError: .* missing \d+ required positional argument|takes \d+ positional argument/.test(last)) return "Gọi hàm sai số đối số — xem lại định nghĩa def.";
  if (/^TypeError/.test(last)) return "Sai kiểu dữ liệu cho thao tác này — in type(bien) ra để kiểm tra.";
  if (/^ZeroDivisionError/.test(last)) return "Phép chia cho 0 — kiểm tra mẫu số trước khi chia.";
  if (/^IndexError/.test(last)) return "Chỉ số vượt quá độ dài — chỉ số hợp lệ từ 0 đến len(...) - 1.";
  if (/^KeyError/.test(last)) return "Khóa không có trong dict — dùng d.get(khoa) hoặc kiểm tra “khoa in d” trước.";
  if (/^ValueError: invalid literal for int/.test(last)) return "Chuỗi không đổi được sang số — kiểm tra dữ liệu nhập (ô Input) có đúng là số không.";
  if (/^ValueError/.test(last)) return "Giá trị không hợp lệ cho thao tác này.";
  if (/^AttributeError/.test(last)) return "Đối tượng không có thuộc tính/phương thức này — kiểm tra kiểu dữ liệu và chính tả tên.";
  if (/^RecursionError/.test(last)) return "Đệ quy quá sâu — hàm đệ quy cần điều kiện dừng.";
  if (/^EOFError/.test(last)) return "input() không còn dữ liệu để đọc — nhập dữ liệu vào ô “Input (stdin)”, mỗi dòng cho một lần gọi input().";
  if (/^ModuleNotFoundError/.test(last)) return "Không có thư viện này trong Python chạy trên trình duyệt — có sẵn thư viện chuẩn và các gói như numpy, pandas, matplotlib, scipy.";
  if (/JsException: TypeError: Failed to fetch/.test(last)) return "Playground không cho truy cập mạng (an toàn cho người học).";
  return null;
}

export function PythonPlayground({ signedIn, initialSnippet }: { signedIn: boolean; initialSnippet: { id: string; title: string; files: Record<string, string> } | null }) {
  const toast = useToast();
  const narrow = useIsNarrow();
  const [code, setCode] = useState(PY_EXAMPLES[0]!.code);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState("");
  const [fatal, setFatal] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [challenge, setChallenge] = useState<PythonChallenge | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [aborted, setAborted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [current, setCurrent] = useState<{ id: string; title: string } | null>(initialSnippet ? { id: initialSnippet.id, title: initialSnippet.title } : null);
  const { done, mark } = useChallengeProgress();

  const frame = useRef<HTMLIFrameElement | null>(null);
  const editor = useRef<CodeEditorHandle | null>(null);
  const out = useRef<HTMLOListElement | null>(null);
  const runId = useRef("");
  const queued = useRef<RunMsg | null>(null);
  const statusRef = useRef<Status>("loading");
  const execStart = useRef(0);
  const isCheck = useRef(false);
  const seq = useRef(0);
  const buf = useRef<Entry[]>([]);
  const raf = useRef(0);
  const resultsRef = useRef<TestResult[]>([]);
  const loaded = useRef(false);

  const setStat = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /** Gom dòng đầu ra theo khung hình (vòng lặp in hàng nghìn dòng không làm đơ giao diện). */
  const push = useCallback((e: Omit<Entry, "id">) => {
    buf.current.push({ ...e, id: ++seq.current });
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const add = buf.current.splice(0);
        setEntries((l) => (l.length > 4000 ? l : [...l, ...add]));
      });
    }
  }, []);

  const send = useCallback(
    (msg: RunMsg) => {
      if (statusRef.current === "ready" && frame.current?.contentWindow) {
        frame.current.contentWindow.postMessage(msg, "*");
        execStart.current = 0;
        setStat("running");
      } else {
        queued.current = msg;
        push({ kind: "system", text: "Đang tải Python — sẽ chạy ngay khi tải xong…" });
      }
    },
    [push, setStat],
  );

  const start = useCallback(
    (src: string, input: string, tests?: string) => {
      const msg: RunMsg = { type: "run", runId: Math.random().toString(36).slice(2), code: src, stdin: input, tests };
      runId.current = msg.runId;
      isCheck.current = Boolean(tests);
      buf.current = [];
      setEntries([{ id: ++seq.current, kind: "system", text: tests ? "▶ Chạy kiểm tra thử thách" : "▶ python main.py" }]);
      setElapsed(0);
      setLastMs(null);
      if (tests) {
        resultsRef.current = [];
        setResults([]);
        setAborted(false);
      }
      send(msg);
    },
    [send],
  );
  const run = useCallback(() => start(code, stdin), [code, stdin, start]);

  const stop = useCallback(
    (reason?: string) => {
      if (statusRef.current !== "running") return;
      frame.current?.contentWindow?.postMessage({ type: "stop", runId: runId.current }, "*");
      runId.current = "";
      setStat("loading");
      push({ kind: "system", text: reason ?? "■ Đã dừng — đang khởi động lại Python…" });
    },
    [push, setStat],
  );

  // Tin nhắn từ khung cách ly: chỉ nhận đúng iframe của mình; đầu ra phải đúng lượt chạy hiện tại
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!frame.current || ev.source !== frame.current.contentWindow) return;
      const d = ev.data as { type?: string; runId?: string; text?: unknown; line?: unknown; data?: unknown; name?: unknown; pass?: unknown; message?: unknown; ok?: unknown; ms?: unknown; aborted?: unknown; version?: unknown; python?: unknown };
      if (!d || typeof d.type !== "string") return;
      if (d.type === "loaded") {
        setInfo(`Python ${String(d.python)} · Pyodide ${String(d.version)}`);
        setFatal(null);
        setStat("ready");
        if (queued.current) {
          const m = queued.current;
          queued.current = null;
          send(m);
        }
        return;
      }
      if (d.type === "fatal") {
        setFatal(String(d.message ?? "Không tải được Python."));
        setStat("failed");
        return;
      }
      if (d.type === "ready" || d.type === "stopped") return;
      if (d.runId !== runId.current) return;
      switch (d.type) {
        case "exec-start":
          execStart.current = Date.now();
          break;
        case "stdout":
        case "stderr":
        case "system":
          push({ kind: d.type, text: String(d.text ?? "") });
          break;
        case "image":
          push({ kind: "image", text: String(d.data ?? "") });
          break;
        case "error":
          push({ kind: "error", text: String(d.text ?? ""), line: typeof d.line === "number" ? d.line : null });
          break;
        case "test":
          resultsRef.current = [...resultsRef.current, { name: String(d.name ?? ""), pass: d.pass === true, message: d.message ? String(d.message) : undefined }];
          setResults(resultsRef.current);
          break;
        case "tests-done": {
          if (d.aborted) setAborted(true);
          const all = resultsRef.current;
          if (challenge && !d.aborted && all.length && all.every((x) => x.pass)) {
            mark(`py:${challenge.id}`);
            toast({ tone: "success", message: `Hoàn thành thử thách “${challenge.title}”!` });
          }
          break;
        }
        case "done":
          setLastMs(typeof d.ms === "number" ? d.ms : null);
          setStat("ready");
          break;
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [challenge, mark, push, send, setStat, toast]);

  // Đồng hồ chạy + tự dừng khi chạy quá lâu (vòng lặp vô hạn) — chỉ tính từ lúc code bắt đầu chạy, không tính lúc tải gói
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => {
      if (!execStart.current) return;
      const s = Math.floor((Date.now() - execStart.current) / 1000);
      setElapsed(s);
      const limit = isCheck.current ? LIMIT_CHECK_S : LIMIT_RUN_S;
      if (s >= limit) stop(`■ Chạy quá ${limit} giây nên đã tự dừng (vòng lặp vô hạn?). Đang khởi động lại Python…`);
    }, 500);
    return () => clearInterval(t);
  }, [status, stop]);

  // Cuộn console xuống cuối khi có đầu ra mới
  useEffect(() => {
    const el = out.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  // Nạp ban đầu: bản lưu (?s=) > link chia sẻ (#code=) > ?thu-thach= > bản nháp máy này > ví dụ mặc định
  /* eslint-disable react-hooks/set-state-in-effect -- đọc URL/localStorage sau khi mount (không có ở server) */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = location.hash.match(/#code=([A-Za-z0-9_-]+)/);
    const ch = PYTHON_CHALLENGES.find((c) => c.id === params.get("thu-thach"));
    let src = PY_EXAMPLES[0]!.code;
    let input = "";
    if (initialSnippet) {
      src = initialSnippet.files.py ?? "";
      input = initialSnippet.files.stdin ?? "";
    } else if (m) {
      const shared = decodeShare(m[1]!, ["py", "stdin"] as const);
      if (shared) {
        src = shared.py;
        input = shared.stdin;
        history.replaceState(null, "", location.pathname);
      }
    } else if (ch) {
      setChallenge(ch);
      src = ch.starter;
    } else {
      try {
        const d = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (d && typeof d.py === "string") {
          src = d.py;
          input = typeof d.stdin === "string" ? d.stdin : "";
        }
      } catch {
        /* bản nháp hỏng → bỏ qua */
      }
    }
    setCode(src);
    setStdin(input);
    if (input) setStdinOpen(true);
    loaded.current = true;
  }, [initialSnippet]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded.current || challenge) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ py: code, stdin }));
      } catch {
        /* hết dung lượng / chế độ riêng tư */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, stdin, challenge]);

  const openChallenge = (c: PythonChallenge | null) => {
    setChallenge(c);
    setResults(null);
    setAborted(false);
    setShowHint(false);
    if (c) {
      setCode(c.starter);
      setCurrent(null);
    }
  };
  const openExample = (id: string) => {
    const ex = PY_EXAMPLES.find((x) => x.id === id);
    if (!ex) return;
    openChallenge(null);
    setCode(ex.code);
    setStdin(ex.stdin ?? "");
    setStdinOpen(Boolean(ex.stdin));
    setCurrent(null);
    start(ex.code, ex.stdin ?? "");
  };

  const running = status === "running";
  const editorPane = (
    <div className="flex h-full min-h-0 flex-col bg-[#0d1117]">
      <div className="flex items-center gap-2 border-b border-white/10 px-2">
        <span className="relative px-2 py-2.5 font-mono text-xs font-semibold text-white">
          main.py
          <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-400" />
        </span>
        <span className="ml-auto hidden truncate pr-1 text-[11px] text-white/40 lg:block">Ctrl+Enter chạy · Tab thụt lề 4 dấu cách · Esc rồi Tab để rời editor</span>
      </div>
      <CodeEditor
        ref={editor}
        docKey="py"
        value={code}
        language="python"
        onChange={(v) => setCode(v.slice(0, MAX_CHARS))}
        onRun={run}
        onSave={() => window.dispatchEvent(new Event("playground:save"))}
        ariaLabel="Mã Python"
        className="min-h-[240px] flex-1"
      />
    </div>
  );

  const consolePane = (
    <div className="flex h-full min-h-0 flex-col bg-[#0d1117]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70">
        <IconTerminal size={14} /> Đầu ra
        <span className="ml-auto truncate font-normal text-white/50" aria-live="polite">
          {status === "loading" ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 animate-pulse rounded-full bg-[#e3b341]" /> Đang tải Python (~6 MB lần đầu, sau đó dùng bộ nhớ đệm)…
            </span>
          ) : status === "failed" ? (
            <span className="text-[#ff7b72]">Không tải được Python</span>
          ) : running ? (
            <span className="text-[#7ee787]">● đang chạy{elapsed ? ` · ${elapsed}s` : ""}</span>
          ) : (
            `${info}${lastMs !== null ? ` · xong trong ${lastMs} ms` : ""}`
          )}
        </span>
        <button type="button" className="rounded px-2 py-0.5 font-semibold text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setEntries([])}>
          Xóa
        </button>
      </div>
      <ol ref={out} aria-live="polite" aria-label="Đầu ra chương trình" className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12.5px] leading-5">
        {fatal ? (
          <li className="py-1 text-[#ff7b72]">
            {fatal}
            <button type="button" className="ml-2 rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20" onClick={() => (setFatal(null), setStat("loading"), setFrameKey((k) => k + 1))}>
              Thử lại
            </button>
          </li>
        ) : null}
        {entries.map((e) =>
          e.kind === "image" ? (
            <li key={e.id} className="py-1">
              <img src={`data:image/png;base64,${e.text}`} alt="Hình vẽ từ matplotlib" className="max-w-full rounded-md bg-white" />
            </li>
          ) : e.kind === "error" ? (
            <li key={e.id} className="my-1 rounded-md border border-[#ff7b72]/30 bg-[#ff7b72]/10 p-2 text-[#ffa198]">
              <pre className="whitespace-pre-wrap break-words font-mono">{e.text}</pre>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans text-[12px]">
                {e.line ? (
                  <button
                    type="button"
                    onClick={() => editor.current?.gotoLine(e.line!)}
                    className="rounded bg-white/10 px-1.5 font-mono text-[11px] text-white/85 hover:bg-white/20"
                  >
                    main.py:{e.line} →
                  </button>
                ) : null}
                {explain(e.text) ? <span className="text-[#e3b341]">💡 {explain(e.text)}</span> : null}
              </div>
            </li>
          ) : (
            <li key={e.id} className={`whitespace-pre-wrap break-words ${e.kind === "stderr" ? "text-[#ffa198]" : e.kind === "system" ? "text-white/40" : "text-[#e6edf3]"}`}>
              {e.text || " "}
            </li>
          ),
        )}
      </ol>
      <div className="border-t border-white/10">
        <button type="button" aria-expanded={stdinOpen} onClick={() => setStdinOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-white/70 hover:bg-white/5">
          <span aria-hidden>{stdinOpen ? "▾" : "▸"}</span> Input (stdin){stdin ? ` · ${stdin.split("\n").filter(Boolean).length} dòng` : ""}
          <span className="ml-auto font-normal text-white/40">dữ liệu cho input(), mỗi dòng một lần gọi</span>
        </button>
        {stdinOpen ? (
          <>
            <label htmlFor="py-stdin" className="sr-only">
              Dữ liệu nhập cho input()
            </label>
            <textarea
              id="py-stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value.slice(0, 20000))}
              rows={3}
              spellCheck={false}
              placeholder={"An\n2004"}
              className="block w-full resize-y border-0 bg-[#161b22] px-3 py-2 font-mono text-[12.5px] text-[#e6edf3] outline-none placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60"
            />
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <iframe
        key={frameKey}
        ref={frame}
        title="Khung chạy Python (cách ly)"
        src="/api/sandbox/python"
        // KHÔNG allow-same-origin: origin opaque → code Python không đọc cookie/localStorage, không gọi API của site
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="hidden"
      />
      {/* ---- Thanh công cụ ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} size="sm" disabled={status === "failed"} pending={running}>
          <IconPlay size={14} /> Chạy <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-[11px] sm:inline">Ctrl+Enter</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={() => stop()} disabled={!running}>
          Dừng
        </Button>
        <label className="sr-only" htmlFor="py-example">
          Mở ví dụ
        </label>
        <select id="py-example" className="h-9 max-w-[15rem] rounded-full border border-line-strong bg-surface px-3 text-sm" value="" onChange={(e) => openExample(e.target.value)}>
          <option value="" disabled>
            Mở ví dụ…
          </option>
          {PY_EXAMPLES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="py-challenge">
          Thử thách Python
        </label>
        <select
          id="py-challenge"
          className="h-9 max-w-[15rem] rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-800"
          value={challenge?.id ?? ""}
          onChange={(e) => openChallenge(PYTHON_CHALLENGES.find((c) => c.id === e.target.value) ?? null)}
        >
          <option value="">
            🎯 Thử thách ({PYTHON_CHALLENGES.filter((c) => done[`py:${c.id}`]).length}/{PYTHON_CHALLENGES.length})
          </option>
          {PYTHON_CHALLENGES.map((c) => (
            <option key={c.id} value={c.id}>
              {done[`py:${c.id}`] ? "✓ " : ""}
              {c.title} · {c.level}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SnippetsMenu
            kind="python"
            signedIn={signedIn}
            loginNext="/playground/python"
            current={current}
            setCurrent={setCurrent}
            getFiles={() => ({ py: code, stdin })}
            onOpen={(s) => {
              openChallenge(null);
              setCode(s.files.py ?? "");
              setStdin(s.files.stdin ?? "");
              setStdinOpen(Boolean(s.files.stdin));
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${location.origin}/playground/python#code=${encodeShare({ py: code, stdin })}`);
                toast({ tone: "success", message: "Đã chép link chia sẻ (code nằm trong link, không lưu trên server)." });
              } catch {
                toast({ tone: "error", message: "Trình duyệt chặn sao chép." });
              }
            }}
          >
            <IconLink size={14} /> Chia sẻ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadText(`${current?.title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "main"}.py`, code, "text/x-python")}>
            Tải .py
          </Button>
        </div>
      </div>

      {/* ---- Thử thách ---- */}
      {challenge ? (
        <section aria-label="Thử thách" className="rounded-[var(--radius-lg)] border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Python</Badge>
            <Badge>{challenge.level}</Badge>
            <h2 className="font-display text-lg font-bold text-ink">{challenge.title}</h2>
            {done[`py:${challenge.id}`] ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-700">
                <IconCheck size={15} /> Đã hoàn thành
              </span>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" onClick={() => start(code, stdin, challenge.tests)} disabled={status === "failed" || running}>
                Kiểm tra
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowHint((h) => !h)}>
                {showHint ? "Ẩn gợi ý" : "Gợi ý"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setCode(challenge.starter), setResults(null))}>
                <IconRepeat size={14} /> Làm lại
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openChallenge(null)}>
                Thoát
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink">
            {challenge.description.split(/(`[^`]+`)/g).map((p, i) =>
              p.startsWith("`") ? (
                <code key={i} className="rounded bg-surface px-1.5 font-mono text-[0.9em] text-brand-800">
                  {p.slice(1, -1)}
                </code>
              ) : (
                p
              ),
            )}
          </p>
          {showHint ? <p className="mt-2 rounded-[var(--radius-sm)] border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">💡 {challenge.hint}</p> : null}
          {results ? (
            <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
              {aborted ? <li className="text-danger-700">✗ Code bị lỗi nên chưa chấm được — xem lỗi ở khung Đầu ra.</li> : results.length === 0 ? <li className="text-ink-faint">Đang kiểm tra…</li> : null}
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
        <SplitPane key={narrow ? "column" : "row"} direction={narrow ? "column" : "row"} storageKey={`tuhoc:py:split:${narrow ? "column" : "row"}`} initial={narrow ? 50 : 55} first={editorPane} second={consolePane} />
      </div>
      <p className="text-xs text-ink-faint">
        Python 3 (Pyodide) chạy ngay trong trình duyệt, trong khung cách ly: không truy cập mạng, không đọc được tài khoản của trang. Gói numpy, pandas, matplotlib… tự tải khi bạn import. Chương trình chạy quá {LIMIT_RUN_S} giây sẽ tự dừng.
      </p>
    </div>
  );
}
