import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { purchaseLabelForShipment } from "@/lib/fulfillment";
import { checkoutRequestSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getConfig();
  if (!config.mockMode) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const json = await request.json();
  const parsed = checkoutRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A shipment is required." }, { status: 400 });
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id: parsed.data.shipmentId },
  });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  if (shipment.status === "LABEL_CREATED") {
    return NextResponse.json({ ok: true, shipmentId: shipment.id });
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: `mock_pi_${shipment.id}`,
    },
  });

  await purchaseLabelForShipment(shipment.id);
  return NextResponse.json({ ok: true, shipmentId: shipment.id });
}
