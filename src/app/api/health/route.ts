import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { stripeWebhookUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const markup = {
    percent: config.APP_MARKUP_PERCENT,
    floorCents: config.APP_MARKUP_FLAT_CENTS,
    capCents: config.APP_MARKUP_CAP_CENTS,
  };
  const urls = {
    appUrl: config.appUrl,
    stripeWebhookUrl: stripeWebhookUrl(config.appUrl),
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "liora-labs",
      markup,
      markupPinConfigured: Boolean(
        config.MARKUP_ADMIN_PIN_HASH?.startsWith("scrypt:") || config.MARKUP_ADMIN_PIN,
      ),
      urls,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "liora-labs",
        markup,
        markupPinConfigured: Boolean(
          config.MARKUP_ADMIN_PIN_HASH?.startsWith("scrypt:") || config.MARKUP_ADMIN_PIN,
        ),
        urls,
      },
      { status: 503 },
    );
  }
}
