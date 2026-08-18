import { describe, expect, it } from "vitest";
import { deriveDirectUrl, sanitizeDatabaseUrl } from "@/lib/env";

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
});
