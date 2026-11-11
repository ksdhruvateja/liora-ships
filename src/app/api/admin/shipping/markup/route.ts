import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getShippingMarkupSettings,
  priceShipping,
  saveShippingMarkupSettings,
} from "@/lib/markup-settings";
import {
  MARKUP_UNLOCK_HEADER,
  verifyMarkupUnlockToken,
} from "@/lib/markup-pin";
import { MarkupError, validateShippingMarkupSettings } from "@/lib/markup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXAMPLE_BASE_CENTS = 10_000;

export async function GET(request: Request) {
  const unlockToken = request.headers.get(MARKUP_UNLOCK_HEADER);
  if (!verifyMarkupUnlockToken(unlockToken)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let settings;
  try {
    settings = await getShippingMarkupSettings();
  } catch (error) {
    console.error("Could not load markup settings", error);
    return NextResponse.json(
      { error: "Couldn’t load the current markup. Check the database connection and try again." },
      { status: 503 },
    );
  }
  const example = priceShipping(EXAMPLE_BASE_CENTS, settings);
  return NextResponse.json({
    settings: {
      enabled: settings.enabled,
      percentage: settings.percentage,
      fixedMarkupCents: settings.fixedMarkupCents,
    },
    example: {
      easyshipRateCents: EXAMPLE_BASE_CENTS,
      markupCents: example.markupCents,
      customerShippingPriceCents: example.customerTotalCents,
    },
  });
}

const updateSchema = z.object({
  enabled: z.boolean(),
  percentage: z.number().min(0).max(100),
  fixedMarkupCents: z.number().int().min(0),
});

export async function PUT(request: Request) {
  const unlockToken = request.headers.get(MARKUP_UNLOCK_HEADER);
  if (!verifyMarkupUnlockToken(unlockToken)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid markup settings." }, { status: 400 });
  }

  try {
    const settings = validateShippingMarkupSettings(parsed.data);
    await saveShippingMarkupSettings(settings, "markup-pin-session");
    const example = priceShipping(EXAMPLE_BASE_CENTS, settings);
    return NextResponse.json({
      message: "Shipping markup updated successfully.",
      settings,
      example: {
        easyshipRateCents: EXAMPLE_BASE_CENTS,
        markupCents: example.markupCents,
        customerShippingPriceCents: example.customerTotalCents,
      },
    });
  } catch (error) {
    if (error instanceof MarkupError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save markup settings", error);
    return NextResponse.json(
      { error: "The markup wasn’t saved — the database couldn’t be reached. Prices are unchanged. Try again." },
      { status: 503 },
    );
  }
}
