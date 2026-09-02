import type { Shipment } from "@prisma/client";
import type { StaffRole } from "./staff-auth";

export type TodayLabelRow = {
  id: string;
  generatedAt: string | null;
  referenceNumber: string | null;
  senderName: string | null;
  recipientName: string | null;
  customerEmail: string;
  courierName: string;
  easyshipShipmentId: string | null;
  trackingNumber: string | null;
  labelCostCents: number;
  customerPriceCents: number;
  markupCents: number | null;
  pickupRequired: boolean;
  pickupDate: string | null;
  pickupFromTime: string | null;
  pickupToTime: string | null;
  pickupPriceCents: number | null;
  pickupStatus: string;
  labelStatus: string;
  createdBy: string | null;
  labelDownloadUrl: string | null;
  trackingUrl: string | null;
};

function addressContact(address: unknown) {
  const row = address as { contactName?: string; line1?: string; city?: string; state?: string };
  const name = row.contactName?.trim();
  if (name) return name;
  return [row.line1, row.city, row.state].filter(Boolean).join(", ") || null;
}

export function toTodayLabelRow(
  shipment: Shipment,
  appUrl: string,
  role: StaffRole,
): TodayLabelRow {
  const ready = shipment.status === "LABEL_CREATED";
  return {
    id: shipment.id,
    generatedAt: shipment.labelGeneratedAt?.toISOString() ?? null,
    referenceNumber: shipment.referenceNumber,
    senderName: addressContact(shipment.originAddress),
    recipientName: addressContact(shipment.destAddress),
    customerEmail: shipment.customerEmail,
    courierName: shipment.brandedCourierName,
    easyshipShipmentId: shipment.easyshipShipmentId,
    trackingNumber: shipment.trackingNumber,
    labelCostCents: shipment.baseCostCents,
    customerPriceCents: shipment.finalCustomerTotalCents ?? shipment.customerTotalCents,
    markupCents: role === "admin" ? shipment.markupCents : null,
    pickupRequired: shipment.pickupRequired,
    pickupDate: shipment.pickupDate,
    pickupFromTime: shipment.pickupFromTime,
    pickupToTime: shipment.pickupToTime,
    pickupPriceCents: shipment.pickupCustomerCents || shipment.pickupPriceCents,
    pickupStatus: shipment.pickupStatus,
    labelStatus: shipment.status,
    createdBy: shipment.createdBy,
    labelDownloadUrl: ready ? `${appUrl}/api/shipments/${shipment.id}/label` : null,
    trackingUrl:
      ready && shipment.trackingNumber
        ? `${appUrl}/track/${encodeURIComponent(shipment.trackingNumber)}`
        : null,
  };
}
