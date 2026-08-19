import { describe, expect, it } from "vitest";
import { addressSchema } from "@/lib/validations";
import {
  DEFAULT_COMPANY_NAME,
  companyNameOrDefault,
  parcelCategoryForContents,
} from "@/lib/parcel-contents";

const address = {
  line1: "1 Market St",
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  countryAlpha2: "us",
  contactName: "Alex",
  contactPhone: "+14155550100",
  contactEmail: "alex@example.com",
};

describe("quote defaults", () => {
  it("uses Liora when company is blank", () => {
    expect(companyNameOrDefault("")).toBe(DEFAULT_COMPANY_NAME);
    expect(companyNameOrDefault("   ")).toBe("Liora");
    expect(companyNameOrDefault("Acme")).toBe("Acme");
  });

  it("stores Liora on quote addresses with no company", () => {
    const parsed = addressSchema.parse({ ...address, companyName: "" });
    expect(parsed.companyName).toBe("Liora");
  });

  it("maps contents dropdown values to a carrier category", () => {
    expect(parcelCategoryForContents("Electronics")).toBe("electronics");
    expect(parcelCategoryForContents("Other")).toBe("merchandise");
  });

  it("accepts US states by name or code and only the United States", () => {
    expect(addressSchema.parse({ ...address, state: "California" }).state).toBe("CA");
    expect(addressSchema.parse({ ...address, countryAlpha2: "USA" }).countryAlpha2).toBe("US");
    expect(() => addressSchema.parse({ ...address, countryAlpha2: "GB" })).toThrow();
    expect(() => addressSchema.parse({ ...address, state: "Ontario" })).toThrow();
    expect(() => addressSchema.parse({ ...address, postalCode: "M5V 2T6" })).toThrow();
  });
});
