import type { TestProject } from "vitest/node";
import { MongoMemoryReplSet } from "mongodb-memory-server";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let replSet: MongoMemoryReplSet | null = null;

/** Một replica set in-memory cho toàn bộ test (cần cho transaction). Không cần credentials. */
export default async function setup(project: TestProject) {
  const external = process.env.TEST_MONGODB_URI;
  if (external) {
    // Guard: chỉ cho phép DB cục bộ, tránh chạy nhầm vào production/Atlas.
    const host = new URL(external.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
    if (!["localhost", "127.0.0.1"].includes(host)) {
      throw new Error(`TEST_MONGODB_URI phải trỏ tới localhost (nhận: ${host}).`);
    }
    project.provide("mongoUri", external);
    return;
  }
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  project.provide("mongoUri", replSet.getUri());
  return async () => {
    await replSet?.stop();
  };
}
