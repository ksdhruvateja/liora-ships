import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { isMarkupPinConfigured } from "@/lib/markup-pin";
import { readShippingMarkupStatus } from "@/lib/markup-settings";
import { stripeWebhookUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  // The markup actually applied to new quotes (set in the footer PIN panel).
  const markup = await readShippingMarkupStatus();
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
      markupPinConfigured: isMarkupPinConfigured(),
      urls,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "liora-labs",
        markup,
        markupPinConfigured: isMarkupPinConfigured(),
        urls,
      },
      { status: 503 },
    );
  }
}
