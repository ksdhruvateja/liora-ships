import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { checkoutRequestSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function POST(request: Request) {
  try {
    const config = getConfig();
    const json = await request.json();
    const parsed = checkoutRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A shipment is required to start checkout." },
        { status: 400 },
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: parsed.data.shipmentId },
    });
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }
    if (shipment.status !== "QUOTED") {
      return NextResponse.json(
        { error: "This quote is no longer available for payment." },
        { status: 409 },
      );
    }
    if (shipment.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This quote has expired. Please request new rates." },
        { status: 410 },
      );
    }

    const stripe = getStripe();

    const publishableKey = config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

    if (config.mockMode) {
      return NextResponse.json({
        mock: true,
        shipmentId: shipment.id,
        amountCents: shipment.customerTotalCents,
        currency: shipment.currency,
        courierName: shipment.brandedCourierName,
        publishableKey,
      });
    }

    if (shipment.stripePaymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        shipment.stripePaymentIntentId,
      );
      const reusable = ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
        existingIntent.status,
      );
      if (reusable && existingIntent.client_secret) {
        return NextResponse.json({
          clientSecret: existingIntent.client_secret,
          shipmentId: shipment.id,
          amountCents: shipment.customerTotalCents,
          currency: shipment.currency,
          courierName: shipment.brandedCourierName,
          publishableKey,
        });
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: shipment.customerTotalCents,
      currency: shipment.currency.toLowerCase(),
      receipt_email: shipment.customerEmail,
      automatic_payment_methods: { enabled: true },
      description: `${config.appName} shipping — ${shipment.brandedCourierName}`,
      metadata: {
        shipmentId: shipment.id,
        quoteGroupId: shipment.quoteGroupId,
      },
    });

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { stripePaymentIntentId: intent.id },
    });

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      shipmentId: shipment.id,
      amountCents: shipment.customerTotalCents,
      currency: shipment.currency,
      courierName: shipment.brandedCourierName,
      publishableKey,
    });
  } catch (error) {
    console.error("Checkout failed", error);
    return NextResponse.json(
      { error: "Payment could not be started. Please try again." },
      { status: 502 },
    );
  }
}
