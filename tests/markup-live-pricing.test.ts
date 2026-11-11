import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end markup flow through the real route handlers:
 * admin saves a markup in the PIN panel → the very next quote is priced with it.
 */

const db = vi.hoisted(() => ({
  config: null as null | { id: string; enabled: boolean; percentage: number; fixedMarkupCents: number; updatedBy?: string | null },
  audit: [] as Record<string, unknown>[],
  shipments: [] as Record<string, unknown>[],
  failReads: false,
}));

vi.mock("@/lib/db", () => {
  const shippingMarkupConfig = {
    findUnique: vi.fn(async () => {
      if (db.failReads) throw new Error("db down");
      return db.config;
    }),
    upsert: vi.fn(async ({ create, update }: { create: typeof db.config; update: Partial<NonNullable<typeof db.config>> }) => {
      db.config = db.config ? { ...db.config, ...update } : create;
      return db.config!;
    }),
  };
  const markupAuditLog = { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => db.audit.push(data)) };
  const shipment = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `ship_${db.shipments.length + 1}`, ...data };
      db.shipments.push(row);
      return row;
    }),
  };
  const prisma = {
    shippingMarkupConfig,
    markupAuditLog,
    shipment,
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => Promise<unknown>)({ shippingMarkupConfig, markupAuditLog, shipment })
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma };
});

vi.mock("@/lib/easyship-client", () => ({
  getEasyship: () => ({
    requestRates: vi.fn().mockResolvedValue([
      {
        courierServiceId: "svc-ground",
        courierName: "UPS Ground",
        umbrellaName: "UPS",
        serviceName: "Ground",
        totalCharge: 100, // $100.00 carrier rate
        currency: "USD",
        minDeliveryTime: 3,
        maxDeliveryTime: 5,
      },
    ]),
  }),
}));

vi.mock("@/lib/markup-pin", () => ({
  MARKUP_UNLOCK_HEADER: "x-markup-unlock-token",
  verifyMarkupUnlockToken: (token: string | null) => token === "valid-token",
}));

import { POST as quote } from "@/app/api/quote/route";
import { GET as getMarkup, PUT as putMarkup } from "@/app/api/admin/shipping/markup/route";
import { resetConfigCache } from "@/lib/config";

const quoteBody = {
  customerEmail: "buyer@example.com",
  origin: {
    line1: "500 Market St",
    line2: "",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    countryAlpha2: "US",
    contactName: "Jamie",
    contactPhone: "4155550100",
    contactEmail: "buyer@example.com",
    companyName: "",
  },
  destination: {
    line1: "350 5th Ave",
    line2: "",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    countryAlpha2: "US",
    contactName: "Sam",
    contactPhone: "2125550199",
    contactEmail: "sam@example.com",
    companyName: "",
  },
  parcel: {
    length: 10,
    width: 8,
    height: 4,
    dimensionUnit: "in",
    weight: 2,
    weightUnit: "lb",
    description: "Clothing",
    category: "fashion",
    declaredValueCents: 5000,
  },
  referenceNumber: "",
};

async function quotedPriceCents() {
  const res = await quote(
    new Request("http://localhost/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quoteBody),
    }),
  );
  const data = await res.json();
  expect(res.status, JSON.stringify(data)).toBe(200);
  return data.rates[0].customerTotalCents as number;
}

function saveMarkup(body: Record<string, unknown>, token = "valid-token") {
  return putMarkup(
    new Request("http://localhost/api/admin/shipping/markup", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-markup-unlock-token": token },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  db.config = null;
  db.audit = [];
  db.shipments = [];
  db.failReads = false;
  delete process.env.APP_MARKUP_PERCENT;
  resetConfigCache();
});

describe("live markup pricing", () => {
  it("starts at the default 11% when nothing has been set", async () => {
    expect(await quotedPriceCents()).toBe(11_100); // $100 + 11%
    expect(db.config).toMatchObject({ enabled: true, percentage: 11, fixedMarkupCents: 0 });
  });

  it("seeds the first value from APP_MARKUP_PERCENT", async () => {
    process.env.APP_MARKUP_PERCENT = "15";
    resetConfigCache();
    expect(await quotedPriceCents()).toBe(11_500);
  });

  it("applies a saved change to the very next quote", async () => {
    expect(await quotedPriceCents()).toBe(11_100);

    const res = await saveMarkup({ enabled: true, percentage: 20, fixedMarkupCents: 250 });
    expect(res.status).toBe(200);
    const saved = await res.json();
    expect(saved.example.customerShippingPriceCents).toBe(12_250); // preview in the panel

    expect(await quotedPriceCents()).toBe(12_250); // $100 + 20% + $2.50

    const last = db.shipments.at(-1)!;
    expect(last).toMatchObject({ baseCostCents: 10_000, markupCents: 2_250, customerTotalCents: 12_250, markupPercentUsed: 20 });
    expect(db.audit.at(-1)).toMatchObject({ previousPercentage: 11, newPercentage: 20, newFixedMarkupCents: 250 });
  });

  it("charges the carrier rate only when markup is switched off", async () => {
    await saveMarkup({ enabled: false, percentage: 20, fixedMarkupCents: 250 });
    expect(await quotedPriceCents()).toBe(10_000);
  });

  it("keeps earlier quotes at the price the customer was shown", async () => {
    await quotedPriceCents();
    const first = db.shipments[0];
    await saveMarkup({ enabled: true, percentage: 30, fixedMarkupCents: 0 });
    await quotedPriceCents();
    expect(first.customerTotalCents).toBe(11_100);
    expect(db.shipments[1].customerTotalCents).toBe(13_000);
  });

  it("rejects invalid values and leaves prices unchanged", async () => {
    await quotedPriceCents();
    for (const bad of [
      { enabled: true, percentage: 150, fixedMarkupCents: 0 },
      { enabled: true, percentage: -5, fixedMarkupCents: 0 },
      { enabled: true, percentage: 12.345, fixedMarkupCents: 0 },
      { enabled: true, percentage: 10, fixedMarkupCents: -100 },
    ]) {
      expect((await saveMarkup(bad)).status).toBe(400);
    }
    expect(await quotedPriceCents()).toBe(11_100);
  });

  it("requires the PIN unlock to read or change the markup", async () => {
    expect((await saveMarkup({ enabled: true, percentage: 50, fixedMarkupCents: 0 }, "nope")).status).toBe(401);
    const res = await getMarkup(new Request("http://localhost/api/admin/shipping/markup"));
    expect(res.status).toBe(401);
    expect(await quotedPriceCents()).toBe(11_100);
  });

  it("refuses to quote rather than guess a markup when the database can't be read", async () => {
    await saveMarkup({ enabled: true, percentage: 25, fixedMarkupCents: 0 });
    db.failReads = true;
    const res = await quote(
      new Request("http://localhost/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteBody),
      }),
    );
    expect(res.status).toBe(502);
    expect(db.shipments).toHaveLength(0);
  });
});
