import "./_env";
import { closeMongo, getDb } from "@/server/db/client";
import { INDEXES, ensureIndexes } from "@/server/db/indexes";

/** Tạo collection + index (idempotent). Liệt kê index thừa nhưng KHÔNG tự drop. */
async function main() {
  const db = await getDb();
  console.log(`DB: ${db.databaseName}`);
  await ensureIndexes(db, (m) => console.log(m));
  for (const [name, specs] of Object.entries(INDEXES)) {
    const existing = await db.collection(name).indexes();
    const expected = new Set(["_id_", ...specs.map((s) => s.name)]);
    const extra = existing.filter((i) => i.name && !expected.has(i.name));
    if (extra.length) console.log(`! ${name}: index không có trong định nghĩa: ${extra.map((i) => i.name).join(", ")} (không tự xóa)`);
  }
  await closeMongo();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeMongo().catch(() => {});
  process.exit(1);
});
