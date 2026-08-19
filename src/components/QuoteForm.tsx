"use client";

import { useEffect, useMemo, useState } from "react";
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

function SavedAddressPicker({
  contacts,
  value,
  onPick,
}: {
  contacts: SavedContact[];
  value: string;
  onPick: (id: string) => void;
}) {
  if (contacts.length === 0) return null;
  return (
    <Field label="Use a saved address">
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Type a new address below</option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.label}
          </option>
        ))}
      </select>
    </Field>
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

  useEffect(() => {
    const email = customerEmail.trim();
    if (!email.includes("@")) {
      setSavedContacts([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/contacts?email=${encodeURIComponent(email)}`)
        .then((response) => response.json())
        .then((data) => setSavedContacts(data.contacts ?? []))
        .catch(() => setSavedContacts([]));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [customerEmail]);

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRates([]);
    setSelectedId(null);
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
          <h2 className="text-2xl font-extrabold tracking-tight">Your details</h2>
          <p className="mt-1 text-sm text-muted">We’ll email the label and tracking number here. Fields marked * are required.</p>
          <div className="mt-4 max-w-md">
            <Field label="Email" required>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <section className="surface min-w-0 w-full overflow-visible p-5 sm:p-6">
            <h2 className="text-2xl font-extrabold tracking-tight">From</h2>
            <p className="mt-1 text-sm text-muted">US addresses only. Pick a state from the list, or use a saved address after you have shipped once.</p>
            <div className="mt-3">
              <SavedAddressPicker
                contacts={originSaved}
                value={originSavedId}
                onPick={(id) => applySavedAddress("ORIGIN", id)}
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
            <h2 className="text-2xl font-extrabold tracking-tight">To</h2>
            <p className="mt-1 text-sm text-muted">US addresses only. Pick a state from the list, or use a saved address after you have shipped once.</p>
            <div className="mt-3">
              <SavedAddressPicker
                contacts={destSaved}
                value={destSavedId}
                onPick={(id) => applySavedAddress("DESTINATION", id)}
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
          <h2 className="text-2xl font-extrabold tracking-tight">Parcel</h2>
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
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">
            <strong>No returns.</strong> Labels once fetched cannot be returned, cancelled, or refunded.
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
          <p className="mt-1 text-sm text-muted">Prices shown are what you pay. No extra carrier checkout. Labels once fetched cannot be returned.</p>
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
          <MotionButton
            type="button"
            disabled={!selected}
            onClick={() => selected && router.push(`/checkout/${selected.shipmentId}`)}
            className="btn-primary mt-5 disabled:opacity-50"
          >
            Continue to payment
            <span className="btn-arrow">→</span>
          </MotionButton>
        </motion.section>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
