import { NextResponse } from "next/server";
import { getShippingMarkupSettings, priceShipping } from "@/lib/markup-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public-safe pricing helper for a known base rate in cents. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseCents = Number(url.searchParams.get("baseCents") ?? "0");
  if (!Number.isFinite(baseCents) || baseCents <= 0) {
    return NextResponse.json({ error: "baseCents is required." }, { status: 400 });
  }

  const settings = await getShippingMarkupSettings();
  const priced = priceShipping(Math.round(baseCents), settings);
  return NextResponse.json({
    customer_shipping_price: priced.customerTotalCents / 100,
    currency: "USD",
  });
}
