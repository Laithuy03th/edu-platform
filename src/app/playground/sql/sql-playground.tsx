"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/code-editor";
import { IconCheck, IconLink, IconPlay, IconRepeat, IconSparkle } from "@/components/icons";
import { useToast } from "@/components/overlays";
import { Badge, Button } from "@/components/ui";
import { decodeShare, encodeShare, MAX_CHARS } from "@/lib/playground-share";
import { SQL_CHALLENGES, type SqlChallenge } from "../challenges";
import { DATASET_IDS, DATASETS, isDatasetId, type DatasetId } from "../sql-datasets";
import { downloadBlob, downloadText, SnippetsMenu, SplitPane, toCsv, useChallengeProgress, useIsNarrow } from "../shared";

type Cell = string | number | null;
type Statement = { sql: string; columns: string[]; values: Cell[][]; total: number; truncated: boolean; changes: number };
type TableInfo = { name: string; type: "table" | "view"; rows: number | null; columns: { name: string; type: string; pk: boolean; notnull: boolean }[] };
type Reply = { id?: number; error?: string; ok?: boolean; version?: string; statements?: Statement[]; errorIndex?: number; tables?: TableInfo[]; buffer?: Uint8Array };
type Source = { kind: "dataset"; id: DatasetId } | { kind: "file"; name: string; buffer: ArrayBuffer };
type Output = { statements: Statement[]; error: string | null; errorIndex: number; ms: number; label?: string };
type HistoryItem = { sql: string; at: number; source: string; ok: boolean };
type Check = { pass: boolean; message: string };

const TIMEOUT_MS = 4000;
const MAX_ROWS = 1000;
const MAX_FILE = 50 * 1024 * 1024;
const STORE = "tuhoc:sql:v1";
const HISTORY = "tuhoc:sql:history:v1";
const WORKER_URL = "/vendor/sqljs/tuhoc-sql-worker.js";

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
const lastTable = (s: Statement[]) => [...s].reverse().find((x) => x.columns.length > 0) ?? null;
const sourceLabel = (s: Source) => (s.kind === "dataset" ? DATASETS[s.id].label : `Tệp: ${s.name}`);

/** So khớp theo GIÁ TRỊ và vị trí cột (bí danh cột tùy ý); số thực làm tròn 6 chữ số để 2.0 = 2. */
function compareResult(expected: Statement, actual: Statement | null, ordered: boolean): Check {
  if (!actual) return { pass: false, message: "Câu lệnh chưa trả về bảng kết quả nào — cần một câu SELECT." };
  if (actual.columns.length !== expected.columns.length) return { pass: false, message: `Cần ${expected.columns.length} cột, kết quả của bạn có ${actual.columns.length} cột.` };
  if (actual.total !== expected.total) return { pass: false, message: `Cần ${expected.total} dòng, kết quả của bạn có ${actual.total} dòng.` };
  const key = (r: Cell[]) => JSON.stringify(r.map((v) => (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v)));
  const a = actual.values.map(key);
  const e = expected.values.map(key);
  const show = (k: string) => (JSON.parse(k) as Cell[]).map((v) => (v === null ? "NULL" : String(v))).join(" | ");
  const sa = [...a].sort();
  const se = [...e].sort();
  const firstDiff = se.findIndex((k, i) => k !== sa[i]);
  if (firstDiff >= 0) {
    const missing = se.find((k) => !sa.includes(k));
    return { pass: false, message: missing ? `Còn thiếu (hoặc sai) dòng: ${show(missing)}` : "Giá trị một số dòng chưa đúng." };
  }
  if (ordered) {
    const i = e.findIndex((k, j) => k !== a[j]);
    if (i >= 0) return { pass: false, message: `Đủ dữ liệu nhưng thứ tự chưa đúng (dòng ${i + 1} phải là: ${show(e[i]!)}) — đề yêu cầu sắp xếp.` };
  }
  return { pass: true, message: "Chính xác! Kết quả khớp hoàn toàn." };
}

