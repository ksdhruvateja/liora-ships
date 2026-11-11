/**
 * End-to-end journey through the real API route handlers, in mock mode
 * (mock Easyship + local "payments"), with an in-memory database.
 *
 *   quote → saved addresses → configure (± pickup) → checkout → pay → label →
 *   shipment page → label PDF → tracking → cancel → refund → label voided,
 *   plus staff login, staff dashboard, staff cancel, markup PIN changes and edge cases.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FOREZSHIPS_MOCK = "true";
  process.env.ADMIN_API_SECRET = "admin-secret-for-tests";
  process.env.STAFF_API_SECRET = "staff-secret-for-tests";
  process.env.MARKUP_ADMIN_PIN = "4321";
  process.env.GMAIL_APP_PASSWORD = "";
  process.env.SLACK_WEBHOOK_URL = "";
});

const fake = vi.hoisted(() => ({ prisma: null as unknown as ReturnType<typeof import("./helpers/fake-prisma").createFakePrisma> }));

// E2E_REAL_DB=1 runs against the real Postgres in DATABASE_URL; otherwise an in-memory stand-in.
const REAL_DB = process.env.E2E_REAL_DB === "1";
vi.mock("@/lib/db", async (importOriginal) => {
  if (process.env.E2E_REAL_DB === "1") return importOriginal();
  const { createFakePrisma } = await import("./helpers/fake-prisma");
  fake.prisma = createFakePrisma();
  return { prisma: fake.prisma };
});

import { POST as quoteRoute } from "@/app/api/quote/route";
import { GET as contactsRoute } from "@/app/api/contacts/route";
import { GET as pickupSlotsRoute } from "@/app/api/easyship/pickup-slots/route";
import { POST as configureRoute } from "@/app/api/shipments/[id]/configure/route";
import { POST as checkoutRoute } from "@/app/api/checkout/route";
import { POST as payMockRoute } from "@/app/api/checkout/complete-mock/route";
import { GET as shipmentRoute } from "@/app/api/shipments/[id]/route";
import { GET as labelRoute } from "@/app/api/shipments/[id]/label/route";
import { POST as fulfillRoute } from "@/app/api/shipments/[id]/fulfill/route";
import { POST as cancelRoute } from "@/app/api/shipments/[id]/cancel/route";
import { POST as staffLoginRoute } from "@/app/api/staff/login/route";
import { GET as labelsTodayRoute } from "@/app/api/labels/today/route";
import { POST as verifyPinRoute } from "@/app/api/admin/verify-markup-pin/route";
import { GET as markupGet, PUT as markupPut } from "@/app/api/admin/shipping/markup/route";
import { GET as healthRoute } from "@/app/api/health/route";
import TrackPage from "@/app/track/[trackingNumber]/page";
import { resetConfigCache } from "@/lib/config";
import { prisma as db } from "@/lib/db";

/** Fresh read of a shipment row, from whichever database is active. */
async function row(id: string) {
  return (await db.shipment.findUnique({ where: { id } }))!;
}

async function resetDb() {
  if (!REAL_DB) return fake.prisma.reset();
  await db.markupAuditLog.deleteMany({});
  await db.savedContact.deleteMany({});
  await db.easyshipRecharge.deleteMany({});
  await db.markupPinAttempt.deleteMany({});
  await db.shipment.deleteMany({});
  await db.shippingMarkupConfig.deleteMany({});
}

const BASE = "http://localhost:3000";

function req(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, headers, ...rest } = init;
  return new Request(`${BASE}${path}`, {
    ...rest,
    method: rest.method ?? (json !== undefined ? "POST" : "GET"),
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers as Record<string, string>) },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
}

