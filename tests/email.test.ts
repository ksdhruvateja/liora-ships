import { describe, expect, it } from "vitest";
import {
  labelEmailFromAddress,
  labelEmailRecipients,
  labelMailtoHref,
  renderLabelEmailHtml,
  sendLabelEmail,
} from "@/lib/email";

describe("label email", () => {
  it("sends from the operator Gmail address", () => {
    expect(labelEmailFromAddress("Liora Labs Shipping")).toBe(
      "Liora Labs Shipping <zippyyycare@gmail.com>",
    );
  });

  it("sends to the customer and quietly copies the operator inbox", () => {
    expect(labelEmailRecipients("buyer@example.com")).toEqual({
      to: "buyer@example.com",
      bcc: "zippyyycare@gmail.com",
    });
  });

  it("does not duplicate the operator address", () => {
    expect(labelEmailRecipients("zippyyycare@gmail.com")).toEqual({
      to: "zippyyycare@gmail.com",
      bcc: undefined,
    });
  });

  it("renders the branded label email", () => {
    const html = renderLabelEmailHtml(
      {
        to: "buyer@example.com",
        shipmentId: "ship_1",
        courierName: "Liora Express",
        trackingNumber: "1Z999",
        labelDownloadUrl: "https://example.com/label",
        trackingUrl: "https://example.com/track/1Z999",
      },
      "Liora Labs Shipping",
    );
    expect(html).toContain("Liora Express");
    expect(html).toContain("1Z999");
    expect(html).toContain("https://example.com/label");
    expect(html).not.toMatch(/easyship/i);
  });

  it("opens a compose window to the customer email from the form", () => {
    expect(
      labelMailtoHref({
        customerEmail: "buyer@example.com",
        trackingNumber: "1Z999",
        courierName: "Liora Express",
        labelDownloadUrl: "https://example.com/label",
      }),
    ).toContain("mailto:buyer@example.com");
  });

  it("skips auto-send when Gmail is not authenticated", async () => {
    await expect(
      sendLabelEmail({
        to: "buyer@example.com",
        shipmentId: "ship_1",
        courierName: "Liora Express",
        trackingNumber: "1Z999",
        labelDownloadUrl: "https://example.com/label",
        trackingUrl: "https://example.com/track/1Z999",
      }),
    ).resolves.toEqual({ skipped: true });
  });
});
