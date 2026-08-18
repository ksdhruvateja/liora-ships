import { prisma } from "../src/lib/db";
import { getEnvMarkupRule } from "../src/lib/config";
import { applyMarkup } from "../src/lib/markup";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

const payload = {
  customerEmail: "flow-test@lioralabs.example",
  origin: {
    line1: "1 Market St",
    line2: "",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    countryAlpha2: "US",
    contactName: "Alex Shipper",
    contactPhone: "+14155550100",
    contactEmail: "flow-test@lioralabs.example",
    companyName: "Liora Labs",
  },
  destination: {
    line1: "350 5th Ave",
    line2: "",
    city: "New York",
    state: "NY",
    postalCode: "10118",
    countryAlpha2: "US",
    contactName: "Jordan Receiver",
    contactPhone: "+12125550100",
    contactEmail: "recv@example.com",
    companyName: "",
  },
  parcel: {
    length: 10,
    width: 8,
    height: 4,
    dimensionUnit: "in",
    weight: 2,
    weightUnit: "lb",
    description: "Merchandise",
    declaredValueCents: 2500,
  },
};

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  const health = await fetch(`${baseUrl}/api/health`);
  const healthBody = await health.json();
  if (!health.ok || !healthBody.ok) {
    throw new Error(`Health failed: ${health.status} ${JSON.stringify(healthBody)}`);
  }

  const quote = await post("/api/quote", payload);
  if (quote.status !== 200 || !Array.isArray(quote.data.rates) || quote.data.rates.length === 0) {
    throw new Error(`Quote failed: ${quote.status} ${JSON.stringify(quote.data)}`);
  }

  const publicRate = quote.data.rates[0];
  const leaked = JSON.stringify(quote.data);
  if (/easyship|baseCost|markupCents/i.test(leaked)) {
    throw new Error("Quote response leaked provider or cost internals");
  }

  const row = await prisma.shipment.findUnique({ where: { id: publicRate.shipmentId } });
  if (!row) throw new Error("Quoted shipment missing in database");

  const expected = applyMarkup(row.baseCostCents, getEnvMarkupRule());
  const markupOk = row.markupCents === expected.markupCents;
  const totalOk = row.customerTotalCents === row.baseCostCents + row.markupCents;
  const publicMatches = publicRate.customerTotalCents === row.customerTotalCents;

  const checkout = await post("/api/checkout", { shipmentId: row.id });
  if (checkout.status !== 200) {
    throw new Error(`Checkout failed: ${checkout.status} ${JSON.stringify(checkout.data)}`);
  }
  const checkoutAmountOk = checkout.data.amountCents === row.customerTotalCents;
  const checkoutNotBase = checkout.data.amountCents !== row.baseCostCents || row.markupCents === 0;

  const fulfill = await post(`/api/shipments/${row.id}/fulfill`, {});
  const fulfillBlocked = fulfill.status === 409;

  const sample = quote.data.rates.slice(0, 5).map((rate: { courierName: string; customerTotalCents: number }) => ({
    courierName: rate.courierName,
    customerTotal: (rate.customerTotalCents / 100).toFixed(2),
  }));

  console.log(
    JSON.stringify(
      {
        health: healthBody,
        ratesReturned: quote.data.rates.length,
        cheapestPublic: {
          courierName: publicRate.courierName,
          customerTotal: (publicRate.customerTotalCents / 100).toFixed(2),
          currency: publicRate.currency,
        },
        markup: {
          percent: getEnvMarkupRule().value,
          type: getEnvMarkupRule().type,
          baseCost: (row.baseCostCents / 100).toFixed(2),
          markup: (row.markupCents / 100).toFixed(2),
          customerPays: (row.customerTotalCents / 100).toFixed(2),
          markupMatchesEnv: markupOk,
          totalEqualsBasePlusMarkup: totalOk,
          publicPriceIsMarkedUp: publicMatches,
        },
        checkout: {
          status: checkout.status,
          amount: (checkout.data.amountCents / 100).toFixed(2),
          chargesMarkedUpTotal: checkoutAmountOk && checkoutNotBase,
          hasClientSecret: Boolean(checkout.data.clientSecret),
          mock: Boolean(checkout.data.mock),
        },
        unpaidFulfillBlocked: fulfillBlocked,
        sampleRates: sample,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
