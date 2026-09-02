import type { Shipment } from "@prisma/client";
import { sendOpsAlert } from "./alerts";
import type { EasyshipClient } from "./easyship";
import { ensureEasyshipWalletFunded } from "./easyship-recharge";

export async function schedulePickupForShipment(
  shipment: Shipment,
  easyship: EasyshipClient,
  alert: typeof sendOpsAlert = sendOpsAlert,
) {
  if (!shipment.pickupRequired) return shipment;
  if (shipment.pickupStatus === "SCHEDULED" && shipment.easyshipPickupId) return shipment;
  if (!shipment.easyshipShipmentId) {
    throw new Error("Cannot schedule pickup without an Easyship shipment id");
  }
  if (!shipment.pickupDate || !shipment.pickupFromTime || !shipment.pickupToTime) {
    throw new Error("Pickup slot is incomplete");
  }

  const pickupEasyshipCostCents = shipment.pickupBaseCostCents ?? 0;
  if (pickupEasyshipCostCents > 0) {
    await ensureEasyshipWalletFunded({
      shipmentId: shipment.id,
      labelCostCents: pickupEasyshipCostCents,
      easyship,
    });
  }

  try {
    const pickup = await easyship.createPickup({
      courierServiceId: shipment.easyshipRateId,
      easyshipShipmentId: shipment.easyshipShipmentId,
      timeSlotId: shipment.pickupSlotId,
      selectedDate: shipment.pickupDate,
      selectedFromTime: shipment.pickupFromTime,
      selectedToTime: shipment.pickupToTime,
    });
    const { prisma } = await import("./db");
    return prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        easyshipPickupId: pickup.easyshipPickupId,
        pickupStatus: "SCHEDULED",
        pickupErrorCode: null,
        pickupErrorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { prisma } = await import("./db");
    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        pickupStatus: "FAILED",
        pickupErrorCode: "PICKUP_SCHEDULE_FAILED",
        pickupErrorMessage: message.slice(0, 500),
      },
    });
    await alert(
      "Pickup scheduling failed after label was created",
      `Shipment ${shipment.id} label is ready but pickup scheduling failed: ${message}`,
    );
    return updated;
  }
}
