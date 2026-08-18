import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureLabelEmailSent } from "@/lib/fulfillment";
import { toPublicShipment } from "@/lib/public-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  if (shipment.status !== "LABEL_CREATED") {
    return NextResponse.json({ error: "Label is not ready to email yet." }, { status: 409 });
  }

  const updated = await ensureLabelEmailSent(shipment);
  return NextResponse.json({ shipment: toPublicShipment(updated) });
}
