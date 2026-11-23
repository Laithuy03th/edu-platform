import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import type { Mail } from "@/server/mail";
import { cols } from "@/server/db/models";
import * as svc from "@/modules/auth/service";
import { resolveViewer } from "@/server/auth/viewer-core";
import { resolveGoogleSignIn } from "@/server/auth/google-policy";
import { issueToken, consumeToken } from "@/server/auth/tokens";
import { consumeRate } from "@/server/rate-limit";
import { AppError } from "@/lib/errors";

const PW = "mật khẩu đủ dài 123";
let n = 0;
const uniqueEmail = () => `user${Date.now()}${n++}@example.com`;
const outbox: Mail[] = [];
const deliver = (m: Mail) => void outbox.push(m);

async function register(email = uniqueEmail(), ip = `ip-${n}`) {
  const r = await svc.registerUser({ displayName: "Người Học", email, password: PW }, { ip }, deliver);
  return { email, userId: r.userId! };
}

function tokenFrom(mail: Mail): string {
  const m = mail.text.match(/token=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("no token in mail");
  return m[1]!;
}

describe("đăng ký", () => {
  it("A1: lưu Argon2id, không lưu plaintext; trạng thái chưa xác minh", async () => {
    const { userId } = await register();
    const c = await cols();
    const u = await c.users.findOne({ _id: userId });
    expect(u?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(u?.passwordHash).not.toContain(PW);
    expect(u?.emailVerifiedAt).toBeNull();
    expect(u?.roles).toEqual(["student"]);
  });

  it("A2: hai request đồng thời cùng email chỉ tạo một user", async () => {
    const email = uniqueEmail();
    const results = await Promise.all([
      svc.registerUser({ displayName: "A", email, password: PW }, { ip: "a" }, deliver),
      svc.registerUser({ displayName: "B", email: email.toUpperCase(), password: PW }, { ip: "b" }, deliver),
    ]);
    const c = await cols();
    expect(await c.users.countDocuments({ emailNormalized: email.toLowerCase() })).toBe(1);
    expect(results.filter((r) => r.userId).length).toBe(1);
  });

  it("từ chối mật khẩu ngắn", async () => {
    await expect(svc.registerUser({ displayName: "X", email: uniqueEmail(), password: "short" }, { ip: "z" }, deliver)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("xác minh email bằng token một lần", async () => {
    outbox.length = 0;
    const { userId } = await register();
    const token = tokenFrom(outbox.at(-1)!);
    await svc.verifyEmail(token);
    const c = await cols();
    expect((await c.users.findOne({ _id: userId }))?.emailVerifiedAt).toBeInstanceOf(Date);
    await expect(svc.verifyEmail(token)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });
});

describe("token (A5)", () => {
  it("hai consume đồng thời chỉ một thành công; hết hạn bị từ chối", async () => {
    const userId = new ObjectId();
    const token = await issueToken(userId, "password_reset");
    const [a, b] = await Promise.all([consumeToken(token, "password_reset"), consumeToken(token, "password_reset")]);
    expect([a, b].filter(Boolean)).toHaveLength(1);

    const old = await issueToken(userId, "password_reset", {}, new Date(Date.now() - 31 * 60_000));
    expect(await consumeToken(old, "password_reset")).toBeNull();
  });

  it("phát token mới vô hiệu token cũ cùng loại", async () => {
    const userId = new ObjectId();
    const t1 = await issueToken(userId, "password_reset");
    const t2 = await issueToken(userId, "password_reset");
    expect(await consumeToken(t1, "password_reset")).toBeNull();
    expect(await consumeToken(t2, "password_reset")).not.toBeNull();
  });
});

describe("thu hồi phiên (A6, A7)", () => {
  async function claimsFor(userId: ObjectId) {
    const c = await cols();
    const u = await c.users.findOne({ _id: userId });
    return { sub: userId.toHexString(), av: u!.authVersion, lat: Math.floor(Date.now() / 1000) };
  }

  it("reset mật khẩu làm JWT cũ bị từ chối", async () => {
    outbox.length = 0;
    const { email, userId } = await register();
    const claims = await claimsFor(userId);
    expect(await resolveViewer(claims)).not.toBeNull();
    await svc.requestPasswordReset(email, { ip: "r1" }, deliver);
    await svc.resetPasswordWithToken(tokenFrom(outbox.at(-1)!), "mật khẩu mới thật dài");
    expect(await resolveViewer(claims)).toBeNull();
    expect(await resolveViewer(await claimsFor(userId))).not.toBeNull();
  });

  it("đổi mật khẩu cần mật khẩu hiện tại và thu hồi phiên cũ", async () => {
    const { userId } = await register();
    const claims = await claimsFor(userId);
    await expect(svc.changePassword(userId, "sai mật khẩu hiện tại", "mật khẩu mới thật dài")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await svc.changePassword(userId, PW, "mật khẩu mới thật dài");
    expect(await resolveViewer(claims)).toBeNull();
  });

  it("đăng xuất tất cả thiết bị", async () => {
    const { userId } = await register();
    const claims = await claimsFor(userId);
    await svc.logoutAllDevices(userId);
    expect(await resolveViewer(claims)).toBeNull();
  });

  it("A7: user bị khóa bị từ chối dù token chưa hết hạn", async () => {
    const { userId } = await register();
    const claims = await claimsFor(userId);
    const c = await cols();
    await c.users.updateOne({ _id: userId }, { $set: { status: "blocked" } });
    expect(await resolveViewer(claims)).toBeNull();
  });

  it("hạn tuyệt đối 7 ngày", async () => {
    const { userId } = await register();
    const claims = { ...(await claimsFor(userId)), lat: Math.floor(Date.now() / 1000) - 8 * 86400 };
    expect(await resolveViewer(claims)).toBeNull();
  });
});

describe("quên mật khẩu (A3)", () => {
  it("email không tồn tại không ném lỗi và không gửi email", async () => {
    outbox.length = 0;
    await svc.requestPasswordReset("khong-ton-tai@example.com", { ip: "q" }, deliver);
    expect(outbox).toHaveLength(0);
  });
});

describe("rate limit (A4)", () => {
  it("vượt giới hạn → RATE_LIMITED có Retry-After", async () => {
    const rule = { name: "test:rule", limit: 3, windowSec: 60 };
    for (let i = 0; i < 3; i++) await consumeRate(rule, "subject");
    const err = await consumeRate(rule, "subject").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
    // Subject khác không bị ảnh hưởng
    await expect(consumeRate(rule, "other")).resolves.toBeUndefined();
  });

  it("bucket key không chứa subject thô", async () => {
    await consumeRate({ name: "test:raw", limit: 10, windowSec: 60 }, "203.0.113.9");
    const c = await cols();
    const docs = await c.rateLimitBuckets.find({}).toArray();
    expect(JSON.stringify(docs)).not.toContain("203.0.113.9");
  });
});

describe("Google policy (A11)", () => {
  const base = { name: "G User", picture: null, linkIntentToken: null, emailVerified: true };

  it("email trùng tài khoản mật khẩu → từ chối, không tự gộp", async () => {
    const { email } = await register();
    const r = await resolveGoogleSignIn({ ...base, providerAccountId: `g-${n++}`, email });
    expect(r).toEqual({ ok: false, error: "account_exists" });
    const c = await cols();
    expect(await c.authAccounts.countDocuments({ emailAtLink: email })).toBe(0);
  });

  it("email chưa xác minh bởi Google → từ chối", async () => {
    const r = await resolveGoogleSignIn({ ...base, providerAccountId: `g-${n++}`, email: uniqueEmail(), emailVerified: false });
    expect(r).toEqual({ ok: false, error: "email_unverified" });
  });

  it("tạo user mới khi chưa có, đăng nhập lại dùng liên kết đã có", async () => {
    const pid = `g-${n++}`;
    const email = uniqueEmail();
    const r1 = await resolveGoogleSignIn({ ...base, providerAccountId: pid, email });
    expect(r1).toMatchObject({ ok: true, mode: "created" });
    const r2 = await resolveGoogleSignIn({ ...base, providerAccountId: pid, email: "doi-email@example.com" });
    expect(r2).toMatchObject({ ok: true, mode: "existing" });
    if (r1.ok && r2.ok) expect(r2.userId).toBe(r1.userId);
  });

  it("liên kết qua link_intent vào đúng user, link_intent dùng một lần", async () => {
    const { userId } = await register();
    const token = await issueToken(userId, "link_intent");
    const pid = `g-${n++}`;
    const r = await resolveGoogleSignIn({ ...base, providerAccountId: pid, email: "khac@example.com", linkIntentToken: token });
    expect(r).toMatchObject({ ok: true, mode: "linked", userId: userId.toHexString() });
    const again = await resolveGoogleSignIn({ ...base, providerAccountId: `g-${n++}`, email: "x@example.com", linkIntentToken: token });
    expect(again).toEqual({ ok: false, error: "link_expired" });
  });

  it("không liên kết tài khoản Google đã thuộc user khác", async () => {
    const pid = `g-${n++}`;
    await resolveGoogleSignIn({ ...base, providerAccountId: pid, email: uniqueEmail() });
    const { userId } = await register();
    const token = await issueToken(userId, "link_intent");
    const r = await resolveGoogleSignIn({ ...base, providerAccountId: pid, email: "y@example.com", linkIntentToken: token });
    expect(r).toEqual({ ok: false, error: "linked_elsewhere" });
  });

  it("A14: không hủy liên kết phương thức đăng nhập duy nhất", async () => {
    const r = await resolveGoogleSignIn({ ...base, providerAccountId: `g-${n++}`, email: uniqueEmail() });
    if (!r.ok) throw new Error("expected ok");
    await expect(svc.unlinkGoogle(new ObjectId(r.userId))).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
