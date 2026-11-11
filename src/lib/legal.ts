import { getConfig } from "./config";
import { OPERATOR_EMAIL } from "./email";
import { formatMoney } from "./money";

/** Last time the policy text below was materially changed. Bump when editing a policy. */
export const POLICIES_UPDATED = "November 10, 2026";

/**
 * Business facts shown in the Terms, Privacy and Refund policies.
 * Set these in the environment so the policies name the real business:
 *   LEGAL_BUSINESS_NAME   – registered business name (defaults to the app name)
 *   SUPPORT_EMAIL         – where customers write for help, refunds and privacy requests
 *   LEGAL_GOVERNING_STATE – US state whose law governs the Terms, e.g. "Delaware"
 *   LEGAL_MAILING_ADDRESS – postal address for notices (optional)
 */
export function legalInfo() {
  const config = getConfig();
  const window = config.CANCEL_WINDOW_DAYS;
  const fee = config.CANCELLATION_FEE_CENTS;
  return {
    appName: config.appName,
    businessName: process.env.LEGAL_BUSINESS_NAME?.trim() || config.appName,
    supportEmail:
      process.env.SUPPORT_EMAIL?.trim() || config.LABEL_NOTIFY_EMAIL || OPERATOR_EMAIL,
    governingState: process.env.LEGAL_GOVERNING_STATE?.trim() || "",
    mailingAddress: process.env.LEGAL_MAILING_ADDRESS?.trim() || "",
    appUrl: config.appUrl,
    cancelWindowDays: window,
    cancellationFee: fee,
    cancellationFeeText: fee > 0 ? formatMoney(fee, "USD") : "",
    onlineCancelEnabled: window > 0,
  };
}

export type LegalInfo = ReturnType<typeof legalInfo>;

export const legalPages = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Cancellation & Refunds" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/faq", label: "FAQ" },
] as const;
