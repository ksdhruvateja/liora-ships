import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getConfig } from "./config";

export type StaffRole = "employee" | "admin";

export const STAFF_SESSION_COOKIE = "liora_staff_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type SessionPayload = {
  role: StaffRole;
  exp: number;
};

function sessionSecret() {
  const config = getConfig();
  const parts = [config.ADMIN_API_SECRET, config.STAFF_API_SECRET, config.CRON_SECRET].filter(Boolean);
  if (parts.length === 0) return "liora-staff-dev-only";
  return parts.join(":");
}

function signPayload(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.role || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createStaffSessionToken(role: StaffRole) {
  return signPayload({ role, exp: Date.now() + SESSION_TTL_MS });
}

export function parseStaffSessionToken(token: string | null | undefined) {
  if (!token) return null;
  return verifyToken(token);
}

export function staffRoleFromRequest(request: Request): StaffRole | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const config = getConfig();
    if (config.ADMIN_API_SECRET && bearer === config.ADMIN_API_SECRET) return "admin";
    if (config.STAFF_API_SECRET && bearer === config.STAFF_API_SECRET) return "employee";
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${STAFF_SESSION_COOKIE}=([^;]+)`));
  const payload = parseStaffSessionToken(match?.[1] ? decodeURIComponent(match[1]) : null);
  return payload?.role ?? null;
}

export async function staffRoleFromCookies(): Promise<StaffRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  return parseStaffSessionToken(token)?.role ?? null;
}

export function staffSessionCookieOptions(token: string) {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: STAFF_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
