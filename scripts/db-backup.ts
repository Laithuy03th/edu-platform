import { arg, flag } from "./_env";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import { BSON } from "mongodb";
import { MongoClient } from "mongodb";

const { EJSON } = BSON;
import { env } from "@/lib/env";
import { ensureIndexes } from "@/server/db/indexes";

/**
 * Sao lưu / khôi phục không cần mongodump (O07). Mỗi collection → <tên>.ejson.gz (EJSON từng dòng, giữ kiểu
 * ObjectId/Date). Bản sao chứa dữ liệu cá nhân (email, hash mật khẩu): chỉ lưu nơi an toàn, KHÔNG commit.
 *
 *   pnpm db:backup                                   # → .data/backup/<db>-<thời gian>/
 *   pnpm db:backup --restore=<thư mục> --to-uri=<mongodb://…> --to-db=<tên DB mới>
 *
 * Khôi phục chỉ vào DB CHƯA có dữ liệu (chặn ghi đè nhầm); muốn ghi vào DB đang có dữ liệu phải thêm --force.
 */
const SKIP = new Set(["rateLimitBuckets"]); // dữ liệu tạm, tự hết hạn

async function backup() {
  const e = env();
  const client = await new MongoClient(e.MONGODB_URI!).connect();
  const db = client.db(e.mongoDbName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = arg("out") ?? path.join(".data", "backup", `${e.mongoDbName}-${stamp}`);
  await mkdir(dir, { recursive: true });
  const manifest: Record<string, number> = {};
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (SKIP.has(name) || name.startsWith("system.")) continue;
    const out = createGzip();
    const file = createWriteStream(path.join(dir, `${name}.ejson.gz`));
    out.pipe(file);
    let n = 0;
    for await (const doc of db.collection(name).find({})) {
      if (!out.write(EJSON.stringify(doc, { relaxed: false }) + "\n")) await new Promise<void>((r) => out.once("drain", () => r()));
      n++;
    }
    out.end();
    await new Promise<void>((r) => file.on("finish", () => r()));
    manifest[name] = n;
  }
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ db: e.mongoDbName, at: new Date().toISOString(), counts: manifest }, null, 2));
  await client.close();
  console.log(`Đã sao lưu ${Object.keys(manifest).length} collection, ${Object.values(manifest).reduce((a, b) => a + b, 0)} document → ${dir}`);
  console.log("⚠ Bản sao có dữ liệu cá nhân: giữ ở nơi an toàn, không commit, xóa bản cũ không cần thiết.");
}

async function restore(dir: string) {
  const uri = arg("to-uri");
  const dbName = arg("to-db");
  if (!uri || !dbName) throw new Error("Cần --to-uri và --to-db.");
  if (!existsSync(path.join(dir, "manifest.json"))) throw new Error("Không thấy manifest.json trong thư mục sao lưu.");
  const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as { counts: Record<string, number> };
  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);
  const existing = (await db.listCollections({}, { nameOnly: true }).toArray()).map((x) => x.name);
  for (const name of existing) {
    if ((await db.collection(name).estimatedDocumentCount()) > 0 && !flag("force")) {
      throw new Error(`DB đích "${dbName}" đã có dữ liệu (${name}). Chọn DB mới hoặc thêm --force.`);
    }
  }
  const files = (await readdir(dir)).filter((f) => f.endsWith(".ejson.gz"));
  let mismatch = 0;
  for (const f of files) {
    const name = f.replace(/\.ejson\.gz$/, "");
    const col = db.collection(name);
    let batch: Record<string, unknown>[] = [];
    let n = 0;
    const rl = createInterface({ input: createReadStream(path.join(dir, f)).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }) as Record<string, unknown>);
      if (batch.length === 500) {
        await col.insertMany(batch, { ordered: false });
        n += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await col.insertMany(batch, { ordered: false });
      n += batch.length;
    }
    const count = await col.countDocuments();
    const ok = count === (manifest.counts[name] ?? n);
    if (!ok) mismatch++;
    console.log(`${ok ? "✓" : "✗"} ${name}: ${count}/${manifest.counts[name] ?? "?"}`);
  }
  await ensureIndexes(db);
  await client.close();
  console.log(mismatch ? `Khôi phục XONG nhưng ${mismatch} collection lệch số lượng.` : `Khôi phục đủ ${files.length} collection vào "${dbName}", đã tạo index.`);
  if (mismatch) process.exit(1);
}

const from = arg("restore");
(from ? restore(from) : backup()).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