async function body(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const params = (id: string) => ({ params: { id } });
const labelsToday = async (r: Request) => (await labelsTodayRoute(r)) as Response;

const EMAIL = "Jamie.Rivera@Example.com";
const origin = {
  line1: "500 Market St",
  line2: "Suite 200",
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  countryAlpha2: "US",
  contactName: "Jamie Rivera",
  contactPhone: "4155550100",
  contactEmail: EMAIL,
  companyName: "Rivera Goods",
};
const destination = {
  line1: "350 5th Ave",
  line2: "",
  city: "New York",
  state: "NY",
  postalCode: "10001",
  countryAlpha2: "US",
  contactName: "Sam Lee",
  contactPhone: "2125550199",
  contactEmail: "sam@example.com",
  companyName: "",
};
const parcel = {
  length: 12,
  width: 9,
  height: 4,
  dimensionUnit: "in",
  weight: 3,
  weightUnit: "lb",
  description: "Clothing",
  category: "fashion",
  declaredValueCents: 8000,
};

async function getQuote(email = EMAIL, headers: Record<string, string> = {}) {
  const res = await quoteRoute(
    req("/api/quote", { json: { customerEmail: email, origin, destination, parcel, referenceNumber: "" }, headers }),
  );
  const data = await body(res);
  expect(res.status, JSON.stringify(data)).toBe(200);
  return data as { rates: { shipmentId: string; courierName: string; customerTotalCents: number }[] };
}

/** quote → configure → checkout → pay → label. Returns the shipment id. */
async function buyLabel(options: { pickup?: boolean; reference?: string; email?: string } = {}) {
  const { rates } = await getQuote(options.email);
  // Mock carrier "mock-ground" ($8.50) offers a $15 pickup slot.
  const rows = await Promise.all(rates.map((r) => row(r.shipmentId)));
  const chosen = rates[rows.findIndex((s) => s.easyshipRateId === "mock-ground")];
  const id = chosen.shipmentId;

  let pickupSlot = null;
  if (options.pickup) {
    const slotsRes = await pickupSlotsRoute(req(`/api/easyship/pickup-slots?shipmentId=${id}`));
    const slots = await body(slotsRes);
    expect(slotsRes.status).toBe(200);
    expect(slots.availability.supported).toBe(true);
    pickupSlot = slots.availability.slots[0];
  }

  const configured = await configureRoute(
    req(`/api/shipments/${id}/configure`, {
      json: { referenceNumber: options.reference ?? "ORD-1001", pickupRequired: Boolean(options.pickup), pickupSlot },
    }),
    params(id),
  );
  expect(configured.status, JSON.stringify(await body(configured.clone()))).toBe(200);

  const checkout = await checkoutRoute(req("/api/checkout", { json: { shipmentId: id } }));
  const checkoutData = await body(checkout);
  expect(checkout.status).toBe(200);
  expect(checkoutData.mock).toBe(true);

  const paid = await payMockRoute(req("/api/checkout/complete-mock", { json: { shipmentId: id } }));
  expect(paid.status, JSON.stringify(await body(paid.clone()))).toBe(200);
  return { id, checkout: checkoutData };
}

async function publicShipment(id: string) {
  const res = await shipmentRoute(req(`/api/shipments/${id}`), params(id));
  expect(res.status).toBe(200);
  return (await body(res)).shipment;
}

async function cancel(id: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) {
  const res = await cancelRoute(req(`/api/shipments/${id}/cancel`, { json: payload, headers }), params(id));
  return { status: res.status, data: await body(res) };
}

async function staffCookie(password: string) {
  const res = await staffLoginRoute(req("/api/staff/login", { json: { password } }));
  const setCookie = res.headers.get("set-cookie") ?? "";
  return { status: res.status, cookie: setCookie.split(";")[0], data: await body(res) };
}

async function trackingRenders(trackingNumber: string) {
  try {
    await TrackPage({ params: { trackingNumber } });
    return true;
  } catch (error) {
    if (String((error as { digest?: string }).digest ?? error).includes("NEXT_NOT_FOUND")) return false;
    throw error;
  }
}

beforeAll(() => {
  resetConfigCache();
});

beforeEach(async () => {
  await resetDb();
  delete process.env.CANCELLATION_FEE_CENTS;
  delete process.env.CANCEL_WINDOW_DAYS;
  resetConfigCache();
});

describe("customer journey: quote → pay → label", () => {
  it("returns live rates with the 11% markup, cheapest first", async () => {
    const { rates } = await getQuote();
    expect(rates.length).toBe(3);
    const totals = rates.map((r) => r.customerTotalCents);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
    // mock carrier rates $8.50 / $14.20 / $28.00 + 11%
    expect(totals).toEqual([944, 1576, 3108]);
    expect(rates.every((r) => !/ups|fedex|usps/i.test(r.courierName) || r.courierName.length > 0)).toBe(true);
  });

  it("buys a label after payment and exposes it on the shipment page", async () => {
    const { id, checkout } = await buyLabel();
    expect(checkout.amountCents).toBe(944);

    const s = await publicShipment(id);
    expect(s.status).toBe("LABEL_CREATED");
    expect(s.trackingNumber).toBeTruthy();
    expect(s.referenceNumber).toBe("ORD-1001");
    expect(s.labelDownloadUrl).toContain(`/api/shipments/${id}/label`);
    expect(s.canCancel).toBe(true);
    expect(s.refundEstimateCents).toBe(944);
    expect(new Date(s.cancelDeadline).getTime()).toBeGreaterThan(Date.now() + 29 * 864e5);

    const pdf = await labelRoute(req(`/api/shipments/${id}/label`), params(id));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(200);

    expect(await trackingRenders(s.trackingNumber)).toBe(true);
  });

  it("adds a pickup fee on top of the marked-up shipping price", async () => {
    const { id, checkout } = await buyLabel({ pickup: true });
    expect(checkout.shippingCents).toBe(944);
    expect(checkout.pickupCents).toBe(1500);
    expect(checkout.amountCents).toBe(2444);
    const s = await publicShipment(id);
    expect(s.pickupRequired).toBe(true);
    expect(s.finalCustomerTotalCents).toBe(2444);
  });

  it("remembers From/To addresses for the saved-address popup (any email casing)", async () => {
    const before = await body(await contactsRoute(req(`/api/contacts?email=${encodeURIComponent(EMAIL)}`)));
    expect(before.contacts).toEqual([]);

    await buyLabel();
    await buyLabel(); // same addresses again → still one of each, not duplicates

    const res = await contactsRoute(req(`/api/contacts?email=${encodeURIComponent(EMAIL.toUpperCase())}`));
    const { contacts } = await body(res);
    const roles = contacts.map((c: { role: string }) => c.role).sort();
    expect(roles).toEqual(["DESTINATION", "ORIGIN"]);
    const from = contacts.find((c: { role: string }) => c.role === "ORIGIN");
    expect(from.address).toMatchObject({ line1: "500 Market St", city: "San Francisco", state: "CA", postalCode: "94105" });

    const junk = await body(await contactsRoute(req("/api/contacts?email=not-an-email")));
    expect(junk.contacts).toEqual([]);
  });

  it("is safe to call fulfill again after the label exists (no second label)", async () => {
    const { id } = await buyLabel();
    const labelId = (await row(id)).easyshipShipmentId;
    const again = await fulfillRoute(req(`/api/shipments/${id}/fulfill`, { method: "POST" }), params(id));
    expect(again.status).toBe(200);
    expect((await row(id)).easyshipShipmentId).toBe(labelId);
  });

  it("rejects checkout for expired, already-paid, or unknown quotes", async () => {
    const { rates } = await getQuote();
    const id = rates[0].shipmentId;
    await db.shipment.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await checkoutRoute(req("/api/checkout", { json: { shipmentId: id } }))).status).toBe(410);

    const { id: paidId } = await buyLabel();
    expect((await checkoutRoute(req("/api/checkout", { json: { shipmentId: paidId } }))).status).toBe(409);
    expect((await checkoutRoute(req("/api/checkout", { json: { shipmentId: "nope" } }))).status).toBe(404);
    expect((await checkoutRoute(req("/api/checkout", { json: {} }))).status).toBe(400);
  });

  it("rejects bad quote input with a friendly message", async () => {
    const res = await quoteRoute(req("/api/quote", { json: { customerEmail: "x", origin: {}, destination: {}, parcel: {} } }));
    expect(res.status).toBe(400);
    expect((await body(res)).error).toMatch(/check the shipment details/i);
  });
});

