import { z } from "zod";
import { DEFAULT_COMPANY_NAME } from "./parcel-contents";
import { isUsCountry, isUsState, normalizeUsState } from "./us-locations";

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  state: z
    .string()
    .min(1)
    .transform((value): string => normalizeUsState(value))
    .refine((value) => isUsState(value), "Select a US state"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit US ZIP code"),
  countryAlpha2: z
    .string()
    .trim()
    .transform((value): string => (isUsCountry(value) ? "US" : value.toUpperCase()))
    .refine((value) => value === "US", "Shipping is limited to the United States"),
  contactName: z.string().min(1),
  contactPhone: z.string().min(5),
  contactEmail: z.string().email(),
  companyName: z
    .string()
    .optional()
    .default("")
    .transform((value) => value.trim() || DEFAULT_COMPANY_NAME),
});

export const parcelSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  dimensionUnit: z.enum(["cm", "in"]).default("in"),
  weight: z.number().positive(),
  weightUnit: z.enum(["kg", "lb", "g", "oz"]).default("lb"),
  description: z.string().min(1),
  declaredValueCents: z.number().int().positive(),
  declaredCurrency: z.string().length(3).default("USD"),
  hsCode: z.string().optional(),
  category: z.string().optional().default("merchandise"),
});

export const quoteRequestSchema = z.object({
  customerEmail: z.string().email(),
  origin: addressSchema,
  destination: addressSchema,
  parcel: parcelSchema,
});

export const checkoutRequestSchema = z.object({
  shipmentId: z.string().min(1),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type ParcelInput = z.infer<typeof parcelSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
