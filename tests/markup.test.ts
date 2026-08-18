import { describe, expect, it } from "vitest";
import { applyMarkup, MarkupError } from "@/lib/markup";

const defaultRule = {
  type: "PERCENT" as const,
  value: 15,
  minCents: 200,
  maxCents: 2500,
};

describe("applyMarkup", () => {
  it("uses 15% when that exceeds the $2 floor", () => {
    const result = applyMarkup(10000, defaultRule);
    expect(result.markupCents).toBe(1500);
    expect(result.customerTotalCents).toBe(11500);
  });

  it("applies the $2.00 floor when percent markup is smaller", () => {
    const result = applyMarkup(500, defaultRule);
    expect(result.markupCents).toBe(200);
    expect(result.customerTotalCents).toBe(700);
  });

  it("caps markup at $25.00 even if 15% is larger", () => {
    const result = applyMarkup(20000, defaultRule);
    expect(result.markupCents).toBe(2500);
    expect(result.customerTotalCents).toBe(22500);
  });

  it("applies the floor on zero base cost", () => {
    const result = applyMarkup(0, defaultRule);
    expect(result.markupCents).toBe(200);
    expect(result.customerTotalCents).toBe(200);
  });

  it("applies a flat markup", () => {
    const result = applyMarkup(1000, { type: "FLAT", value: 350 });
    expect(result.markupCents).toBe(350);
    expect(result.customerTotalCents).toBe(1350);
  });

  it("rejects negative base cost", () => {
    expect(() => applyMarkup(-1, defaultRule)).toThrow(MarkupError);
  });

  it("rejects negative markup values", () => {
    expect(() => applyMarkup(100, { type: "FLAT", value: -5 })).toThrow(MarkupError);
  });
});
