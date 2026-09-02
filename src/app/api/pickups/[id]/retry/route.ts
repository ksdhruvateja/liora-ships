import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEasyship } from "@/lib/easyship-client";
import { requireStaff } from "@/lib/staff-auth";
import { schedulePickupForShipment } from "@/lib/pickup-fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = requireStaff(request, "admin");
  if ("error" in auth) return auth.error;

  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  if (shipment.status !== "LABEL_CREATED") {
    return NextResponse.json({ error: "Label must exist before retrying pickup." }, { status: 409 });
  }
  if (!shipment.pickupRequired) {
    return NextResponse.json({ error: "Pickup was not requested for this shipment." }, { status: 409 });
  }
  if (shipment.pickupStatus === "SCHEDULED" && shipment.easyshipPickupId) {
    return NextResponse.json({ error: "Pickup is already scheduled." }, { status: 409 });
  }

  const updated = await schedulePickupForShipment(shipment, getEasyship());
  return NextResponse.json({
    pickupStatus: updated.pickupStatus,
    easyshipPickupId: updated.easyshipPickupId,
    pickupErrorMessage: updated.pickupErrorMessage,
  });
}
