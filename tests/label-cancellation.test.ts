import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Shipment } from "@prisma/client";

const store = vi.hoisted(() => ({ rows: new Map<string, Shipment>() }));

vi.mock("@/lib/db", () => {
  const prisma = {
    $queryRaw: vi.fn().mockRejectedValue(new Error("no pg in tests")),
    shipment: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => store.rows.get(id) ?? null),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<Shipment> }) => {
        const existing = store.rows.get(id);
        if (!existing) throw new Error("missing shipment");
        const next = { ...existing, ...data, updatedAt: new Date() } as Shipment;
        store.rows.set(id, next);
        return next;
      }),
    },
  };
  return { prisma };
});

import { CancelError, cancelLabel, isCancellable, refundAmountCents } from "@/lib/cancellation";
import { resetConfigCache } from "@/lib/config";
import type { EasyshipClient } from "@/lib/easyship";

const DAY = 24 * 60 * 60 * 1000;

function shipment(overrides: Partial<Shipment> = {}): Shipment {
  const now = new Date();
  return {
    id: "ship_1",
    quoteGroupId: "qg",
    customerEmail: "buyer@example.com",
    originAddress: {},
    destAddress: {},
    parcel: {},
    selectedCourierId: "svc",
    easyshipRateId: "rate",
    easyshipCourierName: "UPS Ground",
    brandedCourierName: "Liora Ground",
    currency: "USD",
    baseCostCents: 900,
    markupCents: 100,
    markupPercentUsed: 11,
    customerTotalCents: 1000,
    finalCustomerTotalCents: 1500,
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    referenceNumber: null,
    pickupRequired: false,
    easyshipOriginAddressId: null,
    pickupSlotId: null,
    pickupDate: null,
    pickupFromTime: null,
    pickupToTime: null,
    pickupTimezone: null,
    pickupPriceCents: null,
    pickupBaseCostCents: null,
    pickupCustomerCents: 0,
    pickupCurrency: null,
    easyshipPickupId: null,
    pickupStatus: "NONE",
    pickupErrorCode: null,
    pickupErrorMessage: null,
    labelGeneratedAt: now,
    businessDate: null,
    createdBy: null,
    stripePaymentIntentId: "pi_123",
    status: "LABEL_CREATED",
    easyshipShipmentId: "ES123",
    labelUrl: "https://label",
    trackingNumber: "TRK1",
    fulfillmentAttempts: 1,
    lastError: null,
    labelEmailSentAt: now,
    cancelRequestedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    refundStatus: "NONE",
    refundCents: null,
    stripeRefundId: null,
    refundedAt: null,
    refundError: null,
    expiresAt: new Date(now.getTime() + DAY),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function easyship(result: Awaited<ReturnType<EasyshipClient["cancelShipment"]>>) {
  return { cancelShipment: vi.fn().mockResolvedValue(result) } as unknown as EasyshipClient;
}

const customer = { type: "customer" as const, email: "Buyer@Example.com" };
const quiet = { alert: vi.fn().mockResolvedValue(undefined), sendEmail: vi.fn().mockResolvedValue(undefined) };

beforeEach(() => {
  store.rows.clear();
  delete process.env.CANCELLATION_FEE_CENTS;
  delete process.env.CANCEL_WINDOW_DAYS;
  resetConfigCache();
  vi.clearAllMocks();
});

describe("label cancellation", () => {
  it("voids the label and refunds the full amount paid", async () => {
    store.rows.set("ship_1", shipment());
    const es = easyship({ ok: true, message: "Shipment successfully cancelled" });
    const refund = vi.fn().mockResolvedValue({ id: "re_1", status: "succeeded" });

    const result = await cancelLabel("ship_1", customer, { reason: "Wrong address" }, { ...quiet, easyship: es, refund });

    expect(es.cancelShipment).toHaveBeenCalledWith("ES123");
    expect(refund).toHaveBeenCalledWith({
      paymentIntentId: "pi_123",
      amountCents: 1500,
      idempotencyKey: "label-cancel-refund-ship_1",
      shipmentId: "ship_1",
    });
    expect(result.status).toBe("REFUNDED");
    expect(result.refundStatus).toBe("SUCCEEDED");
    expect(result.stripeRefundId).toBe("re_1");
    expect(result.cancelReason).toBe("Wrong address");
    expect(result.cancelledBy).toBe("customer:buyer@example.com");
  });

  it("keeps the cancellation fee when one is configured", async () => {
    process.env.CANCELLATION_FEE_CENTS = "200";
    resetConfigCache();
    store.rows.set("ship_1", shipment());
    const refund = vi.fn().mockResolvedValue({ id: "re_1", status: "succeeded" });

    await cancelLabel("ship_1", customer, {}, { ...quiet, easyship: easyship({ ok: true, message: "ok" }), refund });

    expect(refund.mock.calls[0][0].amountCents).toBe(1300);
    expect(refundAmountCents(shipment(), 5000)).toBe(0);
  });

  it("rejects a customer whose email doesn't match", async () => {
    store.rows.set("ship_1", shipment());
    const es = easyship({ ok: true, message: "ok" });
    await expect(
      cancelLabel("ship_1", { type: "customer", email: "someone@else.com" }, {}, { ...quiet, easyship: es }),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(es.cancelShipment).not.toHaveBeenCalled();
  });

  it("does not refund when the carrier refuses (parcel already moving)", async () => {
    store.rows.set("ship_1", shipment());
    const refund = vi.fn();
    await expect(
      cancelLabel(
        "ship_1",
        customer,
        {},
        { ...quiet, easyship: easyship({ ok: false, reason: "not_cancellable", message: "cannot" }), refund },
      ),
    ).rejects.toMatchObject({ code: "carrier_refused" });
    expect(refund).not.toHaveBeenCalled();
    const after = store.rows.get("ship_1")!;
    expect(after.status).toBe("LABEL_CREATED");
    expect(after.cancelledAt).toBeNull();
    expect(after.cancelRequestedAt).toBeNull();
  });

  it("resumes at the refund step without voiding twice when Stripe failed", async () => {
    store.rows.set("ship_1", shipment());
    const es = easyship({ ok: true, message: "ok" });
    const failing = vi.fn().mockRejectedValue(new Error("card network down"));

    await expect(cancelLabel("ship_1", customer, {}, { ...quiet, easyship: es, refund: failing })).rejects.toBeInstanceOf(
      CancelError,
    );
    const mid = store.rows.get("ship_1")!;
    expect(mid.cancelledAt).not.toBeNull();
    expect(mid.refundStatus).toBe("FAILED");
    expect(isCancellable(mid)).toBe(false);

    const working = vi.fn().mockResolvedValue({ id: "re_2", status: "succeeded" });
    const done = await cancelLabel("ship_1", customer, {}, { ...quiet, easyship: es, refund: working });

    expect(es.cancelShipment).toHaveBeenCalledTimes(1);
    expect(working.mock.calls[0][0].idempotencyKey).toBe("label-cancel-refund-ship_1");
    expect(done.status).toBe("REFUNDED");
  });

  it("is a no-op once already refunded", async () => {
    store.rows.set("ship_1", shipment({ status: "REFUNDED", refundStatus: "SUCCEEDED", cancelledAt: new Date() }));
    const es = easyship({ ok: true, message: "ok" });
    const refund = vi.fn();
    const result = await cancelLabel("ship_1", customer, {}, { ...quiet, easyship: es, refund });
    expect(result.status).toBe("REFUNDED");
    expect(es.cancelShipment).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it("closes the customer window but still lets staff cancel", async () => {
    const old = new Date(Date.now() - 45 * DAY);
    store.rows.set("ship_1", shipment({ labelGeneratedAt: old, createdAt: old }));
    const es = easyship({ ok: true, message: "ok" });
    const refund = vi.fn().mockResolvedValue({ id: "re_3", status: "succeeded" });

    await expect(cancelLabel("ship_1", customer, {}, { ...quiet, easyship: es, refund })).rejects.toMatchObject({
      code: "window_closed",
    });
    const result = await cancelLabel("ship_1", { type: "staff", role: "admin" }, {}, { ...quiet, easyship: es, refund });
    expect(result.status).toBe("REFUNDED");
    expect(result.cancelledBy).toBe("staff:admin");
  });

  it("refuses labels that were never purchased", async () => {
    store.rows.set("ship_1", shipment({ status: "PAID", easyshipShipmentId: null }));
    await expect(
      cancelLabel("ship_1", customer, {}, { ...quiet, easyship: easyship({ ok: true, message: "ok" }) }),
    ).rejects.toMatchObject({ code: "not_eligible" });
  });
});
