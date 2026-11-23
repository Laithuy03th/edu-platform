import { afterAll, beforeAll, inject } from "vitest";

// Mỗi file test dùng một database riêng, xóa khi xong.
const dbName = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const env = process.env as Record<string, string | undefined>;
env.MONGODB_URI = inject("mongoUri");
env.MONGODB_DB_NAME = dbName;
env.NODE_ENV = "test";
env.APP_ENV = "test";
env.APP_URL = "http://localhost:3000";
env.MAIL_TRANSPORT = "file";
env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123";
env.RATE_LIMIT_SECRET = "test-rate-limit-secret-0123456789";
for (const k of ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "TRUST_PROXY"]) {
  delete env[k];
}

beforeAll(async () => {
  const { getDb } = await import("@/server/db/client");
  const { ensureIndexes } = await import("@/server/db/indexes");
  await ensureIndexes(await getDb());
});

afterAll(async () => {
  const { getDb, closeMongo } = await import("@/server/db/client");
  await (await getDb()).dropDatabase();
  await closeMongo();
});
