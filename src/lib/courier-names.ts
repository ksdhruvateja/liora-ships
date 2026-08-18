import type { CourierBrandMap } from "@prisma/client";

const FALLBACK_PREFIX = "Liora";

export function brandCourierName(
  maps: Pick<CourierBrandMap, "matchType" | "matchValue" | "displayName" | "sortOrder" | "active">[],
  input: {
    courierServiceId: string;
    courierName: string;
    umbrellaName?: string;
    serviceName?: string;
  },
): string {
  const haystack = [
    input.serviceName,
    input.courierName,
    input.umbrellaName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const active = maps
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const row of active) {
    const needle = row.matchValue.toLowerCase();
    if (row.matchType === "EXACT_ID" && row.matchValue === input.courierServiceId) {
      return row.displayName;
    }
    if (row.matchType === "NAME_CONTAINS" && haystack.includes(needle)) {
      return row.displayName;
    }
    if (row.matchType === "UMBRELLA" && (input.umbrellaName ?? "").toLowerCase().includes(needle)) {
      return row.displayName;
    }
    if (row.matchType === "SERVICE_NAME" && (input.serviceName ?? "").toLowerCase().includes(needle)) {
      return row.displayName;
    }
  }

  if (/\bexpress\b/i.test(haystack)) return `${FALLBACK_PREFIX} Express`;
  if (/\bpriority\b/i.test(haystack)) return `${FALLBACK_PREFIX} Priority`;
  if (/\bovernight\b/i.test(haystack)) return `${FALLBACK_PREFIX} Overnight`;
  if (/\beconomy\b|\bsaver\b/i.test(haystack)) return `${FALLBACK_PREFIX} Economy`;
  if (/\bstandard\b|\bground\b/i.test(haystack)) return `${FALLBACK_PREFIX} Ground`;
  return `${FALLBACK_PREFIX} Shipping`;
}

export function formatEstimatedDelivery(
  minDays: number | null | undefined,
  maxDays: number | null | undefined,
): string {
  if (minDays && maxDays && minDays !== maxDays) {
    return `${minDays}–${maxDays} business days`;
  }
  if (minDays || maxDays) {
    const days = minDays ?? maxDays;
    return `${days} business day${days === 1 ? "" : "s"}`;
  }
  return "Delivery window confirmed after purchase";
}
