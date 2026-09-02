"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { TodayLabelRow } from "@/lib/labels-today";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";

function pickupTimeLabel(row: TodayLabelRow) {
  if (!row.pickupRequired) return "No";
  const time =
    row.pickupFromTime && row.pickupToTime ? `${row.pickupFromTime}–${row.pickupToTime}` : "";
  return [row.pickupStatus, row.pickupDate, time].filter(Boolean).join(" · ");
}

function LabelActions({
  row,
  isAdmin,
  onRetry,
}: {
  row: TodayLabelRow;
  isAdmin: boolean;
  onRetry: (id: string) => void;
}) {
  async function copyTracking() {
    if (!row.trackingNumber) return;
    await navigator.clipboard.writeText(row.trackingNumber);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {row.labelDownloadUrl ? (
        <>
          <a href={row.labelDownloadUrl} target="_blank" rel="noreferrer" className="text-violet-700 underline">
            View
          </a>
          <a href={row.labelDownloadUrl} className="text-violet-700 underline">
            Download
          </a>
          <a
            href={row.labelDownloadUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => window.print()}
            className="text-violet-700 underline"
          >
            Print
          </a>
        </>
      ) : null}
      {row.trackingNumber ? (
        <button type="button" className="text-violet-700 underline" onClick={() => void copyTracking()}>
          Copy tracking
        </button>
      ) : null}
      {row.trackingUrl ? (
        <a href={row.trackingUrl} target="_blank" rel="noreferrer" className="text-violet-700 underline">
          Open tracking
        </a>
      ) : null}
      {isAdmin &&
      row.pickupRequired &&
      row.pickupStatus !== "SCHEDULED" &&
      row.labelStatus === "LABEL_CREATED" ? (
        <button type="button" className="text-violet-700 underline" onClick={() => onRetry(row.id)}>
          Retry pickup
        </button>
      ) : null}
    </div>
  );
}

export function TodaysLabelsView() {
  const { role } = useStaffAuth();
  const [labels, setLabels] = useState<TodayLabelRow[]>([]);
  const [query, setQuery] = useState("");
  const [courier, setCourier] = useState("");
  const [pickupStatus, setPickupStatus] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessDate, setBusinessDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        q: query,
        courier,
        pickupStatus,
        createdBy,
      });
      const response = await fetch(`/api/labels/today?${params.toString()}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load labels");
      setLabels(data.labels ?? []);
      setTotal(data.total ?? 0);
      setBusinessDate(data.businessDate ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load labels");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, query, courier, pickupStatus, createdBy]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retryPickup(id: string) {
    const response = await fetch(`/api/pickups/${id}/retry`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Pickup retry failed");
      return;
    }
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const showProfit = role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Today&apos;s Labels</h1>
        {businessDate ? <p className="mt-1 text-sm text-muted">Business date: {businessDate}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          className="input-field min-h-12"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
          placeholder="Search reference, tracking, recipient"
        />
        <input
          className="input-field min-h-12"
          value={courier}
          onChange={(e) => {
            setPage(1);
            setCourier(e.target.value);
          }}
          placeholder="Courier filter"
        />
        <input
          className="input-field min-h-12"
          value={pickupStatus}
          onChange={(e) => {
            setPage(1);
            setPickupStatus(e.target.value);
          }}
          placeholder="Pickup status"
        />
        <input
          className="input-field min-h-12"
          value={createdBy}
          onChange={(e) => {
            setPage(1);
            setCreatedBy(e.target.value);
          }}
          placeholder="Employee filter"
        />
        <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 p-4 text-red-800">{error}</p> : null}
      {!loading && labels.length === 0 ? (
        <p className="text-muted">No labels have been generated today.</p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-2xl border border-ink/10 bg-white lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-paper text-muted">
            <tr>
              <th className="px-3 py-3">Generated</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3">Sender</th>
              <th className="px-3 py-3">Recipient</th>
              <th className="px-3 py-3">Courier</th>
              <th className="px-3 py-3">Tracking</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Pickup</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Employee</th>
              {showProfit ? <th className="px-3 py-3">Profit</th> : null}
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((row) => (
              <tr key={row.id} className="border-b border-ink/5 align-top">
                <td className="px-3 py-3">{row.generatedAt ? new Date(row.generatedAt).toLocaleString() : "—"}</td>
                <td className="px-3 py-3">{row.referenceNumber ?? "—"}</td>
                <td className="px-3 py-3">{row.senderName ?? "—"}</td>
                <td className="px-3 py-3">{row.recipientName ?? row.customerEmail}</td>
                <td className="px-3 py-3">{row.courierName}</td>
                <td className="px-3 py-3">{row.trackingNumber ?? "—"}</td>
                <td className="px-3 py-3">{formatMoney(row.customerPriceCents, "USD")}</td>
                <td className="px-3 py-3">{pickupTimeLabel(row)}</td>
                <td className="px-3 py-3">{row.labelStatus}</td>
                <td className="px-3 py-3">{row.createdBy ?? "—"}</td>
                {showProfit ? (
                  <td className="px-3 py-3">
                    {row.markupCents != null ? formatMoney(row.markupCents, "USD") : "—"}
                  </td>
                ) : null}
                <td className="px-3 py-3">
                  <LabelActions row={row} isAdmin={role === "admin"} onRetry={retryPickup} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {labels.map((row) => (
          <article key={row.id} className="surface p-4">
            <p className="font-semibold">{row.referenceNumber ?? "No reference"}</p>
            <p className="text-sm text-muted">{row.recipientName ?? row.customerEmail}</p>
            <p className="mt-2 text-sm">{row.courierName}</p>
            <p className="text-sm">Tracking: {row.trackingNumber ?? "—"}</p>
            <p className="text-sm">Generated: {row.generatedAt ? new Date(row.generatedAt).toLocaleString() : "—"}</p>
            <p className="text-sm">Pickup: {pickupTimeLabel(row)}</p>
            <p className="mt-2 font-semibold">{formatMoney(row.customerPriceCents, "USD")}</p>
            <div className="mt-3">
              <LabelActions row={row} isAdmin={role === "admin"} onRetry={retryPickup} />
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
