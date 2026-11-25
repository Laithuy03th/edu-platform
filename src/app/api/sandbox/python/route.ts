/**
 * Playground Python: trang chạy Pyodide (CPython biên dịch sang WebAssembly) — luôn nhúng trong
 * <iframe sandbox="allow-scripts"> (KHÔNG allow-same-origin) → origin "opaque": code Python không đọc được
 * cookie/localStorage của site, không gọi được API của site bằng phiên người học (link chia sẻ độc hại vô hại).
 *
 * - Python chạy trong Web Worker (tạo từ blob trong khung cách ly, nạp Pyodide bằng import() động) → trang không đơ khi vòng lặp dài;
 *   "Dừng" = hủy worker rồi tạo lại (không cần SharedArrayBuffer/COOP-COEP).
 * - Pyodide + gói (numpy, pandas, matplotlib…) tải từ cdn.jsdelivr.net (miễn phí, trình duyệt lưu đệm) — không qua
 *   server của mình. CSP chỉ cho kết nối tới CDN đó; KHÔNG có code nào chạy trên server (đặc tả §5).
 * - Giao thức postMessage với trang cha: ready → (worker) loaded/fatal; run → stdout/stderr/system/image/test/
 *   tests-done/error/done; stop → stopped (worker mới được nạp lại).
 */
const PYODIDE_VERSION = "314.0.8";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const WORKER = String.raw`
var py = null;
var runId = "";
var outCount = 0;
var MAX_OUT = 3000;
function post(m) { m.runId = runId; self.postMessage(m); }
function out(type, text) {
  outCount++;
  if (outCount > MAX_OUT) { if (outCount === MAX_OUT + 1) post({ type: "stderr", text: "… Đầu ra quá dài nên phần sau đã bị ẩn." }); return; }
  post({ type: type, text: String(text).slice(0, 20000) });
}
function clean(msg) {
  var lines = String(msg || "").split("\n");
  var i = lines.findIndex(function (l) { return /File "(main|tests)\.py"/.test(l); });
  if (i > 0) lines = ["Traceback (most recent call last):"].concat(lines.slice(i));
  return lines.join("\n").trim();
}
function lineOf(tb) {
  var m, re = /File "main\.py", line (\d+)/g, last = null;
  while ((m = re.exec(tb))) last = Number(m[1]);
  return last;
}
var SETUP = [
  "import builtins as _b, sys as _s",
  "def _tuhoc_input(prompt=''):",
  "    _s.stdout.write(str(prompt))",
  "    line = _s.stdin.readline()",
  "    if not line:",
  "        print()",
  "        raise EOFError('EOF when reading a line')",
  "    line = line.rstrip('\\n')",
  "    print(line)",
  "    return line",
  "_b.input = _tuhoc_input",
].join("\n");
var MPL = [
  "import matplotlib as _mpl",
  "_mpl.use('Agg')",
  "import matplotlib.pyplot as _plt, io as _io, base64 as _b64, warnings as _w",
  "from _tuhoc import emit_image as _emit",
  "def _tuhoc_show(*a, **k):",
  "    for _n in _plt.get_fignums():",
  "        _f = _plt.figure(_n)",
  "        _buf = _io.BytesIO()",
  "        with _w.catch_warnings():",
  "            _w.simplefilter('ignore')  # cảnh báo nội bộ của backend Agg, không phải lỗi của người học",
  "            _f.savefig(_buf, format='png', dpi=100, bbox_inches='tight')",
  "        _emit(_b64.b64encode(_buf.getvalue()).decode())",
  "    _plt.close('all')",
  "_plt.show = _tuhoc_show",
].join("\n");
async function init() {
  try {
    // import() động trong worker thường (Pyodide 314 từ chối worker "classic" qua phép thử importScripts(data:)
    // — CSP dưới KHÔNG cho data: trong script-src nên phép thử thất bại, Pyodide coi như worker module).
    var mod = await import("__INDEX__pyodide.mjs");
    py = await mod.loadPyodide({ indexURL: "__INDEX__" });
    py.setStdout({ batched: function (s) { out("stdout", s); } });
    py.setStderr({ batched: function (s) { out("stderr", s); } });
    py.registerJsModule("_tuhoc", {
      emit_image: function (b64) { post({ type: "image", data: String(b64) }); },
      test: function (name, pass) { post({ type: "test", name: String(name), pass: Boolean(pass) }); },
    });
    py.runPython(SETUP);
    self.postMessage({ type: "loaded", version: py.version, python: py.runPython("import sys; sys.version.split()[0]") });
  } catch (e) {
    self.postMessage({ type: "fatal", message: String((e && e.message) || e) });
  }
}
async function run(d) {
  runId = String(d.runId || "");
  outCount = 0;
  var t0 = performance.now();
  var given = false;
  var stdin = String(d.stdin || "");
  py.setStdin({ stdin: function () { if (given || !stdin) return null; given = true; return stdin; }, autoEOF: true });
  var ns = py.globals.get("dict")();
  ns.set("__name__", "__main__");
  var ok = true;
  var mpl = /\bmatplotlib\b/.test(d.code);
  try {
    await py.loadPackagesFromImports(d.code, {
      messageCallback: function (m) { if (/^Loading|^Loaded/.test(m)) post({ type: "system", text: m.replace(/^Loading/, "Đang tải gói:").replace(/^Loaded/, "Đã tải gói:") }); },
      errorCallback: function (m) { post({ type: "system", text: m }); },
    });
    if (mpl) py.runPython(MPL, { globals: ns });
    post({ type: "exec-start" }); // trang cha bắt đầu tính giờ tự dừng từ đây (không tính lúc tải gói)
    await py.runPythonAsync(d.code, { globals: ns, filename: "main.py" });
    if (mpl) py.runPython("_tuhoc_show()", { globals: ns });
  } catch (e) {
    ok = false;
    var tb = clean(e && e.message);
    post({ type: "error", text: tb, line: lineOf(tb) });
  }
  if (d.tests) {
    var lines = String(d.tests).split("\n").filter(function (l) { return l.trim(); });
    if (!ok) post({ type: "tests-done", total: lines.length, aborted: true });
    else {
      try {
        py.runPython("from _tuhoc import test as _tuhoc_test\ndef kiem_tra(ten, dieu_kien):\n    _tuhoc_test(str(ten), bool(dieu_kien))", { globals: ns });
      } catch (e) { /* không xảy ra */ }
      for (var i = 0; i < lines.length; i++) {
        var nm = (lines[i].match(/kiem_tra\(\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || ("Kiểm tra " + (i + 1));
        try { py.runPython(lines[i], { globals: ns, filename: "tests.py" }); }
        catch (e) {
          var last = String((e && e.message) || e).trim().split("\n").pop();
          post({ type: "test", name: nm, pass: false, message: last });
        }
      }
      post({ type: "tests-done", total: lines.length });
    }
  }
  try { py.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()"); } catch (e) { /* bỏ qua */ }
  ns.destroy();
  post({ type: "done", ok: ok, ms: Math.round(performance.now() - t0) });
}
self.onmessage = function (ev) {
  var d = ev.data || {};
  if (d.type === "run" && py) run(d);
};
init();
`.replace(/__INDEX__/g, INDEX_URL);

