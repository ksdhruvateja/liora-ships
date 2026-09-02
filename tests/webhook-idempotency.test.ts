import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { Shipment } from "@prisma/client";

const store = vi.hoisted(() => {
  const rows = new Map<string, Shipment>();
  const recharges = new Map<string, Record<string, unknown>>();
  return { rows, recharges };
});

import type { EasyshipClient } from "@/lib/easyship";

function walletEasyship(extra: Partial<EasyshipClient> = {}): EasyshipClient {
  return {
    requestRates: vi.fn(),
    getWalletBalance: vi.fn().mockResolvedValue({
      balanceCents: 1_000_000,
      availableBalanceCents: 1_000_000,
      currency: "USD",
    }),
    addWalletCredit: vi.fn(),
    resolveOriginAddress: vi.fn().mockResolvedValue("origin-1"),
    listPickupSlots: vi.fn(),
    createPickup: vi.fn(),
    listShipmentsByLabelGeneratedAt: vi.fn(),
    createShipmentAndBuyLabel: vi.fn(),
    ...extra,
  };
}

vi.mock("@/lib/db", () => {
  const prisma = {
    $executeRawUnsafe: vi.fn().mockRejectedValue(new Error("no pg in tests")),
    easyshipRecharge: {
      findUnique: vi.fn(async ({ where: { shipmentId } }: { where: { shipmentId: string } }) => {
        return store.recharges.get(shipmentId) ?? null;
      }),
      upsert: vi.fn(async ({
        where: { shipmentId },
        create,
        update,
      }: {
        where: { shipmentId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const existing = store.recharges.get(shipmentId);
        const next = { ...(existing ?? create), ...update, shipmentId };
        store.recharges.set(shipmentId, next);
        return next;
      }),
      update: vi.fn(async ({
        where: { shipmentId },
        data,
      }: {
        where: { shipmentId: string };
        data: Record<string, unknown>;
      }) => {
        const existing = store.recharges.get(shipmentId);
        if (!existing) throw new Error("missing recharge");
        const next = { ...existing, ...data };
        store.recharges.set(shipmentId, next);
        return next;
      }),
    },
    shipment: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return store.rows.get(id) ?? null;
      }),
      updateMany: vi.fn(async ({
        where,
        data,
      }: {
        where: { id: string; status?: string | { in: string[] } };
        data: Partial<Shipment>;
      }) => {
        const row = store.rows.get(where.id);
        if (!row) return { count: 0 };
        if (typeof where.status === "string" && row.status !== where.status) {
          return { count: 0 };
        }
        if (where.status && typeof where.status === "object" && "in" in where.status) {
          if (!where.status.in.includes(row.status)) return { count: 0 };
        }
        store.rows.set(where.id, { ...row, ...data } as Shipment);
        return { count: 1 };
      }),
      update: vi.fn(async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.rows.get(id);
        if (!row) throw new Error("missing");
        const next = { ...row } as Shipment & Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === "object" && "increment" in (value as object)) {
            next[key] = Number(next[key] ?? 0) + Number((value as { increment: number }).increment);
          } else {
            next[key] = value as never;
          }
        }
        store.rows.set(id, next as Shipment);
        return next as Shipment;
      }),
    },
  };
  return { prisma };
});

import { handleStripeEvent } from "@/lib/stripe-webhook";

function quotedShipment(): Shipment {
  const now = new Date();
  return {
    id: "ship_1",
    quoteGroupId: "qg_1",
    customerEmail: "buyer@example.com",
    originAddress: {},
    destAddress: {},
    parcel: {},
    selectedCourierId: "courier_abc",
    easyshipRateId: "courier_abc",
    easyshipCourierName: "Hidden Courier Express",
    brandedCourierName: "Liora Express",
    currency: "USD",
    baseCostCents: 1000,
    markupCents: 200,
    markupPercentUsed: 11,
    customerTotalCents: 1200,
    finalCustomerTotalCents: 1200,
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
    labelGeneratedAt: null,
    businessDate: null,
    createdBy: null,
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    stripePaymentIntentId: null,
    status: "QUOTED",
    easyshipShipmentId: null,
    labelUrl: null,
    trackingNumber: null,
    fulfillmentAttempts: 0,
    lastError: null,
    labelEmailSentAt: null,
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };
}

function succeededEvent(): Stripe.Event {
  return {
    id: "evt_1",
    object: "event",
    api_version: "2024-06-20",
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_123",
        object: "payment_intent",
        metadata: { shipmentId: "ship_1" },
      } as unknown as Stripe.PaymentIntent,
    },
  } as Stripe.Event;
}

describe("stripe webhook idempotency", () => {
  beforeEach(() => {
    store.rows.clear();
    store.recharges.clear();
    store.rows.set("ship_1", quotedShipment());
  });

  it("purchases the label once when the same succeeded event is delivered twice", async () => {
    const easyship = walletEasyship({
      createShipmentAndBuyLabel: vi.fn().mockResolvedValue({
        easyshipShipmentId: "ES_SECRET",
        labelUrl: "https://provider.example/labels/secret.pdf",
        trackingNumber: "1Z999",
      }),
    });
    const sendEmail = vi.fn().mockResolvedValue({ id: "email_1" });
    const alert = vi.fn();
    const event = succeededEvent();

    await handleStripeEvent(event, { easyship, sendEmail, alert });
    await handleStripeEvent(event, { easyship, sendEmail, alert });

    expect(easyship.createShipmentAndBuyLabel).toHaveBeenCalledTimes(1);
    expect(easyship.createShipmentAndBuyLabel).toHaveBeenCalledWith(
      expect.objectContaining({ courierServiceId: "courier_abc" }),
    );
    const row = store.rows.get("ship_1");
    expect(row?.status).toBe("LABEL_CREATED");
    expect(row?.trackingNumber).toBe("1Z999");
  });

  it("marks FAILED on payment_intent.payment_failed without buying a label", async () => {
    const easyship = walletEasyship({
      createShipmentAndBuyLabel: vi.fn(),
    });
    await handleStripeEvent(
      {
        ...succeededEvent(),
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_fail",
            object: "payment_intent",
            metadata: { shipmentId: "ship_1" },
            last_payment_error: { message: "card declined" },
          } as unknown as Stripe.PaymentIntent,
        },
      } as Stripe.Event,
      { easyship },
    );
    expect(easyship.createShipmentAndBuyLabel).not.toHaveBeenCalled();
    expect(store.rows.get("ship_1")?.status).toBe("FAILED");
  });

  it("retries label purchase after a paid shipment failed at the carrier", async () => {
    store.rows.set("ship_1", {
      ...quotedShipment(),
      status: "FAILED",
      stripePaymentIntentId: "pi_123",
      lastError: "origin_address.company_name can't be blank",
      fulfillmentAttempts: 4,
    });
    const easyship = walletEasyship({
      createShipmentAndBuyLabel: vi.fn().mockResolvedValue({
        easyshipShipmentId: "ES_SECRET",
        labelUrl: "https://provider.example/labels/secret.pdf",
        trackingNumber: "1Z999",
      }),
    });
    const sendEmail = vi.fn().mockResolvedValue({ id: "email_1" });
    const alert = vi.fn();

    await handleStripeEvent(succeededEvent(), { easyship, sendEmail, alert });

    expect(easyship.createShipmentAndBuyLabel).toHaveBeenCalledTimes(1);
    expect(store.rows.get("ship_1")?.status).toBe("LABEL_CREATED");
    expect(store.rows.get("ship_1")?.trackingNumber).toBe("1Z999");
  });
});
