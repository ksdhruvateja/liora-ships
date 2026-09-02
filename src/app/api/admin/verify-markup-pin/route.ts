import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearPinAttempts,
  createMarkupUnlockToken,
  getClientIp,
  getPinAttemptState,
  isMarkupPinValid,
  logMarkupAudit,
  recordFailedPinAttempt,
} from "@/lib/markup-pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pinSchema = z.object({
  pin: z.string().min(1).max(32),
});

export async function POST(request: Request) {
  const ipAddress = getClientIp(request);
  const state = await getPinAttemptState(ipAddress);
  if (state.locked) {
    await logMarkupAudit("pin_locked", { ipAddress });
    return NextResponse.json({ error: "Invalid PIN." }, { status: 429 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = pinSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
  }

  const valid = await isMarkupPinValid(parsed.data.pin);
  if (!valid) {
    await recordFailedPinAttempt(ipAddress);
    await logMarkupAudit("pin_failed", { ipAddress });
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  await clearPinAttempts(ipAddress);
  const unlock = createMarkupUnlockToken();
  await logMarkupAudit("pin_unlocked", { ipAddress, expiresAt: unlock.expiresAt });
  return NextResponse.json({
    unlockToken: unlock.token,
    expiresAt: new Date(unlock.expiresAt).toISOString(),
  });
}
