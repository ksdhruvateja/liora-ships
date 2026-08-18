import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { createEasyshipClient } from "@/lib/easyship";
import { applyMarkup } from "@/lib/markup";
import { getConfig } from "@/lib/config";

const live = process.env.RUN_LIVE_INTEGRATION === "1";

describe.skipIf(!live)("live quote → checkout → webhook → label", () => {
  it("creates a PaymentIntent for the marked-up total and buys a label after a signed webhook", async () => {
    const config = getConfig();
    const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    const easyship = createEasyshipClient({
      apiKey: config.EASYSHIP_API_KEY,
      baseUrl: config.EASYSHIP_BASE_URL,
    });

    const origin = {
      line1: "1 Market St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      countryAlpha2: "US",
      contactName: "Alex Shipper",
      contactPhone: "+14155550100",
      contactEmail: "shipper@example.com",
      companyName: "Liora Labs",
    };
    const destination = {
      line1: "350 5th Ave",
      city: "New York",
      state: "NY",
      postalCode: "10118",
      countryAlpha2: "US",
      contactName: "Jordan Receiver",
      contactPhone: "+12125550100",
      contactEmail: "recv@example.com",
    };
    const parcel = {
      length: 10,
      width: 8,
      height: 4,
      dimensionUnit: "in" as const,
      weight: 2,
      weightUnit: "lb" as const,
      description: "Merchandise",
      declaredValueCents: 2500,
      declaredCurrency: "USD",
    };

    const rates = await easyship.requestRates({ origin, destination, parcel });
    expect(rates.length).toBeGreaterThan(0);
    const chosen = rates[0];
    const baseCostCents = Math.round(chosen.totalCharge * 100);
    const priced = applyMarkup(baseCostCents, {
      type: "PERCENT",
      value: 15,
      minCents: 200,
      maxCents: 2500,
    });

    const intent = await stripe.paymentIntents.create({
      amount: priced.customerTotalCents,
      currency: "usd",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { shipmentId: "live_integration" },
    });
    expect(intent.status).toBe("succeeded");

    const payload = JSON.stringify({
      id: "evt_live_test",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: intent },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: config.STRIPE_WEBHOOK_SECRET,
    });
    const verified = stripe.webhooks.constructEvent(
      payload,
      header,
      config.STRIPE_WEBHOOK_SECRET,
    );
    expect(verified.type).toBe("payment_intent.succeeded");

    const label = await easyship.createShipmentAndBuyLabel({
      origin,
      destination,
      parcel,
      courierServiceId: chosen.courierServiceId,
      customerEmail: destination.contactEmail,
      platformOrderNumber: `live-${Date.now()}`,
    });
    expect(label.easyshipShipmentId).toBeTruthy();
  });
});
