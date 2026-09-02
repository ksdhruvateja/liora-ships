import { applyShippingMarkup, type ShippingMarkupSettings } from "./markup";
import { prisma } from "./db";

const DEFAULT_SETTINGS: ShippingMarkupSettings = {
  enabled: true,
  percentage: 11,
  fixedMarkupCents: 0,
};

export async function ensureDefaultShippingMarkup() {
  return prisma.shippingMarkupConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_SETTINGS },
    update: {},
  });
}

export async function getShippingMarkupSettings(): Promise<ShippingMarkupSettings> {
  try {
    const row = await prisma.shippingMarkupConfig.findUnique({ where: { id: "default" } });
    if (!row) {
      const created = await ensureDefaultShippingMarkup();
      return {
        enabled: created.enabled,
        percentage: created.percentage,
        fixedMarkupCents: created.fixedMarkupCents,
      };
    }
    return {
      enabled: row.enabled,
      percentage: row.percentage,
      fixedMarkupCents: row.fixedMarkupCents,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveShippingMarkupSettings(
  settings: ShippingMarkupSettings,
  changedBy: string | null,
) {
  const existing = await prisma.shippingMarkupConfig.findUnique({ where: { id: "default" } });
  const saved = await prisma.shippingMarkupConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...settings, updatedBy: changedBy },
    update: { ...settings, updatedBy: changedBy },
  });
  await prisma.markupAuditLog.create({
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
