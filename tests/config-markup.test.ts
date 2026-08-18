import { afterEach, describe, expect, it } from "vitest";
import { getConfig, getEnvMarkupRule, resetConfigCache } from "@/lib/config";
import { applyMarkup } from "@/lib/markup";

describe("env markup", () => {
  afterEach(() => {
    delete process.env.APP_MARKUP_PERCENT;
    delete process.env.APP_MARKUP_FLAT_CENTS;
    delete process.env.APP_MARKUP_CAP_CENTS;
    resetConfigCache();
  });

  it("uses APP_MARKUP_PERCENT from env for every quote total", () => {
    process.env.APP_MARKUP_PERCENT = "10";
    resetConfigCache();
    expect(applyMarkup(996, getEnvMarkupRule())).toEqual({
      markupCents: 100,
      customerTotalCents: 1096,
    });

    process.env.APP_MARKUP_PERCENT = "25";
    expect(getConfig().APP_MARKUP_PERCENT).toBe(25);
    expect(applyMarkup(996, getEnvMarkupRule())).toEqual({
      markupCents: 249,
      customerTotalCents: 1245,
    });
  });

  it("uses a flat fee when percent is 0", () => {
    process.env.APP_MARKUP_PERCENT = "0";
    process.env.APP_MARKUP_FLAT_CENTS = "200";
    resetConfigCache();
    expect(getEnvMarkupRule().type).toBe("FLAT");
    expect(applyMarkup(996, getEnvMarkupRule())).toEqual({
      markupCents: 200,
      customerTotalCents: 1196,
    });
  });
});
