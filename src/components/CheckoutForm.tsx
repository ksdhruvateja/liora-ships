"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { splitDisplayCourierName } from "@/lib/courier-names";
import { MotionButton } from "@/components/motion/Pressable";

function PayForm({
  shipmentId,
  courierName,
  amountCents,
  currency,
}: {
  shipmentId: string;
  courierName: string;
  amountCents: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/shipments/${shipmentId}`,
      },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment could not be completed.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
      window.location.href = `/shipments/${shipmentId}`;
    }
  }

  const { label, carrier } = splitDisplayCourierName(courierName);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl bg-paper p-5">
        <p className="text-sm text-muted">Service</p>
        {label ? <p className="eyebrow mt-1">{label}</p> : null}
        <p className="font-semibold">
          {label && !carrier.toLowerCase().includes(label.toLowerCase())
            ? `${label} ${carrier}`
            : carrier}
        </p>
        <p className="mt-2 text-3xl font-extrabold">{formatMoney(amountCents, currency)}</p>
      </div>
      <PaymentElement />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <MotionButton
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary w-full disabled:opacity-60"
      >
        {submitting ? "Processing…" : `Pay ${formatMoney(amountCents, currency)}`}
        {submitting ? null : <span className="btn-arrow">→</span>}
      </MotionButton>
    </form>
  );
}

export function CheckoutForm({
  shipmentId,
  publishableKey: publishableKeyFromServer = "",
}: {
  shipmentId: string;
  publishableKey?: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [meta, setMeta] = useState<{ courierName: string; amountCents: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishableKey, setPublishableKey] = useState(
    publishableKeyFromServer || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Checkout failed");
        if (!cancelled) {
          setMock(Boolean(data.mock));
          setClientSecret(data.clientSecret ?? null);
          if (typeof data.publishableKey === "string" && data.publishableKey) {
            setPublishableKey(data.publishableKey);
          }
          setMeta({
            courierName: data.courierName,
            amountCents: data.amountCents,
            currency: data.currency,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Checkout failed");
      });
    return () => {
      cancelled = true;
    };
  }, [shipmentId]);

  async function completeMockPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/complete-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Demo payment failed");
      window.location.href = `/shipments/${shipmentId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo payment failed");
      setSubmitting(false);
    }
  }

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: "#7c5cff",
                borderRadius: "16px",
              },
            },
          }
        : undefined,
    [clientSecret],
  );

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>;
  }
  if (!meta) {
    return <p className="text-muted">Preparing secure checkout…</p>;
  }

  if (mock) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-paper p-5">
          <p className="text-sm text-muted">Local demo checkout</p>
          {splitDisplayCourierName(meta.courierName).label ? (
            <p className="eyebrow mt-1">{splitDisplayCourierName(meta.courierName).label}</p>
          ) : null}
          <p className="font-semibold">
            {(() => {
              const { label, carrier } = splitDisplayCourierName(meta.courierName);
              return label && !carrier.toLowerCase().includes(label.toLowerCase())
                ? `${label} ${carrier}`
                : carrier;
            })()}
          </p>
          <p className="mt-2 text-3xl font-extrabold">{formatMoney(meta.amountCents, meta.currency)}</p>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <MotionButton
          type="button"
          disabled={submitting}
          onClick={completeMockPayment}
          className="btn-primary w-full disabled:opacity-60"
        >
          {submitting ? "Processing…" : `Pay ${formatMoney(meta.amountCents, meta.currency)} (demo)`}
        </MotionButton>
      </div>
    );
  }

  if (!stripePromise) {
    return <p className="text-red-700">Stripe publishable key is missing.</p>;
  }
  if (!clientSecret || !options) {
    return <p className="text-muted">Preparing secure checkout…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PayForm
        shipmentId={shipmentId}
        courierName={meta.courierName}
        amountCents={meta.amountCents}
        currency={meta.currency}
      />
    </Elements>
  );
}