/** Diễn giải thông báo lỗi SQLite (tiếng Anh) thành gợi ý tiếng Việt cho người mới. */
function explainError(msg: string) {
  const m = (re: RegExp) => msg.match(re);
  let r: RegExpMatchArray | null;
  if ((r = m(/no such table: (\S+)/))) return `Không có bảng “${r[1]}” — xem danh sách bảng ở khung bên trái (tên bảng phân biệt đúng chính tả).`;
  if ((r = m(/no such column: (\S+)/))) return `Không có cột “${r[1]}” — kiểm tra tên cột hoặc bí danh bảng (vd c.title).`;
  if ((r = m(/ambiguous column name: (\S+)/))) return `Tên cột “${r[1]}” có ở nhiều bảng — ghi rõ bảng, vd c.${r[1]!.split(".").pop()}.`;
  if ((r = m(/near "([^"]*)": syntax error/))) return `Sai cú pháp gần “${r[1]}” — kiểm tra dấu phẩy, ngoặc, thứ tự mệnh đề (SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT).`;
  if (/incomplete input/.test(msg)) return "Câu lệnh chưa kết thúc — thiếu phần cuối hoặc thiếu dấu ngoặc đóng.";
  if (/FOREIGN KEY constraint failed/.test(msg)) return "Vi phạm khóa ngoại: dòng này đang được bảng khác tham chiếu (hoặc tham chiếu tới id không tồn tại).";
  if ((r = m(/UNIQUE constraint failed: (\S+)/))) return `Trùng giá trị ở cột duy nhất ${r[1]}.`;
  if ((r = m(/NOT NULL constraint failed: (\S+)/))) return `Cột ${r[1]} không được để trống (NULL).`;
  if (/CHECK constraint failed/.test(msg)) return "Giá trị không thỏa điều kiện CHECK của bảng.";
  if (/misuse of aggregate/.test(msg)) return "Dùng hàm gộp (COUNT/SUM/AVG…) sai chỗ — điều kiện trên nhóm phải đặt ở HAVING, không phải WHERE.";
  if (/already exists/.test(msg)) return "Bảng/đối tượng đã tồn tại — dùng CREATE TABLE IF NOT EXISTS hoặc bấm “Đặt lại dữ liệu”.";
  return null;
}

function fmtCell(v: Cell) {
  return v === null ? "NULL" : String(v);
}

function ResultBlock({ st, index }: { st: Statement; index: number }) {
  const toast = useToast();
  if (!st.columns.length) {
    return (
      <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-800">
        <IconCheck size={15} className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          <code className="break-all font-mono text-[12.5px]">{st.sql.length > 90 ? `${st.sql.slice(0, 90)}…` : st.sql}</code>
          <span className="text-success-700"> — {st.changes ? `${st.changes} dòng bị thay đổi` : "đã chạy xong"}</span>
        </span>
      </p>
    );
  }
  return (
    <section aria-label={`Kết quả ${index}`} className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-3 py-1.5 text-xs">
        <span className="font-semibold text-ink">Kết quả {index}</span>
        <span className="text-ink-faint">
          {st.total} dòng{st.truncated ? ` (hiện ${st.values.length} dòng đầu)` : ""}
        </span>
        <span className="ml-auto flex gap-1">
          <button type="button" className="rounded px-2 py-0.5 font-semibold text-ink-soft hover:bg-brand-50" onClick={() => downloadText(`ket-qua-${index}.csv`, toCsv(st.columns, st.values), "text/csv")}>
            Tải CSV
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 font-semibold text-ink-soft hover:bg-brand-50"
            onClick={async () => {
              const tsv = [st.columns, ...st.values.map((r) => r.map(fmtCell))].map((r) => r.join("\t")).join("\n");
              try {
                await navigator.clipboard.writeText(tsv);
                toast({ tone: "success", message: "Đã chép bảng — dán thẳng vào Excel/Google Sheets." });
              } catch {
                toast({ tone: "error", message: "Trình duyệt chặn sao chép." });
              }
            }}
          >
            Sao chép
          </button>
        </span>
      </header>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr>
              <th scope="col" className="w-10 border-b border-line px-2 py-1.5 text-right font-mono text-[11px] font-normal text-ink-faint">
                #
              </th>
              {st.columns.map((c, i) => (
                <th key={i} scope="col" className="whitespace-nowrap border-b border-line px-3 py-1.5 font-semibold text-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {st.values.map((row, j) => (
              <tr key={j} className="border-b border-line/70 last:border-0 even:bg-surface-muted/40 hover:bg-brand-50/50">
                <td className="px-2 py-1 text-right font-mono text-[11px] text-ink-faint">{j + 1}</td>
                {row.map((v, k) => (
                  <td key={k} title={typeof v === "string" && v.length > 40 ? v : undefined} className={`max-w-[22rem] truncate px-3 py-1 font-mono text-[12.5px] ${v === null ? "italic text-ink-faint" : typeof v === "number" ? "text-right tabular-nums text-[#0550ae] dark:text-[#79c0ff]" : "text-ink"}`}>
                    {fmtCell(v)}
                  </td>
                ))}
              </tr>
            ))}
            {st.values.length === 0 ? (
              <tr>
                <td colSpan={st.columns.length + 1} className="px-3 py-3 text-center text-sm text-ink-faint">
                  Không có dòng nào thỏa điều kiện.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchemaPanel({ tables, onPreview, onInsert }: { tables: TableInfo[]; onPreview(name: string): void; onInsert(text: string): void }) {
  return (
    <aside aria-label="Cấu trúc dữ liệu" className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0a0d12] text-[12.5px] text-white/80">
      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Bảng &amp; view ({tables.length})</p>
      <ul className="min-h-0 flex-1 overflow-auto pb-3">
        {tables.map((t, i) => (
          <li key={t.name}>
            <details open={i < 4}>
              <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-1 hover:bg-white/5">
                <span aria-hidden className={`font-mono text-[10px] ${t.type === "view" ? "text-[#d2a8ff]" : "text-[#7ee787]"}`}>
                  {t.type === "view" ? "VIEW" : "TBL"}
                </span>
                <span className="min-w-0 truncate font-mono font-semibold text-white">{t.name}</span>
                {t.rows !== null ? <span className="ml-auto text-[11px] text-white/40">{t.rows}</span> : null}
              </summary>
              <ul className="pb-1">
                {t.columns.map((c) => (
                  <li key={c.name}>
                    <button type="button" title={`Chèn “${c.name}” vào editor`} onClick={() => onInsert(c.name)} className="flex w-full items-center gap-1.5 py-0.5 pl-7 pr-3 text-left hover:bg-white/5">
                      <span className="min-w-0 truncate font-mono">{c.name}</span>
                      {c.pk ? <span className="rounded bg-[#bb8009]/30 px-1 text-[9.5px] font-bold text-[#e3b341]">PK</span> : null}
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] uppercase text-white/35">{c.type}</span>
                    </button>
                  </li>
                ))}
                <li className="flex gap-3 py-1 pl-7 text-[11.5px]">
                  <button type="button" onClick={() => onPreview(t.name)} className="font-semibold text-brand-300 hover:underline">
                    Xem dữ liệu
                  </button>
                  <button type="button" onClick={() => onInsert(t.name)} className="text-white/50 hover:text-white hover:underline">
                    Chèn tên
                  </button>
                </li>
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function SqlPlayground({ signedIn, initialSnippet }: { signedIn: boolean; initialSnippet: { id: string; title: string; files: Record<string, string> } | null }) {
  const toast = useToast();
  const narrow = useIsNarrow();
  const [sql, setSql] = useState(DATASETS["hoc-tap"].examples[0]!.sql);
  const [source, setSource] = useState<Source>({ kind: "dataset", id: "hoc-tap" });
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "failed">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [out, setOut] = useState<Output | null>(null);
  const [pane, setPane] = useState<"result" | "history">("result");
  const [hist, setHist] = useState<HistoryItem[]>([]);
  const [challenge, setChallenge] = useState<SqlChallenge | null>(null);
  const [expected, setExpected] = useState<Statement | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [current, setCurrent] = useState<{ id: string; title: string } | null>(initialSnippet ? { id: initialSnippet.id, title: initialSnippet.title } : null);
  const [formatting, setFormatting] = useState(false);
  const { done, mark } = useChallengeProgress();

  const editor = useRef<CodeEditorHandle | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const fileMenu = useRef<HTMLDetailsElement | null>(null);
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const pending = useRef(new Map<number, (r: Reply) => void>());
  const sourceRef = useRef<Source>(source);
  const loaded = useRef(false);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  /** Hủy worker (truy vấn treo / rời trang): mọi yêu cầu đang chờ nhận lỗi để không treo giao diện. */
  const kill = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    for (const cb of pending.current.values()) cb({ error: "terminated" });
    pending.current.clear();
  }, []);

  const call = useCallback((msg: Record<string, unknown>, transfer: Transferable[] = []) => {
    return new Promise<Reply>((resolve) => {
      if (!worker.current) {
        const w = new Worker(WORKER_URL);
        w.onmessage = (ev: MessageEvent<Reply>) => {
          const cb = ev.data?.id !== undefined ? pending.current.get(ev.data.id) : undefined;
          if (cb) {
            pending.current.delete(ev.data.id!);
            cb(ev.data);
          }
        };
        w.onerror = (e) => {
          e.preventDefault();
          for (const cb of pending.current.values()) cb({ error: "Không tải được SQLite (WebAssembly)." });
          pending.current.clear();
        };
        worker.current = w;
      }
      const id = ++seq.current;
      pending.current.set(id, resolve);
      worker.current.postMessage({ id, ...msg }, transfer);
    });
  }, []);

  const refreshSchema = useCallback(async () => {
    const r = await call({ action: "schema" });
    if (r.tables) setTables(r.tables);
  }, [call]);

  /** Nạp nguồn dữ liệu MỚI (bộ mẫu hoặc tệp .sqlite của người học) — mọi thay đổi trước đó bị bỏ. */
  const load = useCallback(
    async (src: Source) => {
      setStatus("loading");
      setLoadError(null);
      let r: Reply;
      if (src.kind === "dataset") r = await call({ action: "open", seed: DATASETS[src.id].sql, fk: true });
      else {
        const copy = src.buffer.slice(0);
        r = await call({ action: "open", buffer: copy }, [copy]);
      }
      if (r.error === "terminated") return false; // worker bị hủy giữa chừng (rời trang / lượt nạp mới thay thế)
      if (r.error) {
        setStatus("failed");
        setLoadError(r.error);
        return false;
      }
      setVersion(r.version ?? "");
      await refreshSchema();
      setStatus("ready");
      return true;
    },
    [call, refreshSchema],
  );

  const execute = useCallback(
    async (text: string, opts: { record: boolean; label?: string }): Promise<Output | null> => {
      if (!text.trim()) return null;
      setStatus("running");
      setPane("result");
      const t0 = performance.now();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        kill();
      }, TIMEOUT_MS);
      const r = await call({ action: "run", sql: text, maxRows: MAX_ROWS });
      clearTimeout(timer);
      if (timedOut) {
        const o: Output = { statements: [], error: `Truy vấn chạy quá ${TIMEOUT_MS / 1000} giây nên đã bị dừng (vd CTE đệ quy không có điểm dừng, JOIN thiếu điều kiện). Dữ liệu được nạp lại từ đầu.`, errorIndex: 0, ms: TIMEOUT_MS, label: opts.label };
        setOut(o);
        await load(sourceRef.current);
        return o;
      }
      const o: Output = { statements: r.statements ?? [], error: r.error ?? null, errorIndex: r.errorIndex ?? 0, ms: Math.round(performance.now() - t0), label: opts.label };
      setOut(o);
      if (opts.record) {
        setHist((h) => [{ sql: text, at: Date.now(), source: sourceLabel(sourceRef.current), ok: !r.error }, ...h.filter((x) => x.sql !== text)].slice(0, 30));
      }
      await refreshSchema();
      setStatus("ready");
      return o;
    },
    [call, kill, load, refreshSchema],
  );

  const run = useCallback(() => {
    if (status !== "ready") return;
    const sel = editor.current?.getSelection().trim() ?? "";
    void execute(sel || sql, { record: true, label: sel ? "Chạy đoạn đã chọn" : undefined });
  }, [execute, sql, status]);

  const switchSource = useCallback(
    async (src: Source) => {
      setSource(src);
      setOut(null);
      return load(src);
    },
    [load],
  );

  const openChallenge = useCallback(
    async (c: SqlChallenge | null) => {
      setChallenge(c);
      setCheck(null);
      setShowHint(false);
      setExpected(null);
      if (!c) return;
      setSql(c.starter);
      setCurrent(null);
      if (await switchSource({ kind: "dataset", id: c.dataset })) {
        const r = await call({ action: "run", sql: c.solution, maxRows: MAX_ROWS });
        setExpected(lastTable(r.statements ?? []));
      }
    },
    [call, switchSource],
  );

  async function checkChallenge() {
    if (!challenge || status !== "ready") return;
    // Nạp lại dữ liệu sạch: câu lệnh sửa/xóa dữ liệu chạy trước đó không làm lệch kết quả chấm
    if (!(await switchSource({ kind: "dataset", id: challenge.dataset }))) return;
    let exp = expected;
    if (!exp) {
      const r = await call({ action: "run", sql: challenge.solution, maxRows: MAX_ROWS });
      exp = lastTable(r.statements ?? []);
      setExpected(exp);
    }
    const o = await execute(sql, { record: true, label: "Kiểm tra thử thách" });
    if (!o || !exp) return;
    const c = o.error ? { pass: false, message: "Câu lệnh bị lỗi — xem thông báo ở khung kết quả." } : compareResult(exp, lastTable(o.statements), challenge.ordered);
    setCheck(c);
    if (c.pass) {
      mark(`sql:${challenge.id}`);
      toast({ tone: "success", message: `Hoàn thành thử thách “${challenge.title}”!` });
    }
  }

  // Nạp ban đầu: bản lưu (?s=) > link chia sẻ (#code=) > ?thu-thach= > bản nháp máy này > ví dụ mặc định
  /* eslint-disable react-hooks/set-state-in-effect -- đọc URL/localStorage sau khi mount (không có ở server) */
  useEffect(() => {
    let text = DATASETS["hoc-tap"].examples[0]!.sql;
    let ds: DatasetId = "hoc-tap";
    const params = new URLSearchParams(location.search);
    const m = location.hash.match(/#code=([A-Za-z0-9_-]+)/);
    const ch = SQL_CHALLENGES.find((c) => c.id === params.get("thu-thach"));
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY) ?? "[]");
      if (Array.isArray(h)) setHist(h.filter((x) => x && typeof x.sql === "string").slice(0, 30));
    } catch {
      /* bỏ qua */
    }
    if (window.innerWidth < 1024) setSchemaOpen(false);
    loaded.current = true;
    if (initialSnippet) {
      text = initialSnippet.files.sql ?? "";
      if (isDatasetId(initialSnippet.files.dataset)) ds = initialSnippet.files.dataset;
    } else if (m) {
      const shared = decodeShare(m[1]!, ["sql", "dataset"] as const);
      if (shared) {
        text = shared.sql;
        if (isDatasetId(shared.dataset)) ds = shared.dataset;
        history.replaceState(null, "", location.pathname);
      }
    } else if (ch) {
      void openChallenge(ch);
      return () => kill();
    } else {
      try {
        const d = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (d && typeof d.sql === "string") {
          text = d.sql;
          if (isDatasetId(d.dataset)) ds = d.dataset;
        }
      } catch {
        /* bản nháp hỏng → bỏ qua */
      }
    }
    setSql(text);
    void switchSource({ kind: "dataset", id: ds });
    return () => kill();
  }, [initialSnippet, kill, openChallenge, switchSource]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Tự lưu bản nháp + lịch sử trên máy này
  useEffect(() => {
    if (!loaded.current || challenge) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ sql, dataset: source.kind === "dataset" ? source.id : "hoc-tap" }));
      } catch {
        /* hết dung lượng / chế độ riêng tư */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [sql, source, challenge]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(HISTORY, JSON.stringify(hist));
    } catch {
      /* bỏ qua */
    }
  }, [hist]);

  const schema = useMemo(() => Object.fromEntries(tables.map((t) => [t.name, t.columns.map((c) => c.name)])), [tables]);
  const examples = source.kind === "dataset" ? DATASETS[source.id].examples : [];
  const doneCount = SQL_CHALLENGES.filter((c) => done[`sql:${c.id}`]).length;
  const busy = status === "loading" || status === "running";

  const editorPane = (
    <div className="flex h-full min-h-0 flex-col bg-[#0d1117]">
      <div className="flex items-center gap-2 border-b border-white/10 px-2">
        <button type="button" aria-pressed={schemaOpen} onClick={() => setSchemaOpen((o) => !o)} className={`rounded px-2 py-1 text-xs font-semibold ${schemaOpen ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}>
          ▦ Bảng
        </button>
        <span className="relative px-2 py-2.5 font-mono text-xs font-semibold text-white">
          query.sql
          <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-400" />
        </span>
        <span className="ml-auto hidden truncate pr-1 text-[11px] text-white/40 lg:block">Ctrl+Enter chạy · bôi đen để chạy riêng một đoạn · Ctrl+Space gợi ý</span>
      </div>
      <div className="flex min-h-0 flex-1">
        {schemaOpen ? <SchemaPanel tables={tables} onInsert={(t) => editor.current?.insertText(t)} onPreview={(name) => void execute(`SELECT * FROM ${q(name)} LIMIT 100;`, { record: false, label: `Dữ liệu bảng ${name} (100 dòng đầu)` })} /> : null}
        <CodeEditor
          ref={editor}
          docKey="sql"
          value={sql}
          language="sql"
          sqlSchema={schema}
          onChange={(v) => setSql(v.slice(0, MAX_CHARS))}
          onRun={run}
          onSave={() => window.dispatchEvent(new Event("playground:save"))}
          ariaLabel="Câu lệnh SQL"
          className="min-h-[240px] min-w-0 flex-1"
        />
      </div>
    </div>
  );

  // Số thứ tự "Kết quả N" chỉ đếm câu lệnh trả về bảng
  const tableIndex: number[] = [];
  let tableCount = 0;
  for (const st of out?.statements ?? []) tableIndex.push(st.columns.length ? ++tableCount : 0);
  const resultPane = (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex items-center gap-1 border-b border-line bg-surface px-2 py-1 text-xs font-semibold text-ink-soft">
        <div role="tablist" aria-label="Khung kết quả" className="flex gap-1">
          <button role="tab" aria-selected={pane === "result"} onClick={() => setPane("result")} className={`rounded px-2.5 py-1.5 ${pane === "result" ? "bg-brand-100 text-brand-800" : "hover:bg-brand-50"}`}>
            Kết quả{tableCount > 1 ? ` (${tableCount})` : ""}
          </button>
          <button role="tab" aria-selected={pane === "history"} onClick={() => setPane("history")} className={`rounded px-2.5 py-1.5 ${pane === "history" ? "bg-brand-100 text-brand-800" : "hover:bg-brand-50"}`}>
            Lịch sử ({hist.length})
          </button>
        </div>
        <span className="ml-auto truncate pl-2 font-normal text-ink-faint" aria-live="polite">
          {status === "loading" ? "Đang tải SQLite (WebAssembly)…" : status === "failed" ? <span className="text-danger-700">Không tải được SQLite</span> : status === "running" ? "Đang chạy…" : `SQLite ${version}${out ? ` · ${out.ms} ms` : ""}`}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {pane === "history" ? (
          hist.length === 0 ? (
            <p className="text-sm text-ink-soft">Chưa có truy vấn nào. Các câu lệnh bạn chạy sẽ nằm ở đây (chỉ lưu trên máy này).</p>
          ) : (
            <>
              <div className="flex justify-end">
                <button type="button" className="text-xs font-semibold text-ink-faint hover:text-danger-700" onClick={() => setHist([])}>
                  Xóa lịch sử
                </button>
              </div>
              <ul className="space-y-2">
                {hist.map((h) => (
                  <li key={h.at} className="rounded-[var(--radius-md)] border border-line bg-surface p-2.5">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-faint">
                      <span className={h.ok ? "text-success-700" : "text-danger-700"}>{h.ok ? "✓" : "✗"}</span>
                      <span>{new Date(h.at).toLocaleString("vi-VN")}</span>
                      <span className="truncate">· {h.source}</span>
                      <span className="ml-auto flex gap-1">
                        <button type="button" className="rounded px-2 py-0.5 font-semibold text-ink-soft hover:bg-brand-50" onClick={() => setSql(h.sql)}>
                          Mở
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50"
                          onClick={() => {
                            setSql(h.sql);
                            void execute(h.sql, { record: true });
                          }}
                        >
                          Chạy
                        </button>
                      </span>
                    </div>
                    <pre className="max-h-24 overflow-hidden whitespace-pre-wrap break-words font-mono text-[12px] text-ink">{h.sql}</pre>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : status === "failed" ? (
          <div role="alert" className="rounded-[var(--radius-md)] border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">
            <p className="font-semibold">Không mở được cơ sở dữ liệu.</p>
            {loadError && loadError !== "terminated" ? <p className="mt-1 font-mono text-xs">{loadError}</p> : null}
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void switchSource({ kind: "dataset", id: "hoc-tap" })}>
              Thử lại với dữ liệu mẫu
            </Button>
          </div>
        ) : !out ? (
          <div className="grid h-full place-items-center text-center text-sm text-ink-soft">
            <div>
              <p className="font-display text-base font-bold text-ink">Sẵn sàng truy vấn</p>
              <p className="mt-1">Bấm “Chạy” hoặc Ctrl+Enter. Bôi đen một đoạn để chạy riêng đoạn đó.</p>
              <p className="mt-1 text-ink-faint">Bấm tên cột ở khung “Bảng” để chèn vào câu lệnh.</p>
            </div>
          </div>
        ) : (
          <>
            {out.label ? <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{out.label}</p> : null}
            {out.statements.map((st, i) => (
              <ResultBlock key={`${out.ms}-${i}`} st={st} index={tableIndex[i]!} />
            ))}
            {out.error ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
                <p className="font-semibold">{out.statements.length || out.errorIndex ? `Lỗi ở câu lệnh thứ ${out.errorIndex + 1}` : "Lỗi"}</p>
                <p className="mt-1 break-words font-mono text-[12.5px]">{out.error}</p>
                {explainError(out.error) ? <p className="mt-2 text-danger-700">💡 {explainError(out.error)}</p> : null}
              </div>
            ) : out.statements.length === 0 ? (
              <p className="text-sm text-ink-soft">Không có câu lệnh nào được chạy (chỉ có chú thích?).</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* ---- Thanh công cụ ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} size="sm" disabled={status !== "ready"} pending={status === "running"}>
          <IconPlay size={14} /> Chạy <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-[11px] sm:inline">Ctrl+Enter</kbd>
        </Button>
        <label className="sr-only" htmlFor="sql-dataset">
          Bộ dữ liệu
        </label>
        <select
          id="sql-dataset"
          className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm"
          value={source.kind === "dataset" ? source.id : "file"}
          disabled={busy}
          onChange={(e) => {
            if (!isDatasetId(e.target.value)) return;
            const next = e.target.value;
            const prevExamples = source.kind === "dataset" ? DATASETS[source.id].examples.map((x) => x.sql) : [];
            void openChallenge(null);
            // Câu lệnh đang là ví dụ của bộ cũ (hoặc trống) → đổi sang ví dụ của bộ mới; code tự viết thì giữ nguyên
            if (!sql.trim() || prevExamples.includes(sql)) setSql(DATASETS[next].examples[0]!.sql);
            void switchSource({ kind: "dataset", id: next });
          }}
        >
          {DATASET_IDS.map((id) => (
            <option key={id} value={id}>
              {DATASETS[id].label}
            </option>
          ))}
          {source.kind === "file" ? <option value="file">Tệp: {source.name}</option> : null}
        </select>
        <label className="sr-only" htmlFor="sql-example">
          Mở ví dụ
        </label>
        <select
          id="sql-example"
          className="h-9 max-w-[13rem] rounded-full border border-line-strong bg-surface px-3 text-sm"
          value=""
          disabled={!examples.length}
          onChange={(e) => {
            const ex = examples.find((x) => x.label === e.target.value);
            if (ex) {
              void openChallenge(null);
              setSql(ex.sql);
              setCurrent(null);
            }
          }}
        >
          <option value="" disabled>
            Mở ví dụ…
          </option>
          {examples.map((x) => (
            <option key={x.label} value={x.label}>
              {x.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sql-challenge">
          Thử thách SQL
        </label>
        <select
          id="sql-challenge"
          className="h-9 max-w-[16rem] rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-800"
          value={challenge?.id ?? ""}
          disabled={busy}
          onChange={(e) => void openChallenge(SQL_CHALLENGES.find((c) => c.id === e.target.value) ?? null)}
        >
          <option value="">
            🎯 Thử thách ({doneCount}/{SQL_CHALLENGES.length})
          </option>
          {DATASET_IDS.map((id) => (
            <optgroup key={id} label={DATASETS[id].label}>
              {SQL_CHALLENGES.filter((c) => c.dataset === id).map((c) => (
                <option key={c.id} value={c.id}>
                  {done[`sql:${c.id}`] ? "✓ " : ""}
                  {c.title} · {c.level}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          pending={formatting}
          onClick={async () => {
            if (!sql.trim()) return;
            setFormatting(true);
            try {
              const { format } = await import("sql-formatter");
              setSql(format(sql, { language: "sqlite", keywordCase: "upper", tabWidth: 2, linesBetweenQueries: 1 }) + "\n");
            } catch (err) {
              toast({ tone: "error", message: `Không định dạng được: ${String((err as Error).message).split("\n")[0]}` });
            }
            setFormatting(false);
          }}
        >
          <IconSparkle size={14} /> Định dạng
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void switchSource(source)}>
          <IconRepeat size={14} /> Đặt lại dữ liệu
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SnippetsMenu
            kind="sql"
            signedIn={signedIn}
            loginNext="/playground/sql"
            current={current}
            setCurrent={setCurrent}
            getFiles={() => ({ sql, dataset: source.kind === "dataset" ? source.id : "hoc-tap" })}
            onOpen={(s) => {
              void openChallenge(null);
              setSql(s.files.sql ?? "");
              void switchSource({ kind: "dataset", id: isDatasetId(s.files.dataset) ? s.files.dataset : "hoc-tap" });
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${location.origin}/playground/sql#code=${encodeShare({ sql, dataset: source.kind === "dataset" ? source.id : "hoc-tap" })}`);
                toast({ tone: "success", message: "Đã chép link chia sẻ (câu lệnh nằm trong link, không lưu trên server)." });
              } catch {
                toast({ tone: "error", message: "Trình duyệt chặn sao chép." });
              }
            }}
          >
            <IconLink size={14} /> Chia sẻ
          </Button>
          <details ref={fileMenu} className="relative" onClick={(e) => (e.target as HTMLElement).closest("button") && fileMenu.current?.removeAttribute("open")}>
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-brand-50 [&::-webkit-details-marker]:hidden">Tệp ▾</summary>
            <div className="absolute right-0 z-20 mt-1 w-64 rounded-[var(--radius-md)] border border-line bg-surface p-1 text-sm shadow-lg">
              <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-brand-50" onClick={() => downloadText(`${current?.title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "truy-van"}.sql`, sql, "application/sql")}>
                Tải câu lệnh (.sql)
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left hover:bg-brand-50 disabled:opacity-50"
                disabled={status !== "ready"}
                onClick={async () => {
                  const r = await call({ action: "export" });
                  if (r.buffer) downloadBlob("tuhoc-playground.sqlite", new Blob([r.buffer as BlobPart], { type: "application/vnd.sqlite3" }));
                  else toast({ tone: "error", message: "Không xuất được cơ sở dữ liệu." });
                }}
              >
                Tải cơ sở dữ liệu (.sqlite)
              </button>
              <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-brand-50" onClick={() => fileInput.current?.click()}>
                Mở tệp .sqlite / .db của bạn…
                <span className="block text-xs text-ink-faint">Chỉ đọc trong trình duyệt, không tải lên server (≤ 50 MB)</span>
              </button>
            </div>
          </details>
          <input
            ref={fileInput}
            type="file"
            accept=".db,.sqlite,.sqlite3,.db3,application/vnd.sqlite3,application/x-sqlite3"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > MAX_FILE) return toast({ tone: "error", message: "Tệp lớn hơn 50 MB — playground chỉ mở tệp nhỏ." });
              void openChallenge(null);
              const ok = await switchSource({ kind: "file", name: f.name, buffer: await f.arrayBuffer() });
              if (ok) {
                setSql("SELECT name, type, sql\nFROM sqlite_master\nWHERE name NOT LIKE 'sqlite_%';");
                setSchemaOpen(true);
                toast({ tone: "success", message: `Đã mở “${f.name}” — dữ liệu chỉ nằm trong trình duyệt của bạn.` });
              } else {
                toast({ tone: "error", message: "Tệp không phải cơ sở dữ liệu SQLite hợp lệ." });
                void switchSource({ kind: "dataset", id: "hoc-tap" });
              }
            }}
          />
        </div>
      </div>

      {/* ---- Thử thách ---- */}
      {challenge ? (
        <section aria-label="Thử thách" className="rounded-[var(--radius-lg)] border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">SQL</Badge>
            <Badge>{challenge.level}</Badge>
            <h2 className="font-display text-lg font-bold text-ink">{challenge.title}</h2>
            {done[`sql:${challenge.id}`] ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-700">
                <IconCheck size={15} /> Đã hoàn thành
              </span>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void checkChallenge()} disabled={status !== "ready"}>
                Kiểm tra
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowHint((h) => !h)}>
                {showHint ? "Ẩn gợi ý" : "Gợi ý"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setSql(challenge.starter), setCheck(null))}>
                <IconRepeat size={14} /> Làm lại
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void openChallenge(null)}>
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
            <span className="text-ink-faint"> · Dữ liệu: {DATASETS[challenge.dataset].description}</span>
          </p>
          {showHint ? <p className="mt-2 rounded-[var(--radius-sm)] border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">💡 {challenge.hint}</p> : null}
          {check ? (
            <p role="status" className={`mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-semibold ${check.pass ? "border-success-200 bg-success-50 text-success-800" : "border-danger-200 bg-danger-50 text-danger-800"}`}>
              <span aria-hidden>{check.pass ? "✓" : "✗"}</span>
              {check.message}
            </p>
          ) : null}
          {expected ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-ink-soft hover:text-ink">
                Xem kết quả mong đợi ({expected.total} dòng, {expected.columns.length} cột{challenge.ordered ? ", đúng thứ tự" : ", thứ tự tùy ý"})
              </summary>
              <div className="mt-2 max-w-3xl">
                <ResultBlock st={{ ...expected, columns: expected.columns.map((_, i) => `cột ${i + 1}`) }} index={0} />
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      {/* ---- Vùng làm việc ---- */}
      <div className={`${narrow ? "h-[88vh]" : "h-[min(78vh,760px)]"} min-h-[520px] overflow-hidden rounded-[var(--radius-lg)] border border-line shadow-md`}>
        <SplitPane key={narrow ? "column" : "row"} direction={narrow ? "column" : "row"} storageKey={`tuhoc:sql:split:${narrow ? "column" : "row"}`} initial={narrow ? 45 : 52} first={editorPane} second={resultPane} />
      </div>
      <p className="text-xs text-ink-faint">
        SQLite chạy ngay trong trình duyệt (WebAssembly) — không có dữ liệu nào gửi lên server. Dữ liệu nằm trong bộ nhớ: “Đặt lại dữ liệu” hoặc tải lại trang là về ban đầu. Khóa ngoại được bật (PRAGMA foreign_keys = ON). Truy vấn chạy quá {TIMEOUT_MS / 1000} giây sẽ bị dừng.
      </p>
    </div>
  );
}
