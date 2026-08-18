import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toPublicShipment } from "@/lib/public-shipment";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  return NextResponse.json({ shipment: toPublicShipment(shipment) });
}
