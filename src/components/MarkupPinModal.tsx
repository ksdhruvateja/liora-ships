"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";

type MarkupSettings = {
  enabled: boolean;
  percentage: number;
  fixedMarkupCents: number;
};

export function MarkupPinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<MarkupSettings | null>(null);
  const [exampleBaseCents, setExampleBaseCents] = useState(10_000);
  const [exampleCustomerCents, setExampleCustomerCents] = useState(11_000);
  const [enabled, setEnabled] = useState(true);
  const [percentage, setPercentage] = useState("11");
  const [fixedMarkup, setFixedMarkup] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setUnlockToken(null);
      setSettings(null);
      setError(null);
      setMessage(null);
    }
  }, [open]);

  const previewCustomerCents = useMemo(() => {
    const base = exampleBaseCents;
    const pct = Number(percentage);
    const fixed = Math.round(Number(fixedMarkup || "0") * 100);
    if (!enabled || !Number.isFinite(pct)) return base;
    return base + Math.round(base * (pct / 100)) + fixed;
  }, [enabled, percentage, fixedMarkup, exampleBaseCents]);

  async function unlock() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verify-markup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Invalid PIN.");
      setUnlockToken(data.unlockToken);
      const settingsResponse = await fetch("/api/admin/shipping/markup", {
        headers: { "x-markup-unlock-token": data.unlockToken },
      });
      const settingsData = await settingsResponse.json();
      if (!settingsResponse.ok) throw new Error(settingsData.error ?? "Unable to load settings");
      setSettings(settingsData.settings);
      setEnabled(settingsData.settings.enabled);
      setPercentage(String(settingsData.settings.percentage));
      setFixedMarkup((settingsData.settings.fixedMarkupCents / 100).toFixed(2));
      setExampleBaseCents(settingsData.example.easyshipRateCents);
      setExampleCustomerCents(settingsData.example.customerShippingPriceCents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid PIN.");
    } finally {
      setSubmitting(false);
    }
  }

  async function save() {
    if (!unlockToken) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/shipping/markup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-markup-unlock-token": unlockToken,
        },
        body: JSON.stringify({
          enabled,
          percentage: Number(percentage),
          fixedMarkupCents: Math.round(Number(fixedMarkup || "0") * 100),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save markup");
      setMessage(data.message ?? "Shipping markup updated successfully.");
      setExampleCustomerCents(data.example.customerShippingPriceCents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save markup");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-extrabold tracking-tight">
            {unlockToken ? "Shipping Markup Settings" : "Administrator PIN"}
          </h2>
          <button type="button" className="text-muted hover:text-ink" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!unlockToken ? (
          <div className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Enter PIN</span>
              <input
                className="input-field min-h-12 w-full"
                type="password"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button type="button" className="btn-primary w-full" disabled={submitting} onClick={() => void unlock()}>
              {submitting ? "Verifying…" : "Unlock Settings"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Markup enabled
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Percentage markup</span>
              <input
                className="input-field min-h-12 w-full"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Fixed markup</span>
              <input
                className="input-field min-h-12 w-full"
                type="number"
                min={0}
                step={0.01}
                value={fixedMarkup}
                onChange={(e) => setFixedMarkup(e.target.value)}
              />
            </label>
            <div className="rounded-xl border border-ink/10 bg-paper p-4 text-sm">
              <div className="flex justify-between">
                <span>Example Easyship rate</span>
                <span>{formatMoney(exampleBaseCents, "USD")}</span>
              </div>
              <div className="mt-1 flex justify-between font-semibold">
                <span>Example customer price</span>
                <span>{formatMoney(previewCustomerCents, "USD")}</span>
              </div>
            </div>
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button type="button" className="btn-primary w-full" disabled={submitting} onClick={() => void save()}>
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
