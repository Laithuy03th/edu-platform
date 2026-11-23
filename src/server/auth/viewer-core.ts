import "server-only";
import { ObjectId } from "mongodb";
import { parseId } from "@/lib/ids";
import { cols, type Doc, type Role, type UserDoc } from "@/server/db/models";

export const SESSION_IDLE_SECONDS = 8 * 3600;
export const SESSION_UPDATE_AGE_SECONDS = 3600;
export const SESSION_ABSOLUTE_SECONDS = 7 * 24 * 3600;

export type SessionClaims = { sub?: string | null; av?: number | null; lat?: number | null };

export type Viewer = {
  id: ObjectId;
  idStr: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  roles: Role[];
  timezone: string;
  dataSaver: boolean;
  avatarUrl: string | null;
  hasPassword: boolean;
  authVersion: number;
};

export function toViewer(u: Doc<UserDoc>): Viewer {
  return {
    id: u._id,
    idStr: u._id.toHexString(),
    displayName: u.displayName,
    email: u.email,
    emailVerified: Boolean(u.emailVerifiedAt),
    roles: u.roles,
    timezone: u.timezone,
    dataSaver: u.dataSaver,
    avatarUrl: u.avatar.kind === "google" ? u.avatar.url : null,
    hasPassword: Boolean(u.passwordHash),
    authVersion: u.authVersion,
  };
}

/**
 * ADR-003: mỗi request bảo vệ đối chiếu trạng thái user + authVersion hiện hành trong DB.
 * Không cache qua request → thu hồi phiên có hiệu lực ngay request kế tiếp.
 */
export async function resolveViewer(claims: SessionClaims | null, nowMs = Date.now()): Promise<Viewer | null> {
  if (!claims?.sub || typeof claims.av !== "number" || typeof claims.lat !== "number") return null;
  if (nowMs / 1000 - claims.lat > SESSION_ABSOLUTE_SECONDS) return null;
  const id = parseId(claims.sub);
  if (!id) return null;
  const c = await cols();
  const u = await c.users.findOne({ _id: id }, { projection: { passwordHash: 1, displayName: 1, email: 1, emailVerifiedAt: 1, roles: 1, timezone: 1, dataSaver: 1, avatar: 1, status: 1, authVersion: 1 } });
  if (!u || u.status !== "active" || u.authVersion !== claims.av) return null;
  return toViewer(u as Doc<UserDoc>);
}

export const hasRole = (v: Viewer | null, role: Role) => Boolean(v?.roles.includes(role));
