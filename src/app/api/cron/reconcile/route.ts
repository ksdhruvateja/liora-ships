import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { reconcileStuckPaidShipments } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function GET(request: Request) {
  const config = getConfig();
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const token = url.searchParams.get("secret");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? token ?? "";

  if (!config.CRON_SECRET || provided !== config.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await reconcileStuckPaidShipments();
  return NextResponse.json({ ok: true, results });
}

export async function POST(request: Request) {
  return GET(request);
}
