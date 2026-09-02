import { describe, expect, it } from "vitest";
import { applyShippingMarkup, validateShippingMarkupSettings } from "@/lib/markup";

const default11 = {
  enabled: true,
  percentage: 11,
  fixedMarkupCents: 0,
};

describe("shipping markup at 11%", () => {
  it("defaults to 11% markup", () => {
    const result = applyShippingMarkup(10_000, default11);
    expect(result.markupCents).toBe(1100);
    expect(result.customerTotalCents).toBe(11_100);
    expect(result.markupPercentUsed).toBe(11);
  });

  it("marks up $299.27 to $332.19", () => {
    const result = applyShippingMarkup(29_927, default11);
    expect(result.markupCents).toBe(3292);
    expect(result.customerTotalCents).toBe(33_219);
  });

  it("marks up $266.65 to $295.98", () => {
    const result = applyShippingMarkup(26_665, default11);
    expect(result.markupCents).toBe(2933);
    expect(result.customerTotalCents).toBe(29_598);
  });

  it("keeps pickup fees separate from shipping markup", () => {
    const shipping = applyShippingMarkup(29_927, default11);
    const pickupCents = 1500;
    const total = shipping.customerTotalCents + pickupCents;
    expect(shipping.markupCents).toBe(3292);
    expect(total).toBe(34_719);
  });

  it("combines $332.19 shipping with $15 pickup into $347.19", () => {
    const shipping = applyShippingMarkup(29_927, default11);
    expect(shipping.customerTotalCents).toBe(33_219);
    expect(shipping.customerTotalCents + 1500).toBe(34_719);
  });

  it("supports decimal percentages", () => {
    const result = applyShippingMarkup(10_000, {
      enabled: true,
      percentage: 8.5,
      fixedMarkupCents: 0,
    });
    expect(result.markupCents).toBe(850);
    expect(result.customerTotalCents).toBe(10_850);
  });

  it("rejects invalid percentages", () => {
    expect(() =>
      validateShippingMarkupSettings({
        enabled: true,
        percentage: Number.NaN,
        fixedMarkupCents: 0,
      }),
    ).toThrow();
    expect(() =>
      validateShippingMarkupSettings({
        enabled: true,
        percentage: 101,
        fixedMarkupCents: 0,
      }),
    ).toThrow();
    expect(() =>
      validateShippingMarkupSettings({
        enabled: true,
        percentage: 12.255,
        fixedMarkupCents: 0,
      }),
    ).toThrow();
  });

  it("rejects negative fixed markup", () => {
    expect(() =>
      validateShippingMarkupSettings({
        enabled: true,
        percentage: 11,
        fixedMarkupCents: -1,
      }),
    ).toThrow();
  });
});