const PAGE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Python sandbox</title></head><body><script>
(function () {
  var P = window.parent;
  var SRC = ${JSON.stringify(WORKER)};
  var url = null, w = null;
  function start() {
    try {
      url = url || URL.createObjectURL(new Blob([SRC], { type: "text/javascript" }));
      // Worker "classic" từ blob: worker dạng module tạo từ blob trong khung origin opaque bị Chromium chặn
      w = new Worker(url);
    } catch (e) {
      P.postMessage({ type: "fatal", message: "Trình duyệt không tạo được Web Worker trong khung cách ly: " + (e && e.message) }, "*");
      return;
    }
    w.onmessage = function (ev) { P.postMessage(ev.data, "*"); };
    w.onerror = function (ev) { if (ev.preventDefault) ev.preventDefault(); P.postMessage({ type: "fatal", message: (ev && ev.message) || "Không tải được Python (mạng chặn cdn.jsdelivr.net hoặc trình duyệt quá cũ)." }, "*"); };
  }
  window.addEventListener("message", function (ev) {
    if (ev.source !== P) return;
    var d = ev.data || {};
    if (d.type === "run" && w) w.postMessage({ type: "run", runId: String(d.runId || ""), code: String(d.code || ""), stdin: String(d.stdin || ""), tests: d.tests ? String(d.tests) : "" });
    else if (d.type === "stop") {
      if (w) w.terminate();
      start();
      P.postMessage({ type: "stopped", runId: String(d.runId || "") }, "*");
    }
  });
  start();
  P.postMessage({ type: "ready" }, "*");
})();
</script></body></html>`;

const CDN = "https://cdn.jsdelivr.net";
const CSP = [
  "default-src 'none'",
  // Pyodide: module + WASM từ CDN; 'unsafe-eval' cho phần JS sinh động của Emscripten (khung cách ly, không có dữ liệu của site).
  // KHÔNG thêm data: — xem ghi chú import() trong WORKER.
  `script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: ${CDN}`,
  "worker-src blob:",
  `connect-src ${CDN}`,
  "img-src data: blob:",
  "style-src 'unsafe-inline'",
  "font-src data:",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

export function GET() {
  return new Response(PAGE, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