describe("cancelling a label", () => {
  it("customer cancels: carrier voids, full refund, label & tracking disabled", async () => {
    const { id } = await buyLabel();
    const tracking = (await publicShipment(id)).trackingNumber;

    expect((await cancel(id, {})).status).toBe(400); // must confirm email
    expect((await cancel(id, { email: "bad" })).status).toBe(400);
    const wrong = await cancel(id, { email: "someone@else.com" });
    expect(wrong.status).toBe(403);
    expect((await row(id)).status).toBe("LABEL_CREATED");

    const ok = await cancel(id, { email: EMAIL.toLowerCase(), reason: "Wrong address or details" });
    expect(ok.status, JSON.stringify(ok.data)).toBe(200);
    expect(ok.data.shipment).toMatchObject({
      status: "REFUNDED",
      refundStatus: "SUCCEEDED",
      refundCents: 944,
      canCancel: false,
      labelDownloadUrl: null,
      trackingUrl: null,
    });

    const saved = await row(id);
    expect(saved.cancelReason).toBe("Wrong address or details");
    expect(saved.cancelledBy).toBe(`customer:${EMAIL.toLowerCase()}`);
    expect(saved.stripeRefundId).toBeTruthy();

    expect((await labelRoute(req(`/api/shipments/${id}/label`), params(id))).status).toBe(410);
    expect(await trackingRenders(tracking)).toBe(false);

    // Repeat clicks are harmless, and fulfill can never re-buy a refunded label.
    const again = await cancel(id, { email: EMAIL });
    expect(again.status).toBe(200);
    expect(again.data.shipment.refundCents).toBe(944);
    await fulfillRoute(req(`/api/shipments/${id}/fulfill`, { method: "POST" }), params(id));
    expect((await row(id)).status).toBe("REFUNDED");
  });

  it("refunds the pickup fee too, and applies a configured cancellation fee", async () => {
    process.env.CANCELLATION_FEE_CENTS = "300";
    resetConfigCache();
    const { id } = await buyLabel({ pickup: true });
    expect((await publicShipment(id)).refundEstimateCents).toBe(2144);
    const ok = await cancel(id, { email: EMAIL });
    expect(ok.status).toBe(200);
    expect(ok.data.shipment.refundCents).toBe(2144); // $24.44 − $3.00
  });

  it("refuses when the carrier has already scanned the parcel", async () => {
    const { id } = await buyLabel();
    await db.shipment.update({ where: { id }, data: { easyshipShipmentId: "MOCK-INTRANSIT-1" } });
    const res = await cancel(id, { email: EMAIL });
    expect(res.status).toBe(409);
    expect(res.data.code).toBe("carrier_refused");
    const s = await publicShipment(id);
    expect(s.status).toBe("LABEL_CREATED");
    expect(s.labelDownloadUrl).toBeTruthy(); // label still usable
    expect(s.canCancel).toBe(true);
  });

  it("closes online cancellation after the window, but staff can still cancel", async () => {
    const { id } = await buyLabel();
    const old = new Date(Date.now() - 45 * 864e5);
    await db.shipment.update({ where: { id }, data: { labelGeneratedAt: old, createdAt: old } });

    expect((await publicShipment(id)).canCancel).toBe(false);
    const customer = await cancel(id, { email: EMAIL });
    expect(customer.status).toBe(409);
    expect(customer.data.code).toBe("window_closed");

    const { cookie } = await staffCookie("staff-secret-for-tests");
    const staff = await cancel(id, { reason: "Cancelled by staff" }, { cookie });
    expect(staff.status).toBe(200);
    expect(staff.data.shipment.status).toBe("REFUNDED");
    expect((await row(id)).cancelledBy).toBe("staff:employee");
  });

  it("can't cancel a quote that was never paid", async () => {
    const { rates } = await getQuote();
    const res = await cancel(rates[0].shipmentId, { email: EMAIL });
    expect(res.status).toBe(409);
    expect(res.data.code).toBe("not_eligible");
    expect((await cancel("does-not-exist", { email: EMAIL })).status).toBe(404);
  });

  it("turns online cancellation off when CANCEL_WINDOW_DAYS=0", async () => {
    process.env.CANCEL_WINDOW_DAYS = "0";
    resetConfigCache();
    const { id } = await buyLabel();
    expect((await publicShipment(id)).canCancel).toBe(false);
    expect((await cancel(id, { email: EMAIL })).status).toBe(409);
  });
});

