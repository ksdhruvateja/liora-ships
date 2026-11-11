"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { PublicShipment } from "@/lib/public-shipment";

const reasons = [
  "Wrong address or details",
  "Picked the wrong service",
  "No longer shipping",
  "Created a duplicate label",
  "Other",
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "Cancel label" entry point + confirmation dialog on the customer's shipment page. */
export function CancelLabelPanel({
  shipment,
  onUpdated,
  retryRefund = false,
}: {
  shipment: PublicShipment;
  onUpdated: (next: PublicShipment) => void;
  /** Label already voided but the refund failed — offer "Retry refund". */
  retryRefund?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  const refund = formatMoney(shipment.refundEstimateCents, shipment.currency);
  const deadline = formatDate(shipment.cancelDeadline);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (data.shipment) onUpdated(data.shipment as PublicShipment);
      if (!response.ok) throw new Error(data.error ?? "Unable to cancel this label.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this label.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-ink">{retryRefund ? "Refund pending" : "Need to cancel?"}</p>
          <p className="mt-0.5 text-muted">
            {retryRefund
              ? `Your label is cancelled. The ${refund} refund hasn’t gone through yet.`
              : `Unused labels can be cancelled${deadline ? ` until ${deadline}` : ""} for a ${refund} refund.`}{" "}
            <Link href="/refund-policy" className="text-ocean-500 underline-offset-2 hover:underline">
              Policy
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
        >
          {retryRefund ? "Retry refund" : "Cancel label"}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-label-title"
          >
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => !submitting && setOpen(false)} />
            <motion.form
              onSubmit={submit}
              className="relative w-full max-w-md rounded-t-[2rem] bg-white p-6 shadow-lift sm:rounded-[2rem] sm:p-8"
              initial={{ y: 50, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <h2 id="cancel-label-title" className="text-2xl font-bold tracking-tight text-ink">
                {retryRefund ? "Retry your refund" : "Cancel this label?"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {retryRefund
                  ? `We’ll try the ${refund} refund to your original payment method again.`
                  : `The label stops working immediately and ${refund} goes back to your original payment method.`}
              </p>

              <label className="mt-5 block text-sm">
                <span className="mb-1.5 block font-medium text-ink">Confirm your email</span>
                <input
                  className="input-field min-h-12"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="The email you used at checkout"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {!retryRefund ? (
                <>
                  <label className="mt-4 block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Reason</span>
                    <select className="input-field min-h-12" value={reason} onChange={(e) => setReason(e.target.value)}>
                      {reasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 flex items-start gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-ocean-500"
                      checked={understood}
                      onChange={(e) => setUnderstood(e.target.checked)}
                      required
                    />
                    <span>I haven’t used this label and won’t ship with it after cancelling.</span>
                  </label>
                </>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={submitting}>
                  Keep label
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!retryRefund && !understood)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? "Cancelling…" : retryRefund ? "Retry refund" : `Cancel & refund ${refund}`}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
