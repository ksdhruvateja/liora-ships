import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPinAttempts,
  createMarkupUnlockToken,
  hashMarkupPin,
  isMarkupPinValid,
  recordFailedPinAttempt,
  verifyMarkupUnlockToken,
} from "@/lib/markup-pin";
import { resetConfigCache } from "@/lib/config";

const store = vi.hoisted(() => ({
  attempts: new Map<string, { failedAttempts: number; lockedUntil: Date | null }>(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    markupPinAttempt: {
      findUnique: vi.fn(async ({ where: { ipAddress } }: { where: { ipAddress: string } }) => {
        const row = store.attempts.get(ipAddress);
        if (!row) return null;
        return { id: "1", ipAddress, ...row, updatedAt: new Date() };
      }),
      upsert: vi.fn(
        async ({
          where: { ipAddress },
          create,
          update,
        }: {
          where: { ipAddress: string };
          create: { ipAddress: string; failedAttempts: number };
          update: { failedAttempts?: { increment: number } };
        }) => {
          const existing = store.attempts.get(ipAddress);
          const nextFailed =
            update.failedAttempts?.increment != null
              ? (existing?.failedAttempts ?? 0) + update.failedAttempts.increment
              : create.failedAttempts;
          const next = {
            failedAttempts: nextFailed,
            lockedUntil: existing?.lockedUntil ?? null,
          };
          store.attempts.set(ipAddress, next);
          return { id: "1", ipAddress, ...next, updatedAt: new Date() };
        },
      ),
      update: vi.fn(
        async ({
          where: { ipAddress },
          data,
        }: {
          where: { ipAddress: string };
          data: { failedAttempts?: number; lockedUntil?: Date | null };
        }) => {
          const existing = store.attempts.get(ipAddress) ?? { failedAttempts: 0, lockedUntil: null };
          const next = { ...existing, ...data };
          store.attempts.set(ipAddress, next);
          return { id: "1", ipAddress, ...next, updatedAt: new Date() };
        },
      ),
      deleteMany: vi.fn(async ({ where: { ipAddress } }: { where: { ipAddress: string } }) => {
        store.attempts.delete(ipAddress);
        return { count: 1 };
      }),
    },
    markupAuditLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

describe("markup PIN security", () => {
  beforeEach(() => {
    store.attempts.clear();
    process.env.MARKUP_ADMIN_PIN = "2720022";
    process.env.MARKUP_ADMIN_PIN_HASH = "";
    resetConfigCache();
  });

  afterEach(() => {
    delete process.env.MARKUP_ADMIN_PIN;
    delete process.env.MARKUP_ADMIN_PIN_HASH;
    resetConfigCache();
  });

  it("accepts the configured PIN", async () => {
    await expect(isMarkupPinValid("2720022")).resolves.toBe(true);
    await expect(isMarkupPinValid("0000000")).resolves.toBe(false);
  });

  it("verifies hashed PIN values", async () => {
    const hash = await hashMarkupPin("2720022");
    process.env.MARKUP_ADMIN_PIN = "";
    process.env.MARKUP_ADMIN_PIN_HASH = hash;
    resetConfigCache();
    await expect(isMarkupPinValid("2720022")).resolves.toBe(true);
    await expect(isMarkupPinValid("wrong")).resolves.toBe(false);
  });

  it("issues unlock tokens that expire", () => {
    const { token } = createMarkupUnlockToken();
    expect(verifyMarkupUnlockToken(token)).toBe(true);
    expect(verifyMarkupUnlockToken("bad.token")).toBe(false);
  });

  it("locks out after repeated failures", async () => {
    const ip = "203.0.113.1";
    for (let i = 0; i < 5; i += 1) {
      await recordFailedPinAttempt(ip);
    }
    const state = await recordFailedPinAttempt(ip);
    expect(state.locked).toBe(true);
  });

  it("clears failures after successful unlock", async () => {
    const ip = "203.0.113.2";
    await recordFailedPinAttempt(ip);
    await clearPinAttempts(ip);
    const row = store.attempts.get(ip);
    expect(row).toBeUndefined();
  });
});

describe("verify-markup-pin route", () => {
  beforeEach(() => {
    store.attempts.clear();
    process.env.MARKUP_ADMIN_PIN = "2720022";
    resetConfigCache();
  });

  afterEach(() => {
    delete process.env.MARKUP_ADMIN_PIN;
    resetConfigCache();
  });

  it("returns unlock token without exposing the PIN", async () => {
    const { POST } = await import("@/app/api/admin/verify-markup-pin/route");
    const response = await POST(
      new Request("http://localhost/api/admin/verify-markup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "2720022" }),
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.unlockToken).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain("2720022");
  });

  it("rejects incorrect PIN with a generic message", async () => {
    const { POST } = await import("@/app/api/admin/verify-markup-pin/route");
    const response = await POST(
      new Request("http://localhost/api/admin/verify-markup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "0000000" }),
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid PIN.");
  });
});
