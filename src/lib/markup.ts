export class MarkupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkupError";
  }
}

export type MarkupRuleInput = {
  type: "PERCENT" | "FLAT";
  value: number;
  minCents?: number | null;
  maxCents?: number | null;
};

export type ShippingMarkupSettings = {
  enabled: boolean;
  percentage: number;
  fixedMarkupCents: number;
};

export type MarkupResult = {
  markupCents: number;
  customerTotalCents: number;
  markupPercentUsed: number;
};

const MAX_MARKUP_PERCENT = 100;

function assertValidPercentage(percentage: number) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_MARKUP_PERCENT) {
    throw new MarkupError(`Markup percentage must be between 0 and ${MAX_MARKUP_PERCENT}`);
  }
  const decimals = String(percentage).split(".")[1];
  if (decimals && decimals.length > 2) {
    throw new MarkupError("Markup percentage supports at most two decimal places");
  }
}

/**
 * Authoritative shipping markup: percentage of Easyship rate + optional fixed cents.
 * Pickup fees must never pass through this function.
 */
export function applyShippingMarkup(
  baseCents: number,
  settings: ShippingMarkupSettings,
): MarkupResult {
  assertNonNegative("Base cost", baseCents);
  assertNonNegative("Fixed markup", settings.fixedMarkupCents);
  if (!settings.enabled) {
    return { markupCents: 0, customerTotalCents: Math.round(baseCents), markupPercentUsed: 0 };
  }
  assertValidPercentage(settings.percentage);
  const percentMarkupCents = Math.round(baseCents * (settings.percentage / 100));
  const markupCents = percentMarkupCents + Math.round(settings.fixedMarkupCents);
  return {
    markupCents,
    customerTotalCents: Math.round(baseCents) + markupCents,
    markupPercentUsed: settings.percentage,
  };
}

export function validateShippingMarkupSettings(input: Partial<ShippingMarkupSettings>) {
  if (typeof input.enabled !== "boolean") {
    throw new MarkupError("Markup enabled flag is required");
  }
  if (input.percentage == null || !Number.isFinite(input.percentage)) {
    throw new MarkupError("Markup percentage is required");
  }
  if (input.fixedMarkupCents == null || !Number.isFinite(input.fixedMarkupCents)) {
    throw new MarkupError("Fixed markup is required");
  }
  assertValidPercentage(input.percentage);
  assertNonNegative("Fixed markup", input.fixedMarkupCents);
  return {
    enabled: input.enabled,
    percentage: input.percentage,
    fixedMarkupCents: Math.round(input.fixedMarkupCents),
  };
}

function assertNonNegative(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new MarkupError(`${name} must be a non-negative finite number`);
  }
}

/**
 * Markup = percent or flat amount, optional minCents floor and maxCents cap.
 * Default from env: APP_MARKUP_PERCENT (10).
 */
export function applyMarkup(
  baseCents: number,
  rule: MarkupRuleInput,
): MarkupResult {
  assertNonNegative("Base cost", baseCents);
  assertNonNegative("Markup value", rule.value);
  if (rule.minCents != null) assertNonNegative("minCents", rule.minCents);
  if (rule.maxCents != null) assertNonNegative("maxCents", rule.maxCents);
  if (
    rule.minCents != null &&
    rule.maxCents != null &&
    rule.minCents > rule.maxCents
  ) {
    throw new MarkupError("minCents cannot exceed maxCents");
  }

  let markupCents =
    rule.type === "PERCENT"
      ? Math.round(baseCents * (rule.value / 100))
      : Math.round(rule.value);

  if (rule.minCents != null) {
    markupCents = Math.max(markupCents, rule.minCents);
  }
  if (rule.maxCents != null) {
    markupCents = Math.min(markupCents, rule.maxCents);
  }

  markupCents = Math.max(0, Math.round(markupCents));
  return {
    markupCents,
    customerTotalCents: Math.round(baseCents) + markupCents,
    markupPercentUsed: rule.type === "PERCENT" ? rule.value : 0,
  };
}

export function selectMarkupRule<T extends MarkupRuleInput & { active?: boolean; appliesToCourierId?: string | null }>(
  rules: T[],
  courierId: string | null,
): T | null {
  const active = rules.filter((rule) => rule.active !== false);
  return (
    active.find((rule) => rule.appliesToCourierId === courierId) ??
    active.find((rule) => rule.appliesToCourierId == null) ??
    null
  );
}
