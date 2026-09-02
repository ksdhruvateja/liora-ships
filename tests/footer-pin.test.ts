import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("footer PIN link", () => {
  it("includes a PIN control in the footer source", () => {
    const footer = readFileSync(resolve("src/components/Footer.tsx"), "utf8");
    expect(footer).toContain("PIN");
    expect(footer).toContain("MarkupPinModal");
    expect(footer).not.toContain("2720022");
    expect(footer).not.toContain("MARKUP_ADMIN_PIN");
  });
});
