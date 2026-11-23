import "server-only";
import { MongoClient, type ClientSession, type Db } from "mongodb";
import { env, requireEnv } from "@/lib/env";

type MongoCache = { client: MongoClient; promise: Promise<MongoClient>; uri: string };
const g = globalThis as unknown as { __tuhocMongo?: MongoCache };

/** MongoClient dùng lại toàn process (ADR-006). Dev/HMR dùng globalThis để không mở client mới. */
export function getMongoClient(): Promise<MongoClient> {
  const uri = requireEnv("MONGODB_URI", "Cần chuỗi kết nối MongoDB Atlas.");
  if (g.__tuhocMongo && g.__tuhocMongo.uri === uri) return g.__tuhocMongo.promise;
  const client = new MongoClient(uri, {
    maxPoolSize: env().MONGODB_MAX_POOL_SIZE,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 10_000,
    appName: "tuhoc-lms",
  });
  const promise = client.connect();
  g.__tuhocMongo = { client, promise, uri };
  promise.catch(() => {
    if (g.__tuhocMongo?.client === client) g.__tuhocMongo = undefined;
  });
  return promise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(env().mongoDbName);
}

/**
 * Transaction cho thao tác nhiều document phải nhất quán (xuất bản khóa, finalize media, reorder).
 * Yêu cầu replica set (Atlas có; test dùng mongodb-memory-server replset).
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}

/** Đóng kết nối (script/test). */
export async function closeMongo(): Promise<void> {
  const c = g.__tuhocMongo;
  g.__tuhocMongo = undefined;
  if (c) await (await c.promise).close();
}
