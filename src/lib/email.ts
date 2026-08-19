import nodemailer from "nodemailer";
import { getConfig } from "./config";

export const OPERATOR_EMAIL = "zippyyycare@gmail.com";

export type LabelEmailInput = {
  to: string;
  shipmentId: string;
  courierName: string;
  trackingNumber: string | null;
  labelDownloadUrl: string;
  trackingUrl: string;
  labelSourceUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function labelEmailFromAddress(appName: string, fromEmail = OPERATOR_EMAIL) {
  return `${appName} <${fromEmail}>`;
}

export function labelEmailRecipients(customerEmail: string, operatorEmail = OPERATOR_EMAIL) {
  const to = customerEmail.trim().toLowerCase();
  const bcc = operatorEmail.trim().toLowerCase();
  return {
    to,
    bcc: bcc && bcc !== to ? bcc : undefined,
  };
}

export function renderLabelEmailHtml(input: LabelEmailInput, appName: string) {
  const tracking = escapeHtml(input.trackingNumber ?? "Assigned shortly");
  const courier = escapeHtml(input.courierName);
  const brand = escapeHtml(appName);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1b2c6b;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#1b2c6b;padding:28px 32px;color:#fff;">
                <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#9b7cff;">${brand}</div>
                <h1 style="margin:8px 0 0;font-size:28px;">Your shipping label is ready</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                  Thanks for shipping with ${brand}. Print the attached PDF and tape it to your parcel.
                </p>
                <p style="margin:0 0 8px;"><strong>Service:</strong> ${courier}</p>
                <p style="margin:0 0 24px;"><strong>Tracking number:</strong> ${tracking}</p>
                <a href="${input.labelDownloadUrl}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;">Download label PDF</a>
                <p style="margin:24px 0 0;">
                  Track your package: <a href="${input.trackingUrl}" style="color:#7c5cff;">${escapeHtml(input.trackingUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;color:#5c6480;font-size:13px;">
                A copy of this label is attached. You can also download it from your ${brand} confirmation page.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

import { downloadLabelPdf } from "./label-file";

export function canSendLabelEmail() {
  return Boolean(getConfig().GMAIL_APP_PASSWORD.replace(/\s+/g, ""));
}

export function labelMailtoHref(input: {
  customerEmail: string;
  trackingNumber: string | null;
  courierName: string;
  labelDownloadUrl: string;
}) {
  const subject = `Liora Labs shipping label ${input.trackingNumber ?? ""}`.trim();
  const body = [
    "Your shipping label is ready. Print the PDF and tape it to your parcel.",
    "",
    `Service: ${input.courierName}`,
    `Tracking: ${input.trackingNumber ?? "Assigned shortly"}`,
    `Download: ${input.labelDownloadUrl}`,
  ].join("\n");
  return `mailto:${input.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function gmailTransport() {
  const config = getConfig();
  const user = config.GMAIL_USER || OPERATOR_EMAIL;
  const pass = config.GMAIL_APP_PASSWORD.replace(/\s+/g, "");
  if (!pass) {
    throw new Error("GMAIL_APP_PASSWORD is missing — Gmail will not send without it.");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendLabelEmail(input: LabelEmailInput) {
  if (!canSendLabelEmail()) {
    return { skipped: true as const };
  }
  const config = getConfig();
  const fromEmail = config.GMAIL_USER || OPERATOR_EMAIL;
  const recipients = labelEmailRecipients(input.to, config.LABEL_NOTIFY_EMAIL || OPERATOR_EMAIL);
  const html = renderLabelEmailHtml(input, config.appName);
  const text = [
    `Your ${config.appName} shipping label is ready.`,
    `Service: ${input.courierName}`,
    `Tracking number: ${input.trackingNumber ?? "Assigned shortly"}`,
    `Download label: ${input.labelDownloadUrl}`,
    `Track package: ${input.trackingUrl}`,
  ].join("\n");

  const pdf = input.labelSourceUrl && !input.labelSourceUrl.startsWith("mock://")
    ? await downloadLabelPdf(input.labelSourceUrl, getConfig().EASYSHIP_API_KEY)
    : undefined;
  const tracking = input.trackingNumber ?? input.shipmentId;
  const filename = `${config.appName.toLowerCase().replace(/\s+/g, "-")}-label-${tracking}.pdf`;

  const transporter = gmailTransport();
  const info = await transporter.sendMail({
    from: labelEmailFromAddress(config.appName, fromEmail),
    to: recipients.to,
    bcc: recipients.bcc,
    subject: `Your ${config.appName} shipping label`,
    html,
    text,
    attachments: pdf
      ? [{ filename, content: Buffer.from(pdf.bytes), contentType: pdf.contentType }]
      : undefined,
  });
  return { id: info.messageId };
}

export async function sendPlainEmail(input: { to: string; subject: string; text: string }) {
  const config = getConfig();
  const transporter = gmailTransport();
  await transporter.sendMail({
    from: labelEmailFromAddress(config.appName, config.GMAIL_USER || OPERATOR_EMAIL),
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}
