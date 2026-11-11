import type { Shipment } from "@prisma/client";
import { getConfig } from "./config";
import { prisma } from "./db";
import { getEasyship } from "./easyship-client";
import type { EasyshipClient } from "./easyship";
import { getStripe } from "./stripe";
import { sendOpsAlert } from "./alerts";
import { canSendLabelEmail, sendPlainEmail } from "./email";
import { formatMoney } from "./money";

/**
 * Label cancellation flow
 *
 *   1. Check eligibility (label created, inside the cancel window, not already cancelled).
 *   2. Void the label at Easyship (POST /shipments/{id}/cancel).
 *   3. Refund the customer through Stripe (amount paid minus CANCELLATION_FEE_CENTS).
 *
 * Each step is recorded on the shipment so a retry resumes where it stopped: if
 * Easyship already accepted the cancel but the Stripe refund failed, calling
 * cancelLabel again skips straight to the refund. Stripe calls use an
 * idempotency key so a refund is never issued twice.
 */

export type RefundStatus = "NONE" | "PENDING" | "SUCCEEDED" | "FAILED";

export type CancelActor = { type: "customer"; email: string } | { type: "staff"; role: string };

export type CancelDeps = {
  easyship?: EasyshipClient;
  refund?: (input: {
    paymentIntentId: string;
    amountCents: number;
    idempotencyKey: string;
    shipmentId: string;
  }) => Promise<{ id: string; status: string | null }>;
  sendEmail?: typeof sendPlainEmail;
  alert?: typeof sendOpsAlert;
  now?: () => Date;
};

export class CancelError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "forbidden"
      | "not_eligible"
      | "window_closed"
      | "carrier_refused"
      | "carrier_error"
      | "refund_failed"
      | "busy",
    readonly status: number,
  ) {
    super(message);
  }
}

export function paidCents(shipment: Pick<Shipment, "finalCustomerTotalCents" | "customerTotalCents">) {
  return shipment.finalCustomerTotalCents ?? shipment.customerTotalCents;
}

export function refundAmountCents(
  shipment: Pick<Shipment, "finalCustomerTotalCents" | "customerTotalCents">,
  feeCents = getConfig().CANCELLATION_FEE_CENTS,
) {
  return Math.max(0, paidCents(shipment) - Math.max(0, feeCents));
}

export function cancelDeadline(
  shipment: Pick<Shipment, "labelGeneratedAt" | "updatedAt" | "createdAt">,
  windowDays = getConfig().CANCEL_WINDOW_DAYS,
) {
  const start = shipment.labelGeneratedAt ?? shipment.updatedAt ?? shipment.createdAt;
  return new Date(start.getTime() + windowDays * 24 * 60 * 60 * 1000);
}

/** Whether the customer-facing "Cancel label" option should be offered. */
export function isCancellable(shipment: Shipment, now = new Date()) {
  if (shipment.status !== "LABEL_CREATED") return false;
  if (!shipment.easyshipShipmentId) return false;
  if (shipment.cancelledAt) return false;
  if (getConfig().CANCEL_WINDOW_DAYS <= 0) return false;
  return now <= cancelDeadline(shipment);
}

function defaultRefund(input: {
  paymentIntentId: string;
  amountCents: number;
  idempotencyKey: string;
  shipmentId: string;
}) {
  return getStripe()
    .refunds.create(
      {
        payment_intent: input.paymentIntentId,
        amount: input.amountCents,
        reason: "requested_by_customer",
        metadata: { shipmentId: input.shipmentId, source: "label_cancellation" },
      },
      { idempotencyKey: input.idempotencyKey },
    )
    .then((refund) => ({ id: refund.id, status: refund.status }));
}

