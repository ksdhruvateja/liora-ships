import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhook";
import { ensureLabelEmailSent } from "@/lib/fulfillment";
import { toPublicShipment } from "@/lib/public-shipment";
import type Stripe from "stripe";

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
  if (shipment.status === "LABEL_CREATED") {
    const updated = await ensureLabelEmailSent(shipment);
    return NextResponse.json({ shipment: toPublicShipment(updated) });
  }
  if (!shipment.stripePaymentIntentId) {
    return NextResponse.json({ error: "Payment has not started." }, { status: 409 });
  }

  const intent = await getStripe().paymentIntents.retrieve(shipment.stripePaymentIntentId);
  if (intent.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment has not succeeded yet.", status: intent.status },
      { status: 409 },
    );
  }
  if (intent.metadata?.shipmentId && intent.metadata.shipmentId !== shipment.id) {
    return NextResponse.json({ error: "Payment does not match this shipment." }, { status: 403 });
  }

  const event = {
    id: `local_fulfill_${intent.id}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    livemode: intent.livemode,
    pending_webhooks: 0,
    request: null,
    type: "payment_intent.succeeded",
    data: { object: intent },
  } as Stripe.Event;

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("Fulfill failed", error);
  }
  const updated = await prisma.shipment.findUnique({ where: { id: shipment.id } });
  if (!updated) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  return NextResponse.json({ shipment: toPublicShipment(updated) });
}
