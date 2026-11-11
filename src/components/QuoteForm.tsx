"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { formatMoney } from "@/lib/money";
import { splitDisplayCourierName } from "@/lib/courier-names";
import {
  DEFAULT_COMPANY_NAME,
  PARCEL_CONTENT_OPTIONS,
  companyNameOrDefault,
  parcelCategoryForContents,
} from "@/lib/parcel-contents";
import { US_COUNTRY, US_STATES, normalizeUsState } from "@/lib/us-locations";
import { MotionButton } from "@/components/motion/Pressable";
import { PickupOptions } from "@/components/PickupOptions";
import type { NormalizedPickupSlot } from "@/lib/easyship-pickups";
import { REFERENCE_NUMBER_MAX_LENGTH } from "@/lib/reference-number";
import { SavedAddressModal } from "@/components/SavedAddressModal";

type Address = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryAlpha2: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  companyName: string;
};

type Parcel = {
  length: string;
  width: string;
  height: string;
  dimensionUnit: "in" | "cm";
  weight: string;
  weightUnit: "lb" | "kg";
  description: string;
  customDescription: string;
  declaredValue: string;
};

type QuoteRate = {
  shipmentId: string;
  courierName: string;
  estimatedDelivery: string;
  customerTotalCents: number;
  currency: string;
};

type SavedContact = {
  id: string;
  role: "ORIGIN" | "DESTINATION";
  label: string;
  address: Address;
};

const emptyAddress = (email = ""): Address => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  countryAlpha2: US_COUNTRY.alpha2,
  contactName: "",
  contactPhone: "",
  contactEmail: email,
  companyName: "",
});

const inputClass = "input-field min-h-12";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function AddressFields({
  value,
  onChange,
  hideEmail,
}: {
  value: Address;
  onChange: (key: keyof Address, next: string) => void;
  hideEmail?: boolean;
}) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Contact name" required>
        <input
          className={inputClass}
          type="text"
          autoComplete="off"
          value={value.contactName}
          onChange={(e) => onChange("contactName", e.target.value)}
          required
        />
      </Field>
      <Field label="Phone" required>
        <input
          className={inputClass}
          type="tel"
          autoComplete="off"
          value={value.contactPhone}
          onChange={(e) => onChange("contactPhone", e.target.value)}
          required
        />
      </Field>
      {!hideEmail ? (
        <Field label="Contact email" required>
          <input
            className={inputClass}
            type="email"
            autoComplete="off"
            value={value.contactEmail}
            onChange={(e) => onChange("contactEmail", e.target.value)}
            required
          />
        </Field>
      ) : null}
      <Field label="Company">
        <input
          className={inputClass}
          type="text"
          autoComplete="off"
          value={value.companyName}
          placeholder={DEFAULT_COMPANY_NAME}
          onChange={(e) => onChange("companyName", e.target.value)}
        />
      </Field>
      <Field label="Address line 1" required>
        <input
          className={inputClass}
          type="text"
          autoComplete="off"
          value={value.line1}
          onChange={(e) => onChange("line1", e.target.value)}
          required
        />
      </Field>
      <Field label="Address line 2">
        <input
          className={inputClass}
          type="text"
          autoComplete="off"
          value={value.line2}
          onChange={(e) => onChange("line2", e.target.value)}
        />
      </Field>
      <Field label="City" required>
        <input
          className={inputClass}
          type="text"
          autoComplete="off"
          value={value.city}
          onChange={(e) => onChange("city", e.target.value)}
          required
        />
      </Field>
      <Field label="State" required>
        <select
          className={inputClass}
          required
          value={value.state}
          onChange={(e) => onChange("state", e.target.value)}
        >
          <option value="">Select a state</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="ZIP code" required>
        <input
          className={inputClass}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="94105"
          maxLength={10}
          pattern="\d{5}(-\d{4})?"
          title="5-digit US ZIP code"
          value={value.postalCode}
          onChange={(e) => onChange("postalCode", e.target.value)}
          required
        />
      </Field>
      <Field label="Country" required>
        <select
          className={inputClass}
          required
          value={US_COUNTRY.alpha2}
          onChange={() => onChange("countryAlpha2", US_COUNTRY.alpha2)}
        >
          <option value={US_COUNTRY.alpha2}>{US_COUNTRY.name}</option>
        </select>
      </Field>
    </div>
  );
}

