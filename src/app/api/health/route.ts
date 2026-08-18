import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const markup = {
    percent: config.APP_MARKUP_PERCENT,
    floorCents: config.APP_MARKUP_FLAT_CENTS,
    capCents: config.APP_MARKUP_CAP_CENTS,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "liora-labs", markup });
  } catch {
    return NextResponse.json({ ok: false, service: "liora-labs", markup }, { status: 503 });
  }
}
