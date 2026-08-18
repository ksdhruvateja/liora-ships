import type Stripe from "stripe";
import { prisma } from "./db";
import { purchaseLabelForShipment, type FulfillmentDeps } from "./fulfillment";

export type StripeEventHandlerDeps = FulfillmentDeps;

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: StripeEventHandlerDeps = {},
) {
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const shipmentId = intent.metadata?.shipmentId;
    if (!shipmentId) return { handled: false };
    await prisma.shipment.updateMany({
      where: { id: shipmentId, status: { in: ["QUOTED", "PAID"] } },
      data: {
        status: "FAILED",
        stripePaymentIntentId: intent.id,
        lastError: intent.last_payment_error?.message ?? "Payment failed",
      },
    });
    return { handled: true, shipmentId, status: "FAILED" };
  }

  if (event.type !== "payment_intent.succeeded") {
    return { handled: false };
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  const shipmentId = intent.metadata?.shipmentId;
  if (!shipmentId) {
    throw new Error("payment_intent.succeeded missing metadata.shipmentId");
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) {
    throw new Error(`Shipment ${shipmentId} not found for payment ${intent.id}`);
  }

  if (shipment.status === "LABEL_CREATED" || shipment.status === "REFUNDED") {
    return { handled: true, shipmentId, skipped: true, status: shipment.status };
  }

  if (shipment.status === "QUOTED") {
    const claimed = await prisma.shipment.updateMany({
      where: { id: shipmentId, status: "QUOTED" },
      data: {
        status: "PAID",
        stripePaymentIntentId: intent.id,
      },
    });
    if (claimed.count === 0) {
      const latest = await prisma.shipment.findUnique({ where: { id: shipmentId } });
      if (latest?.status === "LABEL_CREATED") {
        return { handled: true, shipmentId, skipped: true, status: latest.status };
      }
    }
  } else if (shipment.status === "PAID") {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { stripePaymentIntentId: intent.id },
    });
  } else if (shipment.status === "FAILED") {
    return { handled: true, shipmentId, skipped: true, status: shipment.status };
  }

  const latest = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (latest?.easyshipShipmentId && latest.labelUrl) {
    if (latest.status !== "LABEL_CREATED") {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: "LABEL_CREATED" },
      });
    }
    return { handled: true, shipmentId, skipped: true, status: "LABEL_CREATED" };
  }

  try {
    await purchaseLabelForShipment(shipmentId, deps);
    return { handled: true, shipmentId, status: "LABEL_CREATED" };
  } catch (error) {
    console.error("Label purchase after payment will retry", error);
    return {
      handled: true,
      shipmentId,
      status: "PAID",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
