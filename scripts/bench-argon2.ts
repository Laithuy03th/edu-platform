import { hash, verify } from "@node-rs/argon2";
import { ARGON2_OPTIONS } from "@/server/auth/password";

/** Đo thời gian hash/verify Argon2id với tham số hiện hành trên máy đang chạy (ADR-004). */
async function main() {
  const pw = "một cụm mật khẩu dài để đo thời gian";
  await hash(pw, ARGON2_OPTIONS); // warm-up
  const n = 10;
  const t0 = performance.now();
  let h = "";
  for (let i = 0; i < n; i++) h = await hash(pw, ARGON2_OPTIONS);
  const t1 = performance.now();
  for (let i = 0; i < n; i++) await verify(h, pw);
  const t2 = performance.now();
  console.log(`Argon2id m=${ARGON2_OPTIONS.memoryCost}KiB t=${ARGON2_OPTIONS.timeCost} p=${ARGON2_OPTIONS.parallelism}`);
  console.log(`hash   trung bình: ${((t1 - t0) / n).toFixed(1)} ms`);
  console.log(`verify trung bình: ${((t2 - t1) / n).toFixed(1)} ms`);
  console.log(`Node ${process.version}, ${process.platform}/${process.arch}`);
}
main();
