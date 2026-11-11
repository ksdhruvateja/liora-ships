import type { Shipment, ShipmentStatus } from "@prisma/client";
import { getConfig } from "./config";
import { formatEstimatedDelivery } from "./courier-names";
import { canSendLabelEmail, OPERATOR_EMAIL } from "./email";
import { cancelDeadline, isCancellable, refundAmountCents } from "./cancellation";

export type PublicShipment = {
  id: string;
  status: ShipmentStatus;
  customerEmail: string;
  courierName: string;
  estimatedDelivery: string | null;
  customerTotalCents: number;
  finalCustomerTotalCents: number;
  pickupCustomerCents: number;
  pickupRequired: boolean;
  pickupStatus: string;
  pickupDate: string | null;
  pickupFromTime: string | null;
  pickupToTime: string | null;
  referenceNumber: string | null;
  currency: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelDownloadUrl: string | null;
  createdAt: string;
  labelEmailEnabled: boolean;
  notifyEmail: string;
  lastError: string | null;
  labelEmailSent: boolean;
  /** Label can be cancelled online right now. */
  canCancel: boolean;
  cancelDeadline: string | null;
  /** What the customer would get back if they cancel now (or got back). */
  refundEstimateCents: number;
  cancellationFeeCents: number;
  cancelledAt: string | null;
  refundStatus: string;
  refundCents: number | null;
  refundedAt: string | null;
};

function estimatedDelivery(shipment: Shipment) {
  if (!shipment.estimatedMinDays && !shipment.estimatedMaxDays) return null;
  return formatEstimatedDelivery(shipment.estimatedMinDays, shipment.estimatedMaxDays);
}

export function toPublicShipment(shipment: Shipment): PublicShipment {
  const config = getConfig();
  const ready = shipment.status === "LABEL_CREATED" && !shipment.cancelledAt;
  return {
    id: shipment.id,
    status: shipment.status,
    customerEmail: shipment.customerEmail,
    courierName: shipment.brandedCourierName,
    estimatedDelivery: estimatedDelivery(shipment),
    customerTotalCents: shipment.customerTotalCents,
    finalCustomerTotalCents: shipment.finalCustomerTotalCents ?? shipment.customerTotalCents,
    pickupCustomerCents: shipment.pickupCustomerCents ?? 0,
    pickupRequired: shipment.pickupRequired,
    pickupStatus: shipment.pickupStatus,
    pickupDate: shipment.pickupDate,
    pickupFromTime: shipment.pickupFromTime,
    pickupToTime: shipment.pickupToTime,
    referenceNumber: shipment.referenceNumber,
    currency: shipment.currency,
    trackingNumber: ready ? shipment.trackingNumber : null,
    trackingUrl:
      ready && shipment.trackingNumber
        ? `${config.appUrl}/track/${encodeURIComponent(shipment.trackingNumber)}`
        : null,
    labelDownloadUrl: ready ? `${config.appUrl}/api/shipments/${shipment.id}/label` : null,
    createdAt: shipment.createdAt.toISOString(),
    labelEmailEnabled: canSendLabelEmail(),
    notifyEmail: config.LABEL_NOTIFY_EMAIL || OPERATOR_EMAIL,
    lastError:
      shipment.status === "PAID" || shipment.status === "FAILED"
        ? shipment.lastError
        : null,
    labelEmailSent: Boolean(shipment.labelEmailSentAt),
    canCancel: isCancellable(shipment),
    cancelDeadline:
      shipment.status === "LABEL_CREATED" && config.CANCEL_WINDOW_DAYS > 0
        ? cancelDeadline(shipment).toISOString()
        : null,
    refundEstimateCents: shipment.refundCents ?? refundAmountCents(shipment),
    cancellationFeeCents: config.CANCELLATION_FEE_CENTS,
    cancelledAt: shipment.cancelledAt?.toISOString() ?? null,
    refundStatus: shipment.refundStatus,
    refundCents: shipment.refundCents,
    refundedAt: shipment.refundedAt?.toISOString() ?? null,
  };
}

export function toPublicQuoteRate(shipment: Shipment) {
  return {
    shipmentId: shipment.id,
    courierName: shipment.brandedCourierName,
    estimatedDelivery:
      estimatedDelivery(shipment) ?? "Delivery window confirmed after purchase",
    customerTotalCents: shipment.customerTotalCents,
    currency: shipment.currency,
  };
}
