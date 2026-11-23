import { arg, flag } from "./_env";
import { env } from "@/lib/env";
import { closeMongo } from "@/server/db/client";
import { cols } from "@/server/db/models";
import { normalizeEmail } from "@/server/auth/email";

/**
 * Bootstrap admin có kiểm soát (AUTH_SECURITY §7): không có endpoint tự nâng quyền.
 * Yêu cầu ALLOW_ADMIN_BOOTSTRAP=true, user đã tồn tại và đã xác minh email.
 *   pnpm admin:create -- --email you@example.com --yes
 */
async function main() {
  if (!env().ALLOW_ADMIN_BOOTSTRAP) throw new Error("Đặt ALLOW_ADMIN_BOOTSTRAP=true tạm thời để chạy script này, rồi tắt lại.");
  const email = arg("email");
  if (!email) throw new Error("Thiếu --email <email>.");
  const c = await cols();
  const user = await c.users.findOne({ emailNormalized: normalizeEmail(email) });
  if (!user) throw new Error("Không tìm thấy user. Hãy đăng ký tài khoản trước.");
  if (!user.emailVerifiedAt) throw new Error("User chưa xác minh email.");
  if (user.roles.includes("admin")) {
    console.log("User đã là admin.");
    return;
  }
  if (!flag("yes")) throw new Error(`Sẽ cấp quyền admin cho ${user.email} (DB ${env().mongoDbName}). Chạy lại kèm --yes để xác nhận.`);
  await c.users.updateOne({ _id: user._id }, { $addToSet: { roles: "admin" }, $set: { updatedAt: new Date() } });
  await c.auditLogs.insertOne({ at: new Date(), actorId: null, action: "admin.bootstrap", targetType: "user", targetId: user._id.toHexString(), outcome: "success", requestId: null, meta: { via: "script" } });
  console.log(`✓ Đã cấp quyền admin cho ${user.email}. Hãy đặt lại ALLOW_ADMIN_BOOTSTRAP=false.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
