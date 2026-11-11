import { applyShippingMarkup, validateShippingMarkupSettings, type ShippingMarkupSettings } from "./markup";
import { getConfig } from "./config";
import { prisma } from "./db";

/**
 * Shipping markup — single source of truth
 * ----------------------------------------
 * The live markup is the `ShippingMarkupConfig` row (id "default"), edited from the
 * footer PIN panel. Every new quote reads it, so a change applies to the very next quote.
 * Quotes already shown keep their price until they expire (30 minutes).
 *
 * APP_MARKUP_PERCENT only seeds that row the first time the app runs (default 11%).
 * After that, change the markup in the PIN panel — editing the env var has no effect.
 */
export const FALLBACK_MARKUP_PERCENT = 11;

export function defaultShippingMarkupSettings(): ShippingMarkupSettings {
  const fromEnv = getConfig().APP_MARKUP_PERCENT;
  try {
    return validateShippingMarkupSettings({ enabled: true, percentage: fromEnv, fixedMarkupCents: 0 });
  } catch {
    return { enabled: true, percentage: FALLBACK_MARKUP_PERCENT, fixedMarkupCents: 0 };
  }
}

export async function ensureDefaultShippingMarkup() {
  return prisma.shippingMarkupConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...defaultShippingMarkupSettings(), updatedBy: "initial-default" },
    update: {},
  });
}

/**
 * Current markup. Throws if the database can't be read — never silently prices with a
 * stale default, which could under- or over-charge after an admin change.
 */
export async function getShippingMarkupSettings(): Promise<ShippingMarkupSettings> {
  const row =
    (await prisma.shippingMarkupConfig.findUnique({ where: { id: "default" } })) ??
    (await ensureDefaultShippingMarkup());
  return {
    enabled: row.enabled,
    percentage: row.percentage,
    fixedMarkupCents: row.fixedMarkupCents,
  };
}

/** For status displays only (health check): never throws. */
export async function readShippingMarkupStatus() {
  try {
    const settings = await getShippingMarkupSettings();
    return { source: "database" as const, ...settings };
  } catch {
    return { source: "unavailable" as const };
  }
}

export async function saveShippingMarkupSettings(
  settings: ShippingMarkupSettings,
  changedBy: string | null,
) {
  // Save and audit together: a markup change is never applied without its log entry.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shippingMarkupConfig.findUnique({ where: { id: "default" } });
    const saved = await tx.shippingMarkupConfig.upsert({
      where: { id: "default" },
      create: { id: "default", ...settings, updatedBy: changedBy },
      update: { ...settings, updatedBy: changedBy },
    });
    await tx.markupAuditLog.create({
      data: {
        previousEnabled: existing?.enabled ?? null,
        previousPercentage: existing?.percentage ?? null,
        previousFixedMarkupCents: existing?.fixedMarkupCents ?? null,
        newEnabled: settings.enabled,
        newPercentage: settings.percentage,
        newFixedMarkupCents: settings.fixedMarkupCents,
        changedBy,
      },
    });
    return saved;
  });
}

export function priceShipping(baseCostCents: number, settings: ShippingMarkupSettings) {
  return applyShippingMarkup(baseCostCents, settings);
}

/** @deprecated Use getShippingMarkupSettings + applyShippingMarkup */
export async function getActiveMarkupRule() {
  const settings = await getShippingMarkupSettings();
  return {
    type: "PERCENT" as const,
    value: settings.enabled ? settings.percentage : 0,
    minCents: settings.fixedMarkupCents > 0 ? settings.fixedMarkupCents : null,
    maxCents: null,
  };
}
