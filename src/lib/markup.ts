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

export type MarkupResult = {
  markupCents: number;
  customerTotalCents: number;
};

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
