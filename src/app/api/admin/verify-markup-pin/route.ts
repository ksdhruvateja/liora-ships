import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearPinAttempts,
  createMarkupUnlockToken,
  getClientIp,
  getPinAttemptState,
  isMarkupPinConfigured,
  isMarkupPinValid,
  logMarkupAudit,
  recordFailedPinAttempt,
} from "@/lib/markup-pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pinSchema = z.object({
  pin: z.string().trim().min(1).max(32),
});

export async function POST(request: Request) {
  if (!isMarkupPinConfigured()) {
    return NextResponse.json(
      {
        error:
          "Markup PIN is not configured on the server. Set MARKUP_ADMIN_PIN in Netlify environment variables and redeploy.",
      },
      { status: 503 },
    );
  }

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
