sql.js 1.17.0 — https://github.com/sql-js/sql.js — MIT License (bản quyền thuộc các tác giả sql.js; SQLite là public domain).
Tệp được chép nguyên từ node_modules/sql.js/dist khi cập nhật: pnpm add -D sql.js && cp node_modules/sql.js/dist/{sql-wasm.js,sql-wasm.wasm} public/vendor/sqljs/
Worker của playground (mã của Tự Học, không phải bên thứ ba) nằm cùng thư mục: tuhoc-sql-worker.js — để cùng origin/thư mục /vendor/
(proxy không gắn CSP nonce cho /vendor/ nên worker biên dịch được WASM).
