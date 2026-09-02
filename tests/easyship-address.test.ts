import { describe, expect, it, vi } from "vitest";
import { createEasyshipClient } from "@/lib/easyship";

const origin = {
  line1: "1 Market St",
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  countryAlpha2: "US",
  contactName: "Alex Shipper",
  contactPhone: "+14155550100",
  contactEmail: "shipper@example.com",
  companyName: "",
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
  companyName: "   ",
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

describe("easyship address mapping", () => {
  it("never sends a blank company_name on label purchase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          shipment: {
            easyship_shipment_id: "ES1",
            shipping_documents: [{ category: "label", url: "https://example.com/label.pdf" }],
            trackings: [{ tracking_number: "1Z1" }],
          },
        }),
    });
    const client = createEasyshipClient({
      apiKey: "key",
      baseUrl: "https://api.easyship.com/2024-09",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.createShipmentAndBuyLabel({
      origin,
      destination,
      parcel,
      courierServiceId: "rate_1",
      customerEmail: "buyer@example.com",
      platformOrderNumber: "ship_1",
    });

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.origin_address.company_name).toBe("Liora");
    expect(body.destination_address.company_name).toBe("Liora");
  });
});
