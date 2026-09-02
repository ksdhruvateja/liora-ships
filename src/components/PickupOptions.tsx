"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { NormalizedPickupAvailability, NormalizedPickupSlot } from "@/lib/easyship-pickups";
import { pickupSlotKey } from "@/lib/easyship-pickups";

const inputClass = "input-field min-h-12";

export function PickupOptions({
  shipmentId,
  shippingTotalCents,
  currency,
  onChange,
}: {
  shipmentId: string | null;
  shippingTotalCents: number;
  currency: string;
  onChange: (value: {
    pickupRequired: boolean;
    selectedSlot: NormalizedPickupSlot | null;
    finalTotalCents: number;
  }) => void;
}) {
  const [pickupRequired, setPickupRequired] = useState(false);
  const [availability, setAvailability] = useState<NormalizedPickupAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    setSelectedKey("");
    setSelectedDate("");
    setAvailability(null);
    setError(null);
    if (!pickupRequired || !shipmentId) {
      onChange({ pickupRequired: false, selectedSlot: null, finalTotalCents: shippingTotalCents });
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/easyship/pickup-slots?shipmentId=${encodeURIComponent(shipmentId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load pickup slots");
        if (!cancelled) setAvailability(data.availability as NormalizedPickupAvailability);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load pickup slots");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupRequired, shipmentId, shippingTotalCents, onChange]);

  const dates = useMemo(() => {
    const unique = new Set((availability?.slots ?? []).map((slot) => slot.pickupDate));
    return Array.from(unique);
  }, [availability]);

  const slotsForDate = useMemo(
    () => (availability?.slots ?? []).filter((slot) => slot.pickupDate === selectedDate),
    [availability, selectedDate],
  );

  const selectedSlot = useMemo(
    () => (availability?.slots ?? []).find((slot) => pickupSlotKey(slot) === selectedKey) ?? null,
    [availability, selectedKey],
  );

  useEffect(() => {
    const pickupCents = pickupRequired && selectedSlot?.priceCents != null ? selectedSlot.priceCents : 0;
    onChange({
      pickupRequired,
      selectedSlot: pickupRequired ? selectedSlot : null,
      finalTotalCents: shippingTotalCents + pickupCents,
    });
  }, [pickupRequired, selectedSlot, shippingTotalCents, onChange]);

  const unsupported = pickupRequired && availability && !availability.supported;

  return (
    <div className="space-y-4 rounded-2xl border border-ink/10 bg-paper p-4">
      <div>
        <p className="text-sm font-medium text-ink">Pickup required?</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`btn-secondary ${!pickupRequired ? "ring-2 ring-ink" : ""}`}
            onClick={() => setPickupRequired(false)}
          >
            No
          </button>
          <button
            type="button"
            className={`btn-secondary ${pickupRequired ? "ring-2 ring-ink" : ""}`}
            onClick={() => setPickupRequired(true)}
          >
            Yes
          </button>
        </div>
      </div>

      {pickupRequired ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">Courier Pickup</p>
          {loading ? <p className="text-sm text-muted">Loading pickup availability…</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {unsupported ? (
            <p className="text-sm text-muted">
              Pickup is not available for this service. You may use drop-off or choose another shipping
              service.
            </p>
          ) : null}
          {!unsupported && availability?.message && !dates.length ? (
            <p className="text-sm text-muted">{availability.message}</p>
          ) : null}
          {!unsupported && dates.length > 0 ? (
            <>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink">Pickup date</span>
                <select
                  className={inputClass}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedKey("");
                  }}
                >
                  <option value="">Select a date</option>
                  {dates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink">Pickup time</span>
                <select
                  className={inputClass}
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  disabled={!selectedDate}
                >
                  <option value="">Select a time slot</option>
                  {slotsForDate.map((slot) => (
                    <option key={pickupSlotKey(slot)} value={pickupSlotKey(slot)}>
                      {slot.fromTime} – {slot.toTime}
                    </option>
                  ))}
                </select>
              </label>
              {selectedSlot ? (
                <p className="text-sm text-muted">
                  Pickup fee:{" "}
                  {selectedSlot.priceCents === 0
                    ? "Free"
                    : selectedSlot.priceCents != null
                      ? formatMoney(selectedSlot.priceCents, selectedSlot.currency ?? currency)
                      : "Unavailable — choose another slot"}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
