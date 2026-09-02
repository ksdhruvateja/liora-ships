import { describe, expect, it } from "vitest";
import type { Shipment } from "@prisma/client";
import {
  normalizePickupSlotsResponse,
  pickupCustomerCentsFromSlot,
  pickupSlotKey,
} from "@/lib/easyship-pickups";
import { parseReferenceNumber, sanitizeReferenceNumber } from "@/lib/reference-number";
import { getBusinessDayRange, businessDateForTimestamp } from "@/lib/business-time";
import { toTodayLabelRow } from "@/lib/labels-today";
import { calculateRechargeAmountCents } from "@/lib/easyship-recharge";
import { applyMarkup } from "@/lib/markup";
import { createMockEasyshipClient } from "@/lib/easyship-mock";

function baseShipment(overrides: Partial<Shipment> = {}): Shipment {
  const now = new Date();
  return {
    id: "ship_pickup",
    quoteGroupId: "qg",
    customerEmail: "buyer@example.com",
    originAddress: {},
    destAddress: {},
    parcel: {},
    selectedCourierId: "mock-ground",
    easyshipRateId: "mock-ground",
    easyshipCourierName: "UPS Ground",
    brandedCourierName: "UPS Ground",
    currency: "USD",
    baseCostCents: 850,
    markupCents: 200,
    markupPercentUsed: 11,
    customerTotalCents: 1050,
    finalCustomerTotalCents: 1050,
    estimatedMinDays: 5,
    estimatedMaxDays: 7,
    referenceNumber: null,
    pickupRequired: false,
    easyshipOriginAddressId: "origin-1",
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
    stripePaymentIntentId: null,
    status: "PAID",
    easyshipShipmentId: "ESHIP-1",
    labelUrl: "https://example.com/label.pdf",
    trackingNumber: "1ZTEST",
    fulfillmentAttempts: 1,
    lastError: null,
    labelEmailSentAt: null,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("pickup availability", () => {
  it("disables pickup when Easyship returns 404", () => {
    const availability = normalizePickupSlotsResponse("svc-1", {}, 404);
    expect(availability.supported).toBe(false);
    expect(availability.message).toContain("Pickup is not available");
    expect(availability.slots).toHaveLength(0);
  });

  it("loads slots from the Easyship response shape", async () => {
    const easyship = createMockEasyshipClient();
    const availability = await easyship.listPickupSlots({
      courierServiceId: "mock-ground",
      originAddressId: "origin-1",
    });
    expect(availability.supported).toBe(true);
    expect(availability.slots.length).toBeGreaterThan(0);
    expect(availability.slots[0].priceCents).toBe(1500);
  });

  it("clears slot identity when courier changes", () => {
    const slotA = {
      courierServiceId: "courier-a",
      pickupDate: "2026-09-02",
      timeSlotId: "slot-1",
      fromTime: "09:00",
      toTime: "12:00",
    };
    const slotB = { ...slotA, courierServiceId: "courier-b" };
    expect(pickupSlotKey(slotA)).not.toBe(pickupSlotKey(slotB));
  });
});

describe("pickup pricing", () => {
  it("does not markup pickup price", () => {
    const slot = {
      timeSlotId: "slot-1",
      pickupDate: "2026-09-02",
      fromTime: "12:00",
      toTime: "16:00",
      timezone: "America/New_York",
      priceCents: 1500,
      currency: "USD",
      courierServiceId: "mock-ground",
      expiresAt: null,
      raw: {},
    };
    expect(pickupCustomerCentsFromSlot(slot)).toBe(1500);
    const shipping = applyMarkup(29000, { type: "PERCENT", value: 8.27, minCents: 0, maxCents: 100000 });
    const finalTotal = shipping.customerTotalCents + pickupCustomerCentsFromSlot(slot)!;
    expect(finalTotal).toBe(31398 + 1500);
  });

  it("still applies markup to shipping only", () => {
    const priced = applyMarkup(29000, { type: "PERCENT", value: 8.27, minCents: 0, maxCents: 100000 });
    expect(priced.customerTotalCents).toBe(31398);
    expect(priced.markupCents).toBe(2398);
  });

  it("treats explicit zero pickup as free", () => {
    const availability = normalizePickupSlotsResponse(
      "svc-1",
      {
        courier_service_handover_option: {
          pickup_slots: [
            {
              date: "2026-09-02",
              time_slots: [{ time_slot_id: "free", from_time: "10:00", to_time: "14:00", price: 0 }],
            },
          ],
        },
      },
      200,
    );
    expect(availability.slots[0].priceCents).toBe(0);
  });

  it("keeps missing pickup price as null instead of zero", () => {
    const availability = normalizePickupSlotsResponse(
      "svc-1",
      {
        courier_service_handover_option: {
          pickup_slots: [
            {
              date: "2026-09-02",
              time_slots: [{ time_slot_id: "x", from_time: "10:00", to_time: "14:00" }],
            },
          ],
        },
      },
      200,
    );
    expect(availability.slots[0].priceCents).toBeNull();
  });
});

describe("reference number", () => {
  it("sanitizes HTML and unsupported characters", () => {
    expect(sanitizeReferenceNumber("<script>INV-1</script>")).toBe("INV-1");
    expect(parseReferenceNumber("  PO #12345  ")).toBe("PO #12345");
  });

  it("enforces max length", () => {
    const long = "A".repeat(80);
    expect(sanitizeReferenceNumber(long).length).toBeLessThanOrEqual(64);
  });
});

describe("today's labels", () => {
  it("uses business timezone for the business date", () => {
    const at = new Date("2026-01-15T05:30:00.000Z");
    expect(businessDateForTimestamp(at, "America/New_York")).toBe("2026-01-15");
    const range = getBusinessDayRange(at, "America/New_York");
    expect(range.businessDate).toBe("2026-01-15");
    expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
  });

  it("hides profit from employees but shows it to admins", () => {
    const row = baseShipment({
      referenceNumber: "INV-100",
      labelGeneratedAt: new Date(),
      pickupRequired: true,
      pickupStatus: "SCHEDULED",
      pickupDate: "2026-09-02",
      pickupFromTime: "12:00",
      pickupToTime: "16:00",
      pickupCustomerCents: 1500,
      finalCustomerTotalCents: 2550,
      status: "LABEL_CREATED",
    });
    const employee = toTodayLabelRow(row, "https://app.test", "employee");
    const admin = toTodayLabelRow(row, "https://app.test", "admin");
    expect(employee.referenceNumber).toBe("INV-100");
    expect(employee.markupCents).toBeNull();
    expect(admin.markupCents).toBe(200);
    expect(employee.customerPriceCents).toBe(2550);
  });
});

describe("combined wallet recharge", () => {
  it("uses label plus pickup Easyship cost for shortage", () => {
    const labelCostCents = 29000;
    const pickupCostCents = 1500;
    const combined = labelCostCents + pickupCostCents;
    const result = calculateRechargeAmountCents({
      walletBalanceCents: 5000,
      labelCostCents: combined,
      minimumCents: 5000,
      maximumCents: 100_000,
      bufferCents: 1000,
    });
    expect(result.recharged).toBe(true);
    expect(result.shortageCents).toBe(25500);
    expect(result.amountCents).toBe(26500);
  });

  it("never exceeds the $1,000 recharge cap", () => {
    expect(() =>
      calculateRechargeAmountCents({
        walletBalanceCents: 0,
        labelCostCents: 995_000,
        minimumCents: 5000,
        maximumCents: 100_000,
        bufferCents: 1000,
      }),
    ).toThrow();
  });
});
