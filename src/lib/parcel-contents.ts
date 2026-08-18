export const DEFAULT_COMPANY_NAME = "Liora";

export const PARCEL_CONTENT_OPTIONS = [
  { value: "Clothing and apparel", category: "fashion" },
  { value: "Documents", category: "documents" },
  { value: "Electronics", category: "electronics" },
  { value: "Books and media", category: "books" },
  { value: "Beauty and personal care", category: "health_beauty" },
  { value: "Food (non-perishable)", category: "food" },
  { value: "Household goods", category: "home" },
  { value: "Toys and gifts", category: "toys" },
  { value: "Sports equipment", category: "sport" },
  { value: "Jewelry and accessories", category: "jewelry" },
  { value: "Artwork", category: "art" },
  { value: "Product samples", category: "merchandise" },
  { value: "Merchandise", category: "merchandise" },
  { value: "Other", category: "merchandise" },
] as const;

export type ParcelContentValue = (typeof PARCEL_CONTENT_OPTIONS)[number]["value"];

export function companyNameOrDefault(value?: string | null) {
  const company = value?.trim();
  return company || DEFAULT_COMPANY_NAME;
}

export function parcelCategoryForContents(description: string) {
  const match = PARCEL_CONTENT_OPTIONS.find((option) => option.value === description);
  return match?.category ?? "merchandise";
}
