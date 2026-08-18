import { describe, expect, it } from "vitest";
import { deriveDirectUrl, resolvePublicAppUrl, sanitizeDatabaseUrl, stripeWebhookUrl } from "@/lib/env";

describe("database url helpers", () => {
  it("unwraps a Neon psql-prefixed connection string", () => {
    const raw =
      "psql 'postgresql://user:pass@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require'";
    expect(sanitizeDatabaseUrl(raw)).toBe(
      "postgresql://user:pass@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("derives a direct host by removing -pooler", () => {
    expect(
      deriveDirectUrl(
        "postgresql://user:pass@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe("postgresql://user:pass@ep-x.region.aws.neon.tech/neondb?sslmode=require");
  });

  it("prefers the Netlify HTTPS site URL over localhost in production", () => {
    expect(
      resolvePublicAppUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        URL: "https://liora-ships.netlify.app",
      }),
    ).toBe("https://liora-ships.netlify.app");
  });

  it("builds the Stripe webhook URL on the public site", () => {
    expect(stripeWebhookUrl("https://liora-ships.netlify.app")).toBe(
      "https://liora-ships.netlify.app/api/webhooks/stripe",
    );
  });
});
