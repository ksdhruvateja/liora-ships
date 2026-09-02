export type NormalizedPickupSlot = {
  timeSlotId: string | null;
  pickupDate: string;
  fromTime: string;
  toTime: string;
  timezone: string | null;
  priceCents: number | null;
  currency: string | null;
  courierServiceId: string;
  expiresAt: string | null;
  raw: Record<string, unknown>;
};

export type NormalizedPickupAvailability = {
  supported: boolean;
  courierServiceId: string;
  timezone: string | null;
  slots: NormalizedPickupSlot[];
  message: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPriceCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 100 ? Math.round(value) : Math.round(value * 100);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed >= 100 ? Math.round(parsed) : Math.round(parsed * 100);
    }
  }
  return null;
}

export function normalizePickupSlotsResponse(
  courierServiceId: string,
  body: unknown,
  status: number,
): NormalizedPickupAvailability {
  if (status === 404) {
    return {
      supported: false,
      courierServiceId,
      timezone: null,
      slots: [],
      message:
        "Pickup is not available for this courier service. Please use drop-off or select another service.",
    };
  }

  const root = asRecord(body);
  const handover = asRecord(root.courier_service_handover_option ?? root.handover_option);
  const timezone =
    readString(handover.timezone) ??
    readString(handover.local_timezone) ??
    readString(root.timezone);
  const pickupSlots = Array.isArray(handover.pickup_slots)
    ? handover.pickup_slots
    : Array.isArray(root.pickup_slots)
      ? root.pickup_slots
      : [];

  const slots: NormalizedPickupSlot[] = [];
  for (const day of pickupSlots) {
    const dayRow = asRecord(day);
    const pickupDate = readString(dayRow.date);
    if (!pickupDate) continue;
    const timeSlots = Array.isArray(dayRow.time_slots) ? dayRow.time_slots : [];
    for (const slot of timeSlots) {
      const slotRow = asRecord(slot);
      const fromTime = readString(slotRow.from_time) ?? readString(slotRow.min_time);
      const toTime = readString(slotRow.to_time) ?? readString(slotRow.max_time);
      if (!fromTime || !toTime) continue;
      const priceCents =
        readPriceCents(slotRow.price) ??
        readPriceCents(slotRow.pickup_fee) ??
        readPriceCents(slotRow.total_charge) ??
        readPriceCents(slotRow.fee);
      const currency =
        readString(slotRow.currency) ??
        readString(dayRow.currency) ??
        readString(handover.currency) ??
        "USD";
      slots.push({
        timeSlotId: readString(slotRow.time_slot_id),
        pickupDate,
        fromTime,
        toTime,
        timezone,
        priceCents,
        currency,
        courierServiceId,
        expiresAt: readString(slotRow.expires_at) ?? readString(slotRow.expiration),
        raw: slotRow,
      });
    }
  }

  return {
    supported: true,
    courierServiceId,
    timezone,
    slots,
    message:
      slots.length === 0
        ? "No pickup times are currently available for this courier."
        : null,
  };
}

export function pickupSlotKey(slot: Pick<
  NormalizedPickupSlot,
  "courierServiceId" | "pickupDate" | "timeSlotId" | "fromTime" | "toTime"
>) {
  return [
    slot.courierServiceId,
    slot.pickupDate,
    slot.timeSlotId ?? "",
    slot.fromTime,
    slot.toTime,
  ].join("|");
}

export function pickupCustomerCentsFromSlot(slot: NormalizedPickupSlot) {
  if (slot.priceCents == null) return null;
  return slot.priceCents;
}
