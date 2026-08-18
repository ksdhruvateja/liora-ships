import { z } from "zod";
import { emptyToUndefined, normalizeProcessEnv, resolvePublicAppUrl } from "./env";

function isMockEnabled() {
  const value = process.env.FOREZSHIPS_MOCK?.toLowerCase();
  return value === "true" || value === "1";
}

function applyMockPlaceholders() {
  if (!isMockEnabled()) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FOREZSHIPS_MOCK cannot be enabled in production.");
  }
  if (!process.env.EASYSHIP_API_KEY) process.env.EASYSHIP_API_KEY = "mock_easyship_key";
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = "sk_test_mock_forezships";
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_forezships";
  }
}

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

function parseNonNegativeNumber(value: string | undefined, fallback: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function readMarkupFromEnv() {
  return {
    APP_MARKUP_PERCENT: parseNonNegativeNumber(process.env.APP_MARKUP_PERCENT, 10),
    APP_MARKUP_FLAT_CENTS: Math.round(parseNonNegativeNumber(process.env.APP_MARKUP_FLAT_CENTS, 0)),
    APP_MARKUP_CAP_CENTS: Math.round(parseNonNegativeNumber(process.env.APP_MARKUP_CAP_CENTS, 0)),
  };
}

const envSchema = z.object({
  EASYSHIP_API_KEY: z.string().min(1, "EASYSHIP_API_KEY is required"),
  EASYSHIP_BASE_URL: z
    .string()
    .url()
    .default("https://public-api.easyship.com/2024-09"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: optionalString,
  APP_MARKUP_PERCENT: z.coerce.number().min(0).default(10),
  APP_MARKUP_FLAT_CENTS: z.coerce.number().int().min(0).default(0),
  APP_MARKUP_CAP_CENTS: z.coerce.number().int().min(0).default(0),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Liora Labs Shipping"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  GMAIL_USER: z.preprocess(
    emptyToUndefined,
    z.string().email().default("zippyyycare@gmail.com"),
  ),
  GMAIL_APP_PASSWORD: z.preprocess((value) => {
    if (typeof value !== "string") return emptyToUndefined(value);
    return emptyToUndefined(value.replace(/\s+/g, ""));
  }, z.string().optional().default("")),
  LABEL_NOTIFY_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().default("zippyyycare@gmail.com"),
  ),
  ALERT_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().default("zippyyycare@gmail.com"),
  ),
  SLACK_WEBHOOK_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional().or(z.literal("")).default(""),
  ),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().optional().default("")),
  FOREZSHIPS_MOCK: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  appName: string;
  appUrl: string;
  mockMode: boolean;
  STRIPE_WEBHOOK_SECRET: string;
};

let cached: AppConfig | null = null;

function isBuildTime() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.SKIP_ENV_VALIDATION === "1"
  );
}

export function getConfig(): AppConfig {
  if (cached) {
    Object.assign(cached, readMarkupFromEnv());
    return cached;
  }
  normalizeProcessEnv();
  applyMockPlaceholders();

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    const message = `Liora Labs cannot start — missing or invalid environment variables:\n${details}\nNever boot without Stripe and Easyship keys.`;
    if (isBuildTime()) {
      console.warn(message);
      return {
        EASYSHIP_API_KEY: process.env.EASYSHIP_API_KEY ?? "build-placeholder",
        EASYSHIP_BASE_URL:
          process.env.EASYSHIP_BASE_URL ??
          "https://public-api.easyship.com/2024-09",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "build-placeholder",
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/forezships",
        DIRECT_URL: process.env.DIRECT_URL,
        APP_MARKUP_PERCENT: 10,
        APP_MARKUP_FLAT_CENTS: 0,
        APP_MARKUP_CAP_CENTS: 0,
        NEXT_PUBLIC_APP_NAME: "Liora Labs Shipping",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        GMAIL_USER: "zippyyycare@gmail.com",
        GMAIL_APP_PASSWORD: "",
        LABEL_NOTIFY_EMAIL: "zippyyycare@gmail.com",
        ALERT_EMAIL: "zippyyycare@gmail.com",
        SLACK_WEBHOOK_URL: "",
        CRON_SECRET: "",
        FOREZSHIPS_MOCK: "",
        NODE_ENV: "development",
        appName: "Liora Labs Shipping",
        appUrl: "http://localhost:3000",
        mockMode: false,
      };
    }
    throw new Error(message);
  }

  cached = {
    ...parsed.data,
    ...readMarkupFromEnv(),
    STRIPE_WEBHOOK_SECRET: parsed.data.STRIPE_WEBHOOK_SECRET ?? "",
    appName: parsed.data.NEXT_PUBLIC_APP_NAME,
    appUrl: resolvePublicAppUrl(),
    mockMode: isMockEnabled(),
  };
  return cached;
}

export function getEnvMarkupRule() {
  const config = getConfig();
  const capCents = config.APP_MARKUP_CAP_CENTS > 0 ? config.APP_MARKUP_CAP_CENTS : null;

  if (config.APP_MARKUP_PERCENT === 0 && config.APP_MARKUP_FLAT_CENTS > 0) {
    return {
      type: "FLAT" as const,
      value: config.APP_MARKUP_FLAT_CENTS,
      minCents: null,
      maxCents: capCents,
      active: true,
      appliesToCourierId: null as string | null,
    };
  }

  return {
    type: "PERCENT" as const,
    value: config.APP_MARKUP_PERCENT,
    minCents: config.APP_MARKUP_FLAT_CENTS > 0 ? config.APP_MARKUP_FLAT_CENTS : null,
    maxCents: capCents,
    active: true,
    appliesToCourierId: null as string | null,
  };
}

export function resetConfigCache() {
  cached = null;
}
