"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { PublicShipment } from "@/lib/public-shipment";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Liora Labs Shipping";

export function ShipmentStatus({ shipmentId }: { shipmentId: string }) {
  const [shipment, setShipment] = useState<PublicShipment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let askedFulfillment = false;

    async function poll(tryFulfill: boolean) {
      try {
        if (tryFulfill && !askedFulfillment) {
          askedFulfillment = true;
          await fetch(`/api/shipments/${shipmentId}/fulfill`, { method: "POST" });
        }
        const response = await fetch(`/api/shipments/${shipmentId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Not found");
        if (cancelled) return;
        setShipment(data.shipment);
        const status = data.shipment.status as string;
        if (status === "QUOTED" || status === "PAID") {
          timer = setTimeout(() => poll(status === "PAID"), 2500);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load shipment");
      }
    }

    poll(true);
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

  if (shipment.status === "FAILED") {
    return (
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">We hit a snag</h1>
        <p className="mt-3 max-w-xl text-muted">
          Your payment was received, but {appName} could not finish creating the label. Our team has been alerted
          and will follow up with a label or a refund.
        </p>
        <p className="mt-4 text-sm text-muted">Reference: {shipment.id}</p>
      </div>
    );
  }

  if (shipment.status === "LABEL_CREATED") {
    return (
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <p className="eyebrow">Label ready</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">You’re all set</h1>
        <p className="mt-3 text-muted">
          {shipment.labelEmailEnabled
            ? `A backup copy was emailed from ${shipment.notifyEmail} to ${shipment.customerEmail}, with the PDF attached.`
            : `Download the PDF below, or email a backup copy to ${shipment.customerEmail} from your Gmail.`}
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Service</dt>
            <dd className="font-semibold">{shipment.courierName}</dd>
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
        {shipment.status === "PAID" ? "Payment received — generating label" : "Confirming payment"}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Preparing your label</h1>
      <p className="mt-3 text-muted">
        Hang tight — {appName} is generating your shipping label automatically after payment. This page updates
        by itself.
      </p>
    </div>
  );
}
