import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEasyship } from "@/lib/easyship-client";
import type { AddressInput } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shipmentId = url.searchParams.get("shipmentId");
    if (!shipmentId) {
      return NextResponse.json({ error: "shipmentId is required." }, { status: 400 });
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }
    const courierServiceId = shipment.easyshipRateId;

    const easyship = getEasyship();
    let originAddressId = shipment.easyshipOriginAddressId;
    if (!originAddressId) {
      originAddressId = await easyship.resolveOriginAddress(shipment.originAddress as AddressInput);
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { easyshipOriginAddressId: originAddressId },
      });
    }

    const availability = await easyship.listPickupSlots({
      courierServiceId,
      originAddressId,
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Pickup slots failed", error);
    return NextResponse.json(
      { error: "Pickup availability could not be loaded right now." },
      { status: 502 },
    );
  }
}
