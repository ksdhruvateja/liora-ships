import { describe, expect, it, vi } from "vitest";
import { createEasyshipClient, extractLabel } from "@/lib/easyship";

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

  it("reads a label URL from shipping documents", () => {
    expect(
      extractLabel({
        easyship_shipment_id: "ES1",
        shipping_documents: [{ category: "label", url: "https://example.com/label.pdf" }],
        trackings: [{ tracking_number: "1Z1" }],
      }),
    ).toMatchObject({
      labelUrl: "https://example.com/label.pdf",
      trackingNumber: "1Z1",
    });
  });

  it("turns a base64 label into a downloadable data URL", () => {
    expect(
      extractLabel({
        easyship_shipment_id: "ES1",
        shipping_documents: [{ category: "label", base64_encoded_strings: ["JVBERi0x"] }],
      }).labelUrl,
    ).toBe("data:application/pdf;base64,JVBERi0x");
  });

  it("loads the label URL after Easyship creates a shipment without documents", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const path = String(url);
      const withDocs = {
        ok: true,
        text: async () =>
          JSON.stringify({
            shipment: {
              easyship_shipment_id: "ES1",
              shipping_documents: [{ category: "label", url: "https://example.com/label.pdf" }],
              trackings: [{ tracking_number: "1Z1" }],
            },
          }),
      };
      if (path.endsWith("/shipments")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              shipment: { easyship_shipment_id: "ES1", shipping_documents: [], trackings: [] },
            }),
        };
      }
      return withDocs;
    });
    const client = createEasyshipClient({
      apiKey: "key",
      baseUrl: "https://api.easyship.com/2024-09",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const label = await client.createShipmentAndBuyLabel({
      origin,
      destination,
      parcel,
      courierServiceId: "rate_1",
      customerEmail: "buyer@example.com",
      platformOrderNumber: "ship_1",
    });
    expect(label.labelUrl).toBe("https://example.com/label.pdf");
    expect(label.trackingNumber).toBe("1Z1");
  });
});