describe("staff dashboard", () => {
  it("rejects wrong passwords and requires a session for labels", async () => {
    expect((await staffCookie("wrong")).status).toBe(401);
    expect((await staffLoginRoute(req("/api/staff/login", { json: {} }))).status).toBe(400);
    expect((await labelsToday(req("/api/labels/today"))).status).toBe(401);
  });

  it("lists today's labels with cancel actions and refund status", async () => {
    const { id: a } = await buyLabel({ reference: "ORD-A" });
    const { id: b } = await buyLabel({ reference: "ORD-B" });
    await cancel(b, { email: EMAIL });

    const { cookie, data } = await staffCookie("admin-secret-for-tests");
    expect(data.role).toBe("admin");
    const res = await labelsToday(req("/api/labels/today", { headers: { cookie } }));
    const json = await body(res);
    expect(res.status).toBe(200);
    expect(json.total).toBe(2);
    const rowA = json.labels.find((l: { id: string }) => l.id === a);
    const rowB = json.labels.find((l: { id: string }) => l.id === b);
    expect(rowA).toMatchObject({ labelStatus: "LABEL_CREATED", canCancel: true, referenceNumber: "ORD-A" });
    expect(rowA.markupCents).toBe(94); // admins see profit
    expect(rowB).toMatchObject({ labelStatus: "REFUNDED", canCancel: false, refundCents: 944, labelDownloadUrl: null });

    const search = await body(await labelsToday(req("/api/labels/today?q=ORD-A", { headers: { cookie } })));
    expect(search.labels.map((l: { id: string }) => l.id)).toEqual([a]);

    const employee = await staffCookie("staff-secret-for-tests");
    const empRows = await body(await labelsToday(req("/api/labels/today", { headers: { cookie: employee.cookie } })));
    expect(empRows.labels[0].markupCents).toBeNull(); // employees don't see profit
  });

  it("records the staff member's quotes as created by staff", async () => {
    const { cookie } = await staffCookie("staff-secret-for-tests");
    const { rates } = await getQuote(EMAIL, { cookie });
    expect((await row(rates[0].shipmentId)).createdBy).toBe("employee");
  });
});

