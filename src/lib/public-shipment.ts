import type { Shipment, ShipmentStatus } from "@prisma/client";
import { getConfig } from "./config";
import { formatEstimatedDelivery } from "./courier-names";
import { canSendLabelEmail, OPERATOR_EMAIL } from "./email";

export type PublicShipment = {
  id: string;
  status: ShipmentStatus;
  customerEmail: string;
  courierName: string;
  estimatedDelivery: string | null;
  customerTotalCents: number;
  currency: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelDownloadUrl: string | null;
  createdAt: string;
  labelEmailEnabled: boolean;
  notifyEmail: string;
  lastError: string | null;
};

function estimatedDelivery(shipment: Shipment) {
  if (!shipment.estimatedMinDays && !shipment.estimatedMaxDays) return null;
  return formatEstimatedDelivery(shipment.estimatedMinDays, shipment.estimatedMaxDays);
}

export function toPublicShipment(shipment: Shipment): PublicShipment {
  const config = getConfig();
  const ready = shipment.status === "LABEL_CREATED";
  return {
    id: shipment.id,
    status: shipment.status,
    customerEmail: shipment.customerEmail,
    courierName: shipment.brandedCourierName,
    estimatedDelivery: estimatedDelivery(shipment),
    customerTotalCents: shipment.customerTotalCents,
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
