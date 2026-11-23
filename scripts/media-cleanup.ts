import { flag } from "./_env";
import { closeMongo } from "@/server/db/client";
import { findOrphans, processDeletionQueue } from "@/modules/media/service";

/**
 * Dọn media (§17.5). MẶC ĐỊNH DRY-RUN: chỉ liệt kê.
 *   pnpm media:cleanup                → liệt kê orphan + hàng xóa đến hạn
 *   pnpm media:cleanup -- --apply     → xóa orphan (grace 24h) và xử lý hàng xóa
 */
async function main() {
  const apply = flag("apply");
  console.log(apply ? "CHẾ ĐỘ APPLY — sẽ xóa trên Cloudinary" : "DRY-RUN — không xóa gì");
  const orphans = await findOrphans({ apply });
  console.table(orphans.map((o) => ({ publicId: o.publicId, type: `${o.resourceType}/${o.type}`, MiB: (o.bytes / 1048576).toFixed(2), createdAt: o.createdAt, deleted: o.deleted ?? "-", reason: o.reason })));
  console.log(`Orphan: ${orphans.length}`);
  if (apply) console.table(await processDeletionQueue(50));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
