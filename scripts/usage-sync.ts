import "./_env";
import { closeMongo } from "@/server/db/client";
import { refreshCloudinaryUsage, refreshMongoUsage } from "@/modules/media/usage";

/** Đồng bộ usage thủ công (khi không có scheduler miễn phí phù hợp). Gọi Admin API 1 lần. */
async function main() {
  const [cl, mg] = await Promise.all([refreshCloudinaryUsage(null), refreshMongoUsage(null)]);
  console.log("Cloudinary:", cl.ok ? cl.data : `LỖI: ${cl.error}`);
  console.log("MongoDB:", mg.ok ? mg.data : `LỖI: ${mg.error}`);
}
main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
