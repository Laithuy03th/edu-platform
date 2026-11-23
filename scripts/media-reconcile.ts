import { flag } from "./_env";
import { closeMongo } from "@/server/db/client";
import { reconcile } from "@/modules/media/service";

/** Reconcile reservation treo/hết hạn và quota counter. Mặc định dry-run; --apply để sửa. */
async function main() {
  const report = await reconcile({ apply: flag("apply") });
  for (const line of report) console.log(line);
}
main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
