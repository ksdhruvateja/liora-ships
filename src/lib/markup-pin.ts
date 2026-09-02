import { scrypt, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { getConfig } from "./config";

const scryptAsync = promisify(scrypt);

export const MARKUP_UNLOCK_HEADER = "x-markup-unlock-token";
export const UNLOCK_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function pinSecret() {
  const config = getConfig();
  return [config.MARKUP_ADMIN_PIN_HASH, config.MARKUP_ADMIN_PIN, config.ADMIN_API_SECRET]
    .filter(Boolean)
    .join(":");
}

export async function hashMarkupPin(pin: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${derived.toString("base64")}`;
}

export async function verifyMarkupPinHash(pin: string, stored: string) {
  const [algo, saltB64, hashB64] = stored.split(":");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function isMarkupPinValid(pin: string) {
  const config = getConfig();
  if (config.MARKUP_ADMIN_PIN_HASH) {
    return verifyMarkupPinHash(pin, config.MARKUP_ADMIN_PIN_HASH);
  }
  if (config.MARKUP_ADMIN_PIN && config.NODE_ENV !== "production") {
    return pin === config.MARKUP_ADMIN_PIN;
  }
  if (config.MARKUP_ADMIN_PIN) {
    return pin === config.MARKUP_ADMIN_PIN;
  }
  return false;
}

export function createMarkupUnlockToken() {
  const expiresAt = Date.now() + UNLOCK_TOKEN_TTL_MS;
  const body = Buffer.from(JSON.stringify({ exp: expiresAt, scope: "markup-admin" })).toString(
    "base64url",
  );
  const sig = createHmac("sha256", pinSecret()).update(body).digest("base64url");
  return { token: `${body}.${sig}`, expiresAt };
}

export function verifyMarkupUnlockToken(token: string | null | undefined) {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", pinSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      exp?: number;
      scope?: string;
    };
    return payload.scope === "markup-admin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export type PinAttemptState = {
  locked: boolean;
  remainingAttempts: number;
};

export async function recordFailedPinAttempt(ipAddress: string): Promise<PinAttemptState> {
  const { prisma } = await import("./db");
  const now = new Date();
  const row = await prisma.markupPinAttempt.upsert({
    where: { ipAddress },
    create: { ipAddress, failedAttempts: 1, lockedUntil: null },
    update: { failedAttempts: { increment: 1 } },
  });
  const failedAttempts = row.failedAttempts;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    await prisma.markupPinAttempt.update({
      where: { ipAddress },
      data: { lockedUntil, failedAttempts },
    });
    return { locked: true, remainingAttempts: 0 };
  }
  return { locked: false, remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts) };
}

export async function clearPinAttempts(ipAddress: string) {
  const { prisma } = await import("./db");
  await prisma.markupPinAttempt.deleteMany({ where: { ipAddress } });
}

export async function getPinAttemptState(ipAddress: string): Promise<PinAttemptState> {
  const { prisma } = await import("./db");
  const row = await prisma.markupPinAttempt.findUnique({ where: { ipAddress } });
  if (!row) return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    return { locked: true, remainingAttempts: 0 };
  }
  if (row.lockedUntil && row.lockedUntil.getTime() <= Date.now()) {
    await prisma.markupPinAttempt.update({
      where: { ipAddress },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - row.failedAttempts),
  };
}

export async function logMarkupAudit(event: string, details: Record<string, unknown>) {
  const sanitized = JSON.stringify(details).replace(/\d{4,}/g, "[redacted]");
  console.info(`[markup-audit] ${event} ${sanitized}`);
}

export { MAX_FAILED_ATTEMPTS };
