"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconPlay, IconRepeat } from "@/components/icons";
import { Button } from "@/components/ui";

/** Dữ liệu mẫu: chính mô hình của nền tảng học (khóa, bài, học viên, đăng ký) để câu truy vấn có ý nghĩa. */
const SCHEMA = `CREATE TABLE courses (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, level TEXT CHECK (level IN ('beginner','intermediate','advanced')));
CREATE TABLE lessons (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id), title TEXT NOT NULL, minutes INTEGER NOT NULL);
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE enrollments (student_id INTEGER REFERENCES students(id), course_id INTEGER REFERENCES courses(id), progress INTEGER DEFAULT 0, PRIMARY KEY (student_id, course_id));
INSERT INTO courses VALUES (1,'nextjs-co-ban','Next.js cơ bản cho người mới','beginner'),(2,'mongodb-cho-web-developer','MongoDB cho web developer','intermediate'),(3,'sql-nhap-mon','SQL nhập môn','beginner');
INSERT INTO lessons (course_id,title,minutes) VALUES (1,'Next.js là gì',6),(1,'Tạo dự án đầu tiên',8),(1,'App Router',10),(1,'Server Component',12),(2,'Document và collection',7),(2,'Nhúng hay tham chiếu',9),(2,'Index theo truy vấn',11),(3,'SELECT cơ bản',8);
INSERT INTO students VALUES (1,'An','Hà Nội'),(2,'Bình','Đà Nẵng'),(3,'Chi','TP.HCM'),(4,'Dũng','Hà Nội'),(5,'Hà',NULL);
INSERT INTO enrollments VALUES (1,1,100),(1,2,40),(2,1,75),(3,1,10),(3,3,0),(4,2,90),(5,1,50);`;

const EXAMPLES: Record<string, string> = {
  "Số bài và tổng phút mỗi khóa": "SELECT c.title, COUNT(l.id) AS so_bai, SUM(l.minutes) AS tong_phut\nFROM courses c\nLEFT JOIN lessons l ON l.course_id = c.id\nGROUP BY c.id\nORDER BY tong_phut DESC;",
  "Học viên và tiến độ (JOIN)": "SELECT s.name, c.title, e.progress\nFROM enrollments e\nJOIN students s ON s.id = e.student_id\nJOIN courses c ON c.id = e.course_id\nORDER BY e.progress DESC;",
  "Khóa có tiến độ trung bình ≥ 50": "SELECT c.title, ROUND(AVG(e.progress), 1) AS tb\nFROM courses c JOIN enrollments e ON e.course_id = c.id\nGROUP BY c.id\nHAVING AVG(e.progress) >= 50;",
  "Học viên chưa có thành phố (NULL)": "SELECT name FROM students WHERE city IS NULL;",
};

type Result = { columns: string[]; values: (string | number | null)[][] };
type WorkerMsg = { id?: number; results?: Result[]; error?: string; ready?: boolean };
const TIMEOUT_MS = 3000;