async function withLock<T>(shipmentId: string, fn: () => Promise<T>): Promise<T> {
  let locked = false;
  try {
    const rows = await prisma.$queryRaw<Array<{ locked: boolean | null }>>`
      SELECT pg_try_advisory_lock(hashtext(${`cancel:${shipmentId}`})) AS locked
    `;
    locked = Boolean(rows?.[0]?.locked);
    if (!locked) throw new CancelError("A cancellation is already in progress. Try again in a moment.", "busy", 409);
  } catch (error) {
    if (error instanceof CancelError) throw error;
    locked = false; // No advisory locks available (tests); continue unlocked.
  }
  try {
    return await fn();
  } finally {
    if (locked) {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${`cancel:${shipmentId}`}))`.catch(() => undefined);
    }
  }
}

async function notifyCustomer(shipment: Shipment, deps: CancelDeps) {
  if (!canSendLabelEmail() && !deps.sendEmail) return;
  const config = getConfig();
  const send = deps.sendEmail ?? sendPlainEmail;
  const amount = formatMoney(shipment.refundCents ?? 0, shipment.currency);
  try {
    await send({
      to: shipment.customerEmail,
      subject: `${config.appName}: label cancelled${shipment.trackingNumber ? ` (${shipment.trackingNumber})` : ""}`,
      text: [
        `Your shipping label${shipment.trackingNumber ? ` ${shipment.trackingNumber}` : ""} has been cancelled.`,
        "",
        `Refund: ${amount} to your original payment method.`,
        "Card refunds usually appear within 5–10 business days, depending on your bank.",
        "",
        "Please do not use the old label — it is no longer valid.",
        "",
        `Details: ${config.appUrl}/shipments/${shipment.id}`,
      ].join("\n"),
    });
  } catch (error) {
    await (deps.alert ?? sendOpsAlert)(
      "Cancellation email failed",
      `Shipment ${shipment.id} was cancelled and refunded, but emailing ${shipment.customerEmail} failed: ${String(error)}`,
    );
  }
}

export async function cancelLabel(
  shipmentId: string,
  actor: CancelActor,
  options: { reason?: string } = {},
  deps: CancelDeps = {},
): Promise<Shipment> {
  const config = getConfig();
  const now = deps.now ?? (() => new Date());
  const alert = deps.alert ?? sendOpsAlert;

  return withLock(shipmentId, async () => {
    let shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new CancelError("Shipment not found.", "not_found", 404);

    if (actor.type === "customer") {
      const matches = shipment.customerEmail.trim().toLowerCase() === actor.email.trim().toLowerCase();
      if (!matches) {
        throw new CancelError("That email doesn’t match this shipment.", "forbidden", 403);
      }
    }

    // Already fully done — idempotent success.
    if (shipment.status === "REFUNDED" && shipment.refundStatus === "SUCCEEDED") return shipment;

    const resumingRefund = Boolean(shipment.cancelledAt) && shipment.refundStatus !== "SUCCEEDED";

    if (!resumingRefund) {
      if (shipment.status !== "LABEL_CREATED" || !shipment.easyshipShipmentId) {
        throw new CancelError("Only purchased labels can be cancelled.", "not_eligible", 409);
      }
      // Staff may cancel outside the customer window; the carrier still has the final say.
      if (actor.type === "customer" && !isCancellable(shipment, now())) {
        throw new CancelError(
          `Labels can be cancelled online within ${config.CANCEL_WINDOW_DAYS} days of purchase. Contact support for help.`,
          "window_closed",
          409,
        );
      }

      const actorLabel = actor.type === "customer" ? `customer:${actor.email.toLowerCase()}` : `staff:${actor.role}`;
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          cancelRequestedAt: now(),
          cancelledBy: actorLabel,
          cancelReason: options.reason?.slice(0, 500) || null,
        },
      });

      const easyship = deps.easyship ?? getEasyship();
      let result;
      try {
        result = await easyship.cancelShipment(shipment.easyshipShipmentId!);
      } catch {
        await prisma.shipment.update({ where: { id: shipment.id }, data: { cancelRequestedAt: null } });
        throw new CancelError(
          "We couldn’t reach the carrier. Please try again in a minute.",
          "carrier_error",
          502,
        );
      }
      if (!result.ok) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { cancelRequestedAt: null, refundError: `Carrier: ${result.message}` },
        });
        if (result.reason === "not_cancellable") {
          throw new CancelError(
            "This label can’t be cancelled — the carrier has already accepted or scanned the parcel.",
            "carrier_refused",
            409,
          );
        }
        await alert("Label cancel failed", `Shipment ${shipment.id}: Easyship said “${result.message}”.`);
        throw new CancelError("The carrier couldn’t cancel this label right now. Please try again.", "carrier_error", 502);
      }

      const amount = refundAmountCents(shipment, config.CANCELLATION_FEE_CENTS);
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          cancelledAt: now(),
          refundStatus: "PENDING",
          refundCents: amount,
          refundError: null,
        },
      });
    }

    // ---- Refund step (also the resume point) ----
    const amount = shipment.refundCents ?? refundAmountCents(shipment, config.CANCELLATION_FEE_CENTS);
    const paymentIntentId = shipment.stripePaymentIntentId;
    const isMockPayment = !paymentIntentId || paymentIntentId.startsWith("mock_");

    if (amount <= 0 || (isMockPayment && config.mockMode)) {
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "REFUNDED",
          refundStatus: "SUCCEEDED",
          refundedAt: now(),
          stripeRefundId: amount <= 0 ? null : `mock_re_${shipment.id}`,
        },
      });
    } else if (!paymentIntentId) {
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: { refundStatus: "FAILED", refundError: "No payment on file to refund." },
      });
      await alert("Refund needs manual action", `Shipment ${shipment.id} was voided but has no Stripe payment intent.`);
      throw new CancelError(
        "Your label was cancelled. Our team will process the refund manually and email you.",
        "refund_failed",
        502,
      );
    } else {
      try {
        const refund = await (deps.refund ?? defaultRefund)({
          paymentIntentId,
          amountCents: amount,
          idempotencyKey: `label-cancel-refund-${shipment.id}`,
          shipmentId: shipment.id,
        });
        shipment = await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: "REFUNDED",
            refundStatus: "SUCCEEDED",
            stripeRefundId: refund.id,
            refundedAt: now(),
            refundError: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        shipment = await prisma.shipment.update({
          where: { id: shipment.id },
          data: { refundStatus: "FAILED", refundError: `Stripe: ${message}`.slice(0, 1000) },
        });
        await alert(
          "Refund failed after label cancel",
          `Shipment ${shipment.id} was voided at Easyship but the Stripe refund of ${formatMoney(amount, shipment.currency)} failed: ${message}`,
        );
        throw new CancelError(
          "Your label was cancelled, but the refund didn’t go through yet. Try again, or we’ll process it and email you.",
          "refund_failed",
          502,
        );
      }
    }

    await notifyCustomer(shipment, deps);
    return shipment;
  });
}
