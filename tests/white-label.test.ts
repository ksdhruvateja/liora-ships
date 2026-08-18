import { describe, expect, it } from "vitest";
import { toPublicQuoteRate, toPublicShipment } from "@/lib/public-shipment";
import type { Shipment } from "@prisma/client";
import { brandCourierName } from "@/lib/courier-names";

function shipment(): Shipment {
  const now = new Date();
  return {
    id: "ship_public",
    quoteGroupId: "qg",
    customerEmail: "buyer@example.com",
    originAddress: {},
    destAddress: {},
    parcel: {},
    selectedCourierId: "easyship-courier-id-should-not-leak",
    easyshipRateId: "easyship-rate-id-should-not-leak",
    easyshipCourierName: "UPS - Express",
    brandedCourierName: "Liora Express",
    currency: "USD",
    baseCostCents: 9999,
    markupCents: 2500,
    customerTotalCents: 12499,
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    stripePaymentIntentId: "pi_secret",
    status: "LABEL_CREATED",
    easyshipShipmentId: "ESHK000HIDDEN",
    labelUrl: "https://api.easyship.com/secret-label.pdf",
    trackingNumber: "1ZFOREZ",
    fulfillmentAttempts: 1,
    lastError: null,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("white-label public payloads", () => {
  it("does not expose Easyship ids, costs, or label host URLs", () => {
    const pub = toPublicShipment(shipment());
    const json = JSON.stringify(pub);
    expect(json).not.toMatch(/easyship/i);
    expect(json).not.toContain("baseCost");
    expect(json).not.toContain("ESHK000HIDDEN");
    expect(json).not.toContain("easyship-courier-id-should-not-leak");
    expect(pub.courierName).toBe("Liora Express");
    expect(pub.labelDownloadUrl).toContain("/api/shipments/ship_public/label");
    expect(pub.trackingUrl).toContain("/track/1ZFOREZ");
    expect(pub.notifyEmail).toBe("zippyyycare@gmail.com");
  });

  it("quote rates only return branded customer fields", () => {
    const rate = toPublicQuoteRate(shipment());
    const json = JSON.stringify(rate);
    expect(json).not.toMatch(/easyship/i);
    expect(rate).toEqual({
      shipmentId: "ship_public",
      courierName: "Liora Express",
      estimatedDelivery: "2–4 business days",
      customerTotalCents: 12499,
      currency: "USD",
    });
  });

  it("maps generic courier names onto the brand table", () => {
    const name = brandCourierName(
      [
        {
          matchType: "NAME_CONTAINS",
          matchValue: "express",
          displayName: "Liora Express",
          sortOrder: 1,
          active: true,
        },
      ],
      {
        courierServiceId: "abc",
        courierName: "DHL Express Worldwide",
        umbrellaName: "DHL",
        serviceName: "Express",
      },
    );
    expect(name).toBe("Liora Express");
    expect(name.toLowerCase()).not.toContain("dhl");
  });
});