describe("markup PIN panel", () => {
  async function unlock(pin: string) {
    const res = await verifyPinRoute(
      req("/api/admin/verify-markup-pin", { json: { pin }, headers: { "x-nf-client-connection-ip": "203.0.113.7" } }),
    );
    return { status: res.status, data: await body(res) };
  }

  it("unlocks with the right PIN, changes pricing for the next quote only", async () => {
    expect((await unlock("0000")).status).toBe(401);
    const { status, data } = await unlock("4321");
    expect(status).toBe(200);
    const token = data.unlockToken as string;
    const headers = { "x-markup-unlock-token": token };

    const current = await body(await markupGet(req("/api/admin/shipping/markup", { headers })));
    expect(current.settings).toMatchObject({ enabled: true, percentage: 11, fixedMarkupCents: 0 });
    expect(current.example.customerShippingPriceCents).toBe(11_100);

    const { rates: before } = await getQuote();
    const saved = await markupPut(
      req("/api/admin/shipping/markup", { method: "PUT", json: { enabled: true, percentage: 25, fixedMarkupCents: 100 }, headers }),
    );
    expect(saved.status).toBe(200);
    const { rates: after } = await getQuote();

    expect(after[0].customerTotalCents).toBe(850 + 213 + 100); // $8.50 + 25% + $1.00
    // The earlier quote keeps the price the customer saw.
    expect((await row(before[0].shipmentId)).customerTotalCents).toBe(944);

    const health = await body(await healthRoute());
    expect(health.markup).toMatchObject({ source: "database", percentage: 25, fixedMarkupCents: 100 });
    expect(await db.markupAuditLog.findFirst({ orderBy: { createdAt: "desc" } })).toMatchObject({ previousPercentage: 11, newPercentage: 25 });
  });

  it("locks out after 5 wrong PINs", async () => {
    for (let i = 0; i < 5; i++) await unlock("1111");
    expect((await unlock("4321")).status).toBe(429);
  });
});
