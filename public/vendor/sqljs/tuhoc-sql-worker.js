/*
 * Tự Học — Web Worker chạy SQLite (sql.js) cho playground SQL. Mã của Tự Học (không phải bên thứ ba);
 * sql-wasm.js + sql-wasm.wasm cùng thư mục là sql.js 1.17.0 (MIT).
 *
 * Mọi thứ chạy trong trình duyệt của người học: không có dữ liệu nào gửi lên server.
 * Giao thức (postMessage, mỗi yêu cầu có id):
 *   open   { buffer?: ArrayBuffer, seed?: string, fk?: boolean } → { ok, version }
 *   run    { sql, maxRows }  → { statements: [{ sql, columns, values, total, truncated, changes }], error?, errorIndex? }
 *   schema {}                → { tables: [{ name, type, rows, columns: [{ name, type, pk, notnull }] }] }
 *   export {}                → { buffer } (Uint8Array, chuyển quyền sở hữu)
 * Truy vấn chạy quá lâu: trang chính terminate() worker này rồi tạo lại (WASM không ngắt giữa chừng được).
 */
"use strict";
importScripts("sql-wasm.js");

var ready = self.initSqlJs({
  locateFile: function (f) {
    return new URL(f, self.location.href).href;
  },
});
var db = null;

function q(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}
function cell(v) {
  if (v instanceof Uint8Array) return "[BLOB " + v.length + " byte]";
  if (typeof v === "string" && v.length > 10000) return v.slice(0, 10000) + "…";
  return v;
}
function totalChanges() {
  return db.exec("SELECT total_changes()")[0].values[0][0];
}

function open(SQL, d) {
  if (db) db.close();
  db = new SQL.Database(d.buffer ? new Uint8Array(d.buffer) : undefined);
  // Tệp người học mở: đọc thử sqlite_master để báo lỗi ngay nếu không phải CSDL SQLite
  if (d.buffer) db.exec("SELECT count(*) FROM sqlite_master");
  if (d.seed) db.exec(d.seed);
  // Bật kiểm tra khóa ngoại cho dữ liệu mẫu (SQLite mặc định tắt) — xóa khách còn đơn hàng sẽ báo lỗi, đúng như CSDL thật.
  if (d.fk) db.exec("PRAGMA foreign_keys = ON");
  return { ok: true, version: db.exec("SELECT sqlite_version()")[0].values[0][0] };
}

function run(d) {
  var out = [];
  var maxRows = Math.min(Number(d.maxRows) || 1000, 5000);
  var it = db.iterateStatements(String(d.sql || ""));
  var stmt = null;
  try {
    for (;;) {
      var nx = it.next();
      if (nx.done) break;
      stmt = nx.value;
      var before = totalChanges();
      var columns = stmt.getColumnNames();
      var values = [];
      var total = 0;
      while (stmt.step()) {
        total++;
        if (values.length < maxRows) values.push(stmt.get().map(cell));
      }
      if (out.length < 50) {
        out.push({
          sql: stmt.getSQL().trim().slice(0, 300),
          columns: columns,
          values: values,
          total: total,
          truncated: total > values.length,
          changes: totalChanges() - before,
        });
      }
    }
    return { statements: out };
  } catch (e) {
    try {
      if (stmt) stmt.free();
    } catch (_) {
      /* đã giải phóng */
    }
    return { statements: out, error: String((e && e.message) || e), errorIndex: out.length };
  }
}

function schema() {
  var res = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type = 'view', name");
  var list = res.length ? res[0].values : [];
  return {
    tables: list.slice(0, 200).map(function (r) {
      var name = r[0];
      var columns = [];
      var rows = null;
      try {
        var info = db.exec("PRAGMA table_info(" + q(name) + ")");
        columns = info.length
          ? info[0].values.map(function (c) {
              return { name: c[1], type: c[2] || "", notnull: Boolean(c[3]), pk: Boolean(c[5]) };
            })
          : [];
      } catch (_) {
        /* view hỏng (tham chiếu bảng đã xóa) */
      }
      if (r[1] === "table" && list.length <= 60) {
        try {
          rows = db.exec("SELECT COUNT(*) FROM " + q(name))[0].values[0][0];
        } catch (_) {
          rows = null;
        }
      }
      return { name: name, type: r[1], rows: rows, columns: columns };
    }),
  };
}

self.onmessage = function (ev) {
  var d = ev.data || {};
  ready
    .then(function (SQL) {
      if (d.action === "open") return open(SQL, d);
      if (!db) db = new SQL.Database();
      if (d.action === "run") return run(d);
      if (d.action === "schema") return schema();
      if (d.action === "export") return { buffer: db["export"]() };
      throw new Error("Hành động không hợp lệ: " + d.action);
    })
    .then(function (r) {
      r.id = d.id;
      if (r.buffer) self.postMessage(r, [r.buffer.buffer]);
      else self.postMessage(r);
    })
    .catch(function (e) {
      self.postMessage({ id: d.id, error: String((e && e.message) || e) });
    });
};
