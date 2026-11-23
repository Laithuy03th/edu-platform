import "server-only";
import { randomBytes } from "node:crypto";
import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseId } from "@/lib/ids";
import { cols } from "@/server/db/models";
import { audit } from "@/server/audit";
import { RULES, consumeRate } from "@/server/rate-limit";
import { clientIpFrom } from "@/server/request";
import { isValidEmail, normalizeEmail } from "./email";
import { resolveGoogleSignIn } from "./google-policy";
import { verifyPassword } from "./password";
import { SESSION_ABSOLUTE_SECONDS, SESSION_IDLE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "./viewer-core";

export const LINK_INTENT_COOKIE = "tuhoc.link_intent";

declare module "next-auth" {
  interface Session {
    av?: number;
    lat?: number;
  }
}

class InvalidLogin extends CredentialsSignin {
  code = "invalid";
}
class RateLimitedLogin extends CredentialsSignin {
  code = "rate_limited";
}

let devSecret: string | null = null;
function authSecret(): string {
  const e = env();
  if (e.AUTH_SECRET) return e.AUTH_SECRET;
  if (e.isProduction) throw new AppError("NOT_CONFIGURED", "Thiếu AUTH_SECRET.");
  // Dev: secret ngẫu nhiên theo process → phiên mất khi khởi động lại. Đặt AUTH_SECRET để giữ phiên.
  if (!devSecret) {
    devSecret = randomBytes(32).toString("base64");
    logger.warn("auth.dev_secret_generated", { hint: "Đặt AUTH_SECRET trong .env để phiên không mất khi restart." });
  }
  return devSecret;
}

async function userClaims(userId: string) {
  const id = parseId(userId);
  if (!id) return null;
  const c = await cols();
  const u = await c.users.findOne({ _id: id }, { projection: { authVersion: 1, status: 1 } });
  if (!u || u.status !== "active") return null;
  return { sub: userId, av: u.authVersion };
}

function buildConfig(): NextAuthConfig {
  const e = env();
  return {
    secret: authSecret(),
    trustHost: !e.isProduction || process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.VERCEL),
    session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS, updateAge: SESSION_UPDATE_AGE_SECONDS },
    pages: { signIn: "/login", error: "/login" },
    providers: [
      Credentials({
        credentials: { email: {}, password: {} },
        async authorize(credentials, request) {
          const email = typeof credentials?.email === "string" ? credentials.email : "";
          const password = typeof credentials?.password === "string" ? credentials.password : "";
          if (!isValidEmail(email) || password.length === 0 || password.length > 1024) throw new InvalidLogin();
          const emailNormalized = normalizeEmail(email);
          try {
            // Rate limit TRƯỚC khi chạy Argon2 (tốn CPU).
            await consumeRate(RULES.loginIp, clientIpFrom(request.headers));
            await consumeRate(RULES.loginEmail, emailNormalized);
          } catch (err) {
            if (err instanceof AppError && err.code === "RATE_LIMITED") throw new RateLimitedLogin();
            throw err;
          }
          const c = await cols();
          const user = await c.users.findOne({ emailNormalized });
          const ok = await verifyPassword(user?.passwordHash ?? null, password);
          if (!ok || !user) throw new InvalidLogin();
          if (user.status !== "active") {
            await audit({ actorId: user._id, action: "auth.login_blocked", targetType: "user", targetId: user._id, outcome: "denied" });
            throw new InvalidLogin();
          }
          await c.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
          return { id: user._id.toHexString() };
        },
      }),
      ...(e.googleEnabled
        ? [
            Google({
              clientId: e.AUTH_GOOGLE_ID,
              clientSecret: e.AUTH_GOOGLE_SECRET,
              checks: ["pkce", "state", "nonce"],
              authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
            }),
          ]
        : []),
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (!account || account.provider === "credentials") return true;
        if (account.provider !== "google") return false;
        const jar = await cookies();
        const linkToken = jar.get(LINK_INTENT_COOKIE)?.value ?? null;
        if (linkToken) jar.delete(LINK_INTENT_COOKIE);
        const result = await resolveGoogleSignIn({
          providerAccountId: account.providerAccountId,
          email: profile?.email,
          emailVerified: profile?.email_verified as boolean | undefined,
          name: profile?.name,
          picture: profile?.picture as string | undefined,
          linkIntentToken: linkToken,
        });
        if (!result.ok) {
          return linkToken ? `/settings/security?link_error=${result.error}` : `/login?error=${result.error}`;
        }
        return true;
      },
      async jwt({ token, user, account, trigger }) {
        const now = Math.floor(Date.now() / 1000);
        if (account) {
          // Đăng nhập mới: chỉ giữ claim tối thiểu (ADR-003), bỏ name/email/picture mặc định.
          let userId: string | null = null;
          if (account.provider === "credentials") userId = user?.id ?? null;
          else if (account.provider === "google") {
            const c = await cols();
            const link = await c.authAccounts.findOne({ provider: "google", providerAccountId: account.providerAccountId });
            userId = link?.userId.toHexString() ?? null;
          }
          const claims = userId ? await userClaims(userId) : null;
          if (!claims) return null;
          return { sub: claims.sub, av: claims.av, lat: now };
        }
        if (typeof token.lat !== "number" || now - token.lat > SESSION_ABSOLUTE_SECONDS) return null;
        if (trigger === "update" && token.sub) {
          // Không tin dữ liệu client: đọc authVersion hiện hành từ DB.
          const claims = await userClaims(token.sub);
          if (!claims) return null;
          return { sub: claims.sub, av: claims.av, lat: token.lat };
        }
        return { sub: token.sub, av: token.av, lat: token.lat };
      },
      async session({ session, token }) {
        return {
          expires: session.expires,
          user: { id: token.sub ?? "" } as never,
          av: typeof token.av === "number" ? token.av : undefined,
          lat: typeof token.lat === "number" ? token.lat : undefined,
        };
      },
    },
    logger: {
      error(error) {
        // CredentialsSignin là lỗi nghiệp vụ bình thường, không log stack.
        if (error.name === "CredentialsSignin") return;
        logger.error("authjs.error", { name: error.name, message: error.message });
      },
      warn(code) {
        logger.warn("authjs.warn", { code });
      },
      debug() {},
    },
  };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(() => buildConfig());
