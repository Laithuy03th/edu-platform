import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * MongoDB replica set CỤC BỘ cho phát triển (không cần Atlas). Dữ liệu lưu tại .data/mongo.
 *   pnpm dev:db   → in MONGODB_URI để đặt vào .env.local
 * Không dùng cho production.
 */
async function main() {
  const dbPath = path.join(process.cwd(), ".data", "mongo");
  mkdirSync(dbPath, { recursive: true });
  const port = Number(process.env.DEV_MONGO_PORT ?? 27027);
  const rs = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger", name: "rs0" },
    instanceOpts: [{ port, dbPath }],
  });
  const uri = rs.getUri();
  console.log(`MongoDB dev đang chạy: ${uri}`);
  console.log(`Đặt vào .env.local: MONGODB_URI=${uri}`);
  const stop = async () => {
    await rs.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main();