export function SqlPlayground() {
  const [sql, setSql] = useState(Object.values(EXAMPLES)[0]!);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "failed">("loading");
  const [ms, setMs] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const pending = useRef(new Map<number, (m: WorkerMsg) => void>());

  const call = useCallback((msg: Record<string, unknown>) => {
    return new Promise<WorkerMsg>((resolve) => {
      const id = ++seq.current;
      pending.current.set(id, resolve);
      worker.current?.postMessage({ id, ...msg });
    });
  }, []);

  /** Tạo worker mới + nạp dữ liệu mẫu (dùng khi mở trang, Đặt lại, hoặc sau khi truy vấn chạy quá lâu). */
  const boot = useCallback(async () => {
    worker.current?.terminate();
    pending.current.clear();
    setStatus("loading");
    setMs(null);
    const w = new Worker("/vendor/sqljs/worker.sql-wasm.js");
    w.onmessage = (ev: MessageEvent<WorkerMsg>) => {
      const cb = ev.data?.id !== undefined ? pending.current.get(ev.data.id) : undefined;
      if (cb) {
        pending.current.delete(ev.data.id!);
        cb(ev.data);
      }
    };
    w.onerror = () => setStatus("failed");
    worker.current = w;
    const opened = await call({ action: "open" });
    if (opened.error) return setStatus("failed");
    const seeded = await call({ action: "exec", sql: SCHEMA });
    setStatus(seeded.error ? "failed" : "ready");
  }, [call]);

  useEffect(() => {
    // Khởi tạo Web Worker (hệ thống bên ngoài React) khi mở trang; boot cập nhật trạng thái tải.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void boot();
    return () => worker.current?.terminate();
  }, [boot]);

  async function run() {
    if (status !== "ready") return;
    setStatus("running");
    setError(null);
    const t0 = performance.now();
    let timedOut = false;
    const timer = setTimeout(() => {
      // Truy vấn chạy quá lâu (vd CTE đệ quy vô hạn): hủy worker, tạo lại DB mẫu.
      timedOut = true;
      setError(`Truy vấn chạy quá ${TIMEOUT_MS / 1000} giây nên đã bị dừng. Cơ sở dữ liệu mẫu được tạo lại.`);
      setResults(null);
      void boot();
    }, TIMEOUT_MS);
    const r = await call({ action: "exec", sql });
    clearTimeout(timer);
    if (timedOut) return;
    setMs(Math.round(performance.now() - t0));
    if (r.error) {
      setError(r.error);
      setResults(null);
    } else setResults(r.results ?? []);
    setStatus("ready");
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void run();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} pending={status === "running"} disabled={status !== "ready" && status !== "running"}>
          <IconPlay size={16} /> Chạy <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">Ctrl+Enter</kbd>
        </Button>
        <Button variant="outline" onClick={() => void boot().then(() => setResults(null))}>
          <IconRepeat size={15} /> Đặt lại dữ liệu
        </Button>
        <label htmlFor="sql-ex" className="sr-only">
          Ví dụ
        </label>
        <select
          id="sql-ex"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) setSql(EXAMPLES[e.target.value]!);
            e.target.value = "";
          }}
          className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm"
        >
          <option value="" disabled>
            Mở ví dụ…
          </option>
          {Object.keys(EXAMPLES).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-ink-faint" aria-live="polite">
          {status === "loading" ? "Đang tải SQLite (WebAssembly)…" : status === "failed" ? "Không tải được SQLite — thử tải lại trang." : ms !== null ? `Xong trong ${ms} ms` : "Sẵn sàng"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <label htmlFor="sql-editor" className="sr-only">
            Câu lệnh SQL
          </label>
          <textarea
            id="sql-editor"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            maxLength={20000}
            className="block h-64 w-full resize-y rounded-[var(--radius-lg)] border border-[#30363d] bg-[#0d1117] p-4 font-mono text-[13.5px] leading-6 text-[#e6edf3] caret-brand-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          />
          <details className="rounded-[var(--radius-md)] border border-line bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Cấu trúc dữ liệu mẫu</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-ink-soft">{SCHEMA.split("\n").filter((l) => l.startsWith("CREATE")).join("\n")}</pre>
          </details>
        </div>
        <div className="min-w-0 space-y-3">
          {error ? (
            <p role="alert" className="rounded-[var(--radius-md)] border border-danger-200 bg-danger-50 px-4 py-3 font-mono text-sm text-danger-700">
              {error}
            </p>
          ) : null}
          {results && results.length === 0 ? <p className="text-sm text-ink-soft">Câu lệnh chạy xong, không trả về bảng (vd INSERT/UPDATE/CREATE).</p> : null}
          {results?.map((r, i) => (
            <div key={i} className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {r.columns.map((c) => (
                      <th key={c} className="border-b border-line bg-surface-muted px-3 py-2 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.values.slice(0, 500).map((row, j) => (
                    <tr key={j} className="border-b border-line last:border-0">
                      {row.map((v, k) => (
                        <td key={k} className="px-3 py-1.5 font-mono text-[13px]">
                          {v === null ? <span className="text-ink-faint">NULL</span> : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line px-3 py-1.5 text-xs text-ink-faint">{r.values.length} dòng{r.values.length > 500 ? " (hiển thị 500)" : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