function SavedAddressButton({
  count,
  activeLabel,
  onOpen,
}: {
  count: number;
  activeLabel?: string;
  onOpen: () => void;
}) {
  if (count === 0) return null;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="flex w-full items-center gap-3 rounded-2xl border border-ocean-200 bg-ocean-50 px-4 py-3 text-left text-sm"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ocean-500 text-white">★</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">
          {activeLabel ? "Using saved address" : `${count} saved ${count === 1 ? "address" : "addresses"}`}
        </span>
        <span className="block truncate text-muted">{activeLabel ?? "Tap to choose instead of typing"}</span>
      </span>
      <span className="font-semibold text-ocean-600">Change</span>
    </motion.button>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-bold text-white">{step}</span>
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
    </div>
  );
}

export function QuoteForm() {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState("");
  const [origin, setOrigin] = useState<Address>(emptyAddress());
  const [destination, setDestination] = useState<Address>(emptyAddress());
  const [parcel, setParcel] = useState<Parcel>({
    length: "",
    width: "",
    height: "",
    dimensionUnit: "in",
    weight: "",
    weightUnit: "lb",
    description: "",
    customDescription: "",
    declaredValue: "",
  });
  const [rates, setRates] = useState<QuoteRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [originSavedId, setOriginSavedId] = useState("");
  const [destSavedId, setDestSavedId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [pickupConfig, setPickupConfig] = useState<{
    pickupRequired: boolean;
    selectedSlot: NormalizedPickupSlot | null;
    finalTotalCents: number;
  }>({ pickupRequired: false, selectedSlot: null, finalTotalCents: 0 });
  const [continuing, setContinuing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [modalFocus, setModalFocus] = useState<"both" | "ORIGIN" | "DESTINATION" | null>(null);
  const promptedFor = useRef("");

  // Prefill ZIPs handed over from the home page "Rate & Ship" tab.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromZip = params.get("fromZip")?.trim();
    const toZip = params.get("toZip")?.trim();
    if (fromZip) setOrigin((prev) => ({ ...prev, postalCode: fromZip }));
    if (toZip) setDestination((prev) => ({ ...prev, postalCode: toZip }));
    // Box size handed over from the home page "Build your box" section.
    const num = (key: string) => {
      const value = Number(params.get(key));
      return Number.isFinite(value) && value > 0 ? String(value) : "";
    };
    const dims = { length: num("length"), width: num("width"), height: num("height"), weight: num("weight") };
    if (dims.length || dims.width || dims.height || dims.weight) {
      setParcel((prev) => ({
        ...prev,
        length: dims.length || prev.length,
        width: dims.width || prev.width,
        height: dims.height || prev.height,
        weight: dims.weight || prev.weight,
        dimensionUnit: "in",
        weightUnit: "lb",
      }));
    }
  }, []);

  useEffect(() => {
    const email = customerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setSavedContacts([]);
      setLookingUp(false);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/contacts?email=${encodeURIComponent(email)}`)
        .then((response) => (response.ok ? response.json() : { contacts: [] }))
        .then((data) => {
          if (cancelled) return;
          const contacts: SavedContact[] = data.contacts ?? [];
          setSavedContacts(contacts);
          // Pop the saved From / To picker once per email address.
          if (contacts.length > 0 && promptedFor.current !== email) {
            promptedFor.current = email;
            setModalFocus("both");
          }
        })
        .catch(() => {
          if (!cancelled) setSavedContacts([]);
        })
        .finally(() => {
          if (!cancelled) setLookingUp(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerEmail]);

  const closeModal = useCallback(() => setModalFocus(null), []);

  const originSaved = useMemo(
    () => savedContacts.filter((row) => row.role === "ORIGIN"),
    [savedContacts],
  );
  const destSaved = useMemo(
    () => savedContacts.filter((row) => row.role === "DESTINATION"),
    [savedContacts],
  );
  const selected = useMemo(
    () => rates.find((rate) => rate.shipmentId === selectedId) ?? null,
    [rates, selectedId],
  );

  function applySavedAddress(role: "ORIGIN" | "DESTINATION", id: string) {
    if (!id) {
      if (role === "ORIGIN") setOriginSavedId("");
      else setDestSavedId("");
      return;
    }
    const contact = savedContacts.find((row) => row.id === id && row.role === role);
    if (!contact) return;
    const next = {
      ...emptyAddress(),
      ...contact.address,
      line2: contact.address.line2 ?? "",
      companyName: contact.address.companyName ?? "",
      state: normalizeUsState(contact.address.state ?? ""),
      countryAlpha2: US_COUNTRY.alpha2,
    };
    if (role === "ORIGIN") {
      setOriginSavedId(id);
      setOrigin(next);
    } else {
      setDestSavedId(id);
      setDestination(next);
    }
  }

  function applyFromModal(originId: string, destId: string) {
    if (originId) applySavedAddress("ORIGIN", originId);
    else setOriginSavedId("");
    if (destId) applySavedAddress("DESTINATION", destId);
    else setDestSavedId("");
    setModalFocus(null);
  }

  const originLabel = originSaved.find((row) => row.id === originSavedId)?.label;
  const destLabel = destSaved.find((row) => row.id === destSavedId)?.label;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRates([]);
    setSelectedId(null);
    setPickupConfig({ pickupRequired: false, selectedSlot: null, finalTotalCents: 0 });
    try {
      const contents =
        parcel.description === "Other"
          ? parcel.customDescription.trim()
          : parcel.description;
      if (!contents) {
        throw new Error("Select what is in the parcel.");
      }
      const originPayload = {
        ...origin,
        contactEmail: customerEmail || origin.contactEmail,
        companyName: companyNameOrDefault(origin.companyName),
        state: normalizeUsState(origin.state),
        countryAlpha2: US_COUNTRY.alpha2,
      };
      const destPayload = {
        ...destination,
        contactEmail: destination.contactEmail || customerEmail,
        companyName: companyNameOrDefault(destination.companyName),
        state: normalizeUsState(destination.state),
        countryAlpha2: US_COUNTRY.alpha2,
      };
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail,
          origin: originPayload,
          destination: destPayload,
          parcel: {
            length: Number(parcel.length),
            width: Number(parcel.width),
            height: Number(parcel.height),
            dimensionUnit: parcel.dimensionUnit,
            weight: Number(parcel.weight),
            weightUnit: parcel.weightUnit,
            description: contents,
            category: parcelCategoryForContents(parcel.description),
            declaredValueCents: Math.round(Number(parcel.declaredValue) * 100),
          },
          referenceNumber,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to get rates");
      }
      setRates(data.rates);
      if (data.rates[0]) setSelectedId(data.rates[0].shipmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get rates");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-6" autoComplete="off">
        <section className="surface p-5 sm:p-6">
          <SectionTitle step={1} title="Your details" />
          <p className="mt-2 text-sm text-muted">
            We’ll email the label and tracking number here. Shipped before? Your saved From and To addresses pop up.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-md">
              <Field label="Email" required>
                <div className="relative">
                  <input
                    className={`${inputClass} pr-11`}
                    type="email"
                    autoComplete="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    {lookingUp ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-ocean-200 border-t-ocean-500" />
                    ) : savedContacts.length > 0 ? (
                      <span className="text-emerald-600">✓</span>
                    ) : null}
                  </span>
                </div>
              </Field>
            </div>
            <AnimatePresence>
              {savedContacts.length > 0 ? (
                <motion.button
                  key="saved-chip"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -2 }}
                  onClick={() => setModalFocus("both")}
                  className="btn-secondary min-h-12 !border-ocean-200 !bg-ocean-50 text-ocean-700"
                >
                  ★ {savedContacts.length} saved {savedContacts.length === 1 ? "address" : "addresses"}
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </section>

        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <section className="surface min-w-0 w-full overflow-visible p-5 sm:p-6">
            <SectionTitle step={2} title="From" />
            <p className="mt-2 text-sm text-muted">US addresses only.</p>
            <div className="mt-3">
              <SavedAddressButton
                count={originSaved.length}
                activeLabel={originLabel}
                onOpen={() => setModalFocus("ORIGIN")}
              />
            </div>
            <div className="mt-4">
              <AddressFields
                value={origin}
                hideEmail
                onChange={(key, next) => setOrigin((prev) => ({ ...prev, [key]: next }))}
              />
            </div>
          </section>
          <section className="surface min-w-0 w-full overflow-visible p-5 sm:p-6">
            <SectionTitle step={3} title="To" />
            <p className="mt-2 text-sm text-muted">US addresses only.</p>
            <div className="mt-3">
              <SavedAddressButton
                count={destSaved.length}
                activeLabel={destLabel}
                onOpen={() => setModalFocus("DESTINATION")}
              />
            </div>
            <div className="mt-4">
              <AddressFields
                value={destination}
                onChange={(key, next) => setDestination((prev) => ({ ...prev, [key]: next }))}
              />
            </div>
          </section>
        </div>

        <section className="surface p-5 sm:p-6">
          <SectionTitle step={4} title="Parcel" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Length" required>
              <input className={inputClass} type="number" min={0.1} step={0.1} required value={parcel.length} onChange={(e) => setParcel({ ...parcel, length: e.target.value })} />
            </Field>
            <Field label="Width" required>
              <input className={inputClass} type="number" min={0.1} step={0.1} required value={parcel.width} onChange={(e) => setParcel({ ...parcel, width: e.target.value })} />
            </Field>
            <Field label="Height" required>
              <input className={inputClass} type="number" min={0.1} step={0.1} required value={parcel.height} onChange={(e) => setParcel({ ...parcel, height: e.target.value })} />
            </Field>
            <Field label="Units" required>
              <select className={inputClass} value={parcel.dimensionUnit} onChange={(e) => setParcel({ ...parcel, dimensionUnit: e.target.value as "in" | "cm" })}>
                <option value="in">Inches</option>
                <option value="cm">Centimeters</option>
              </select>
            </Field>
            <Field label="Weight" required>
              <input className={inputClass} type="number" min={0.1} step={0.1} required value={parcel.weight} onChange={(e) => setParcel({ ...parcel, weight: e.target.value })} />
            </Field>
            <Field label="Weight unit" required>
              <select className={inputClass} value={parcel.weightUnit} onChange={(e) => setParcel({ ...parcel, weightUnit: e.target.value as "lb" | "kg" })}>
                <option value="lb">Pounds</option>
                <option value="kg">Kilograms</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reference Number">
                <input
                  className={inputClass}
                  type="text"
                  maxLength={REFERENCE_NUMBER_MAX_LENGTH}
                  placeholder="Order, invoice or internal reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Contents" required>
                <select
                  className={inputClass}
                  required
                  value={parcel.description}
                  onChange={(e) => setParcel({ ...parcel, description: e.target.value })}
                >
                  <option value="">Select what is in the parcel</option>
                  {PARCEL_CONTENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {parcel.description === "Other" ? (
              <div className="sm:col-span-2">
                <Field label="Describe contents" required>
                  <input
                    className={inputClass}
                    type="text"
                    autoComplete="off"
                    required
                    placeholder="What is inside?"
                    value={parcel.customDescription}
                    onChange={(e) => setParcel({ ...parcel, customDescription: e.target.value })}
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Declared value (USD)" required>
              <input
                className={inputClass}
                type="number"
                min={1}
                step={1}
                required
                value={parcel.declaredValue}
                onChange={(e) => setParcel({ ...parcel, declaredValue: e.target.value })}
              />
            </Field>
          </div>
          <p className="mt-5 rounded-xl border border-ocean-100 bg-ocean-50 px-4 py-3 text-sm text-ink">
            <strong>Changed your mind?</strong> Unused labels can be cancelled for a refund.{" "}
            <a href="/refund-policy" className="font-medium text-ocean-500 hover:underline">
              Refund policy
            </a>
          </p>
          <MotionButton
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 disabled:opacity-60"
          >
            {loading ? "Finding rates…" : "Get shipping rates"}
            {loading ? null : <span className="btn-arrow">→</span>}
          </MotionButton>
        </section>
      </form>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <AnimatePresence>
      {rates.length > 0 ? (
        <motion.section
          key="rates"
          className="surface p-5 sm:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        >
          <h2 className="text-2xl font-extrabold tracking-tight">Choose a service</h2>
          <p className="mt-1 text-sm text-muted">Prices shown are what you pay. No extra carrier checkout.</p>
          <div className="mt-4 space-y-3">
            {rates.map((rate) => {
              const active = rate.shipmentId === selectedId;
              const { label, carrier } = splitDisplayCourierName(rate.courierName);
              return (
                <motion.button
                  key={rate.shipmentId}
                  type="button"
                  layout
                  onClick={() => setSelectedId(rate.shipmentId)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  className="relative flex min-h-[4.5rem] w-full items-center justify-between rounded-2xl border bg-paper px-4 py-4 text-left"
                >
                  {active ? (
                    <motion.span
                      layoutId="selected-rate"
                      className="absolute inset-0 rounded-2xl border-2 border-ink bg-white shadow-soft"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-2xl border border-ink/10" />
                  )}
                  <span className="relative pr-3">
                    {label ? <span className="eyebrow">{label}</span> : null}
                    <span className={label ? "mt-1 block font-semibold" : "block font-semibold"}>
                      {label && !carrier.toLowerCase().includes(label.toLowerCase())
                        ? `${label} ${carrier}`
                        : carrier}
                    </span>
                    <span className="text-sm text-muted">{rate.estimatedDelivery}</span>
                  </span>
                  <span className="relative text-xl font-extrabold sm:text-2xl">
                    {formatMoney(rate.customerTotalCents, rate.currency)}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {selected ? (
            <div className="mt-5">
              <PickupOptions
                key={selected.shipmentId}
                shipmentId={selected.shipmentId}
                shippingTotalCents={selected.customerTotalCents}
                currency={selected.currency}
                onChange={setPickupConfig}
              />
            </div>
          ) : null}
          <MotionButton
            type="button"
            disabled={!selected || continuing}
            onClick={async () => {
              if (!selected) return;
              if (pickupConfig.pickupRequired && !pickupConfig.selectedSlot) {
                setError("Select a pickup date and time slot, or choose drop-off instead.");
                return;
              }
              if (
                pickupConfig.pickupRequired &&
                pickupConfig.selectedSlot &&
                pickupConfig.selectedSlot.priceCents == null
              ) {
                setError(
                  "Pickup pricing is unavailable for this slot. Select another slot or contact an administrator.",
                );
                return;
              }
              setContinuing(true);
              setError(null);
              try {
                const response = await fetch(`/api/shipments/${selected.shipmentId}/configure`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    referenceNumber,
                    pickupRequired: pickupConfig.pickupRequired,
                    pickupSlot: pickupConfig.pickupRequired ? pickupConfig.selectedSlot : null,
                  }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error ?? "Unable to save shipment options");
                router.push(`/checkout/${selected.shipmentId}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to continue to payment");
              } finally {
                setContinuing(false);
              }
            }}
            className="btn-primary mt-5 disabled:opacity-50"
          >
            {continuing ? "Saving options…" : "Continue to payment"}
            {continuing ? null : <span className="btn-arrow">→</span>}
          </MotionButton>
        </motion.section>
      ) : null}
      </AnimatePresence>

      <SavedAddressModal
        open={modalFocus !== null}
        focus={modalFocus ?? "both"}
        email={customerEmail.trim()}
        origins={originSaved}
        destinations={destSaved}
        initialOriginId={originSavedId}
        initialDestId={destSavedId}
        onApply={applyFromModal}
        onClose={closeModal}
      />
    </div>
  );
}
