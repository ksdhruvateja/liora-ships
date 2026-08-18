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
});
