/* Nạp .env.local rồi .env cho script chạy ngoài Next.js (Node ≥ 21.7 có process.loadEnvFile). */
for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* file không tồn tại */
  }
}

export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
export function arg(name: string): string | undefined {
  const i = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  const a = process.argv[i]!;
  return a.includes("=") ? a.split("=").slice(1).join("=") : process.argv[i + 1];
}
