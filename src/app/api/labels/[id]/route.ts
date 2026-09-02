import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { toTodayLabelRow } from "@/lib/labels-today";
import { requireStaff } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = requireStaff(request, "employee");
  if ("error" in auth) return auth.error;

  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment) {
    return NextResponse.json({ error: "Label not found." }, { status: 404 });
  }

  const config = getConfig();
  return NextResponse.json({
    label: toTodayLabelRow(shipment, config.appUrl, auth.role),
  });
}
