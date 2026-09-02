"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { splitDisplayCourierName } from "@/lib/courier-names";
import { EMPLOYEE_RECHARGE_BLOCKED_MESSAGE } from "@/lib/easyship-errors";
import type { PublicShipment } from "@/lib/public-shipment";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Liora Labs Shipping";
const MAX_FAILED_RETRIES = 6;

function isPaymentFailure(shipment: PublicShipment) {
  return /payment failed|card declined|insufficient funds|your card/i.test(shipment.lastError ?? "");
}

async function loadShipment(shipmentId: string) {
  const response = await fetch(`/api/shipments/${shipmentId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Not found");
  return data.shipment as PublicShipment;
}

export function ShipmentStatus({ shipmentId }: { shipmentId: string }) {
  const [shipment, setShipment] = useState<PublicShipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const retryLabel = useCallback(async () => {
    setRetrying(true);
    setGaveUp(false);
    try {
      await fetch(`/api/shipments/${shipmentId}/fulfill`, { method: "POST" });
      setShipment(await loadShipment(shipmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retry label");
    } finally {
      setRetrying(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let fulfillInFlight = false;
    let failedRetries = 0;

    async function maybeEmail(current: PublicShipment) {
      if (
        current.status === "LABEL_CREATED" &&
        current.labelEmailEnabled &&
        !current.labelEmailSent
      ) {
        try {
          await fetch(`/api/shipments/${shipmentId}/email`, { method: "POST" });
          if (!cancelled) setShipment(await loadShipment(shipmentId));
        } catch {
          // Label is ready even if the backup email request fails.
        }
      }
    }

    async function poll() {
      try {
        const current = await loadShipment(shipmentId);
        if (cancelled) return;
        setShipment(current);
        setError(null);

        if (current.status === "LABEL_CREATED") {
          await maybeEmail(current);
          return;
        }

        if (current.status === "RECHARGE_BLOCKED_BY_CARD_ISSUER") {
          setGaveUp(true);
          return;
        }

        if (current.status === "FAILED" && isPaymentFailure(current)) {
          setGaveUp(true);
          return;
        }

        if (current.status === "FAILED" && failedRetries >= MAX_FAILED_RETRIES) {
          setGaveUp(true);
          return;
        }

        if (
          !fulfillInFlight &&
          (current.status === "QUOTED" || current.status === "PAID" || current.status === "FAILED")
        ) {
          if (current.status === "FAILED") failedRetries += 1;
          fulfillInFlight = true;
          try {
            await fetch(`/api/shipments/${shipmentId}/fulfill`, { method: "POST" });
            if (!cancelled) {
              const after = await loadShipment(shipmentId);
              setShipment(after);
              if (after.status === "LABEL_CREATED") {
                await maybeEmail(after);
                return;
              }
            }
          } catch {
            // Keep polling; the next tick will try again.
          } finally {
            fulfillInFlight = false;
          }
        }

        if (!cancelled) {
          timer = setTimeout(poll, 2500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load shipment");
          timer = setTimeout(poll, 4000);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [shipmentId]);

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>;
  }
  if (!shipment) {
    return <p className="text-muted">Loading your shipment…</p>;
  }

  if (shipment.status === "RECHARGE_BLOCKED_BY_CARD_ISSUER") {
    return (
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Payment could not be completed</h1>
        <p className="mt-3 max-w-xl text-muted">{EMPLOYEE_RECHARGE_BLOCKED_MESSAGE}</p>
        <p className="mt-4 text-sm text-muted">Reference: {shipment.id}</p>
      </div>
    );
  }

  if (shipment.status === "FAILED" && (gaveUp || isPaymentFailure(shipment))) {
    return (
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">We hit a snag</h1>
        <p className="mt-3 max-w-xl text-muted">
          Your payment was received, but {appName} could not finish creating the label. You can retry below — you
          will not be charged again. If it still fails, our team will follow up with a label or a refund.
        </p>
        <p className="mt-4 text-sm text-muted">Reference: {shipment.id}</p>
        {!isPaymentFailure(shipment) ? (
          <button type="button" className="btn-primary mt-6" onClick={() => void retryLabel()} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry label"}
            <span className="btn-arrow">→</span>
          </button>
        ) : null}
      </div>
    );
  }

  if (shipment.status === "LABEL_CREATED") {
    const { label, carrier } = splitDisplayCourierName(shipment.courierName);
    return (
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <p className="eyebrow">Label ready</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">You’re all set</h1>
        <p className="mt-3 text-muted">
          {shipment.labelEmailSent
            ? `A copy was emailed to ${shipment.customerEmail}, with the PDF attached when available.`
            : shipment.labelEmailEnabled
              ? `We are emailing a copy to ${shipment.customerEmail}. You can also download the PDF below.`
              : `Download the PDF below. A copy will also be emailed to ${shipment.customerEmail} once mail is configured.`}
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Service</dt>
            <dd className="font-semibold">
              {label ? <span className="eyebrow block">{label}</span> : null}
              {label && !carrier.toLowerCase().includes(label.toLowerCase())
                ? `${label} ${carrier}`
                : carrier}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Total paid</dt>
            <dd className="font-semibold">{formatMoney(shipment.customerTotalCents, shipment.currency)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Tracking number</dt>
            <dd className="font-semibold">{shipment.trackingNumber ?? "Assigned shortly"}</dd>
          </div>
          {shipment.estimatedDelivery ? (
            <div>
              <dt className="text-sm text-muted">Estimated delivery</dt>
              <dd className="font-semibold">{shipment.estimatedDelivery}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {shipment.labelDownloadUrl ? (
            <a href={shipment.labelDownloadUrl} className="btn-primary">
              Download label PDF
              <span className="btn-arrow">→</span>
            </a>
          ) : null}
          {shipment.trackingUrl ? (
            <a
              href={shipment.trackingUrl}
              className="btn-secondary"
            >
              Track shipment
            </a>
          ) : null}
          {shipment.labelDownloadUrl ? (
            <a
              className="btn-secondary"
              href={`mailto:${shipment.customerEmail}?subject=${encodeURIComponent(`Liora Labs shipping label ${shipment.trackingNumber ?? ""}`.trim())}&body=${encodeURIComponent(`Your shipping label is ready. Print the PDF and tape it to your parcel.\n\nService: ${shipment.courierName}\nTracking: ${shipment.trackingNumber ?? "Assigned shortly"}\nDownload: ${shipment.labelDownloadUrl}`)}`}
            >
              Email backup to {shipment.customerEmail}
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
      <p className="eyebrow">
        {shipment.status === "PAID" || shipment.status === "FAILED"
          ? "Payment received — generating label"
          : "Confirming payment"}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Preparing your label</h1>
      <p className="mt-3 text-muted">
        Hang tight — {appName} is generating your shipping label automatically after payment. This page updates
        by itself.
      </p>
      {shipment.lastError ? (
        <p className="mt-3 text-sm text-muted">
          Still working with the carrier. If this stays here more than a minute, refresh the page.
        </p>
      ) : null}
    </div>
  );
}
