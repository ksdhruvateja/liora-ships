import type { Shipment } from "@prisma/client";
import { getConfig } from "./config";
import { prisma } from "./db";
import { createEasyshipClient, type EasyshipClient } from "./easyship";
import { sendOpsAlert } from "./alerts";
import { sendLabelEmail } from "./email";
import { rememberShippedContacts } from "./contacts";
import type { AddressInput, ParcelInput } from "./validations";

export type FulfillmentDeps = {
  easyship?: EasyshipClient;
  sendEmail?: typeof sendLabelEmail;
  alert?: typeof sendOpsAlert;
  now?: () => Date;
};

function clientFromDeps(deps: FulfillmentDeps = {}): EasyshipClient {
  if (deps.easyship) return deps.easyship;
  const config = getConfig();
  return createEasyshipClient({
    apiKey: config.EASYSHIP_API_KEY,
    baseUrl: config.EASYSHIP_BASE_URL,
  });
}

async function withShipmentLock<T>(shipmentId: string, fn: () => Promise<T>): Promise<T | "busy"> {
  let locked = false;
  if (typeof prisma.$queryRaw === "function") {
    try {
      const rows = await prisma.$queryRaw<Array<{ locked: boolean | null }>>`
        SELECT pg_try_advisory_lock(hashtext(${shipmentId})) AS locked
      `;
      locked = Boolean(rows?.[0]?.locked);
      if (!locked) return "busy";
    } catch {
      locked = false;
    }
  }
  try {
    return await fn();
  } finally {
    if (locked) {
      try {
        await prisma.$queryRaw`
          SELECT pg_advisory_unlock(hashtext(${shipmentId}))
        `;
      } catch {
        // ignore unlock failures
      }
    }
  }
}

export async function ensureLabelEmailSent(
  shipment: Shipment,
  deps: FulfillmentDeps = {},
): Promise<Shipment> {
  if (shipment.status !== "LABEL_CREATED") return shipment;
  if (shipment.labelEmailSentAt) return shipment;

  const config = getConfig();
  const sendEmail = deps.sendEmail ?? sendLabelEmail;
  const alert = deps.alert ?? sendOpsAlert;

  try {
    const result = await sendEmail({
      to: shipment.customerEmail,
      shipmentId: shipment.id,
      courierName: shipment.brandedCourierName,
      trackingNumber: shipment.trackingNumber,
      labelDownloadUrl: `${config.appUrl}/api/shipments/${shipment.id}/label`,
      trackingUrl: shipment.trackingNumber
        ? `${config.appUrl}/track/${encodeURIComponent(shipment.trackingNumber)}`
        : `${config.appUrl}/shipments/${shipment.id}`,
      labelSourceUrl: shipment.labelUrl,
    });
    if (result && "skipped" in result && result.skipped) {
      await alert(
        "Label email skipped",
        `Shipment ${shipment.id} is ready, but GMAIL_APP_PASSWORD is missing so ${shipment.customerEmail} was not emailed.`,
      );
      return shipment;
    }
    return prisma.shipment.update({
      where: { id: shipment.id },
      data: { labelEmailSentAt: new Date() },
    });
  } catch (emailError) {
    await alert(
      "Label email failed",
      `Shipment ${shipment.id} has a label but the email to ${shipment.customerEmail} failed: ${String(emailError)}`,
    );
    return shipment;
  }
}

export async function purchaseLabelForShipment(
  shipmentId: string,
  deps: FulfillmentDeps = {},
): Promise<Shipment> {
  const easyship = clientFromDeps(deps);
  const alert = deps.alert ?? sendOpsAlert;

  const result = await withShipmentLock(shipmentId, async () => {
    const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!existing) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }
    if (existing.status === "LABEL_CREATED") {
      try {
        await rememberShippedContacts({
          customerEmail: existing.customerEmail,
          originAddress: existing.originAddress,
          destAddress: existing.destAddress,
        });
      } catch (error) {
        console.error("Could not save shipped contacts", error);
      }
      return ensureLabelEmailSent(existing, deps);
    }
    if (existing.status === "REFUNDED") {
      throw new Error(`Shipment ${shipmentId} was refunded`);
    }

    const attempted = await prisma.shipment.update({
      where: { id: shipmentId },
      data: { fulfillmentAttempts: { increment: 1 } },
    });

    try {
      const origin = existing.originAddress as AddressInput;
      const destination = existing.destAddress as AddressInput;
      const parcel = existing.parcel as ParcelInput;

      const purchased = await easyship.createShipmentAndBuyLabel({
        origin,
        destination,
        parcel,
        courierServiceId: existing.easyshipRateId,
        customerEmail: existing.customerEmail,
        platformOrderNumber: existing.id,
      });

      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: "LABEL_CREATED",
          easyshipShipmentId: purchased.easyshipShipmentId,
          labelUrl: purchased.labelUrl,
          trackingNumber: purchased.trackingNumber,
          lastError: null,
        },
      });

      try {
        await rememberShippedContacts({
          customerEmail: updated.customerEmail,
          originAddress: updated.originAddress,
          destAddress: updated.destAddress,
        });
      } catch (error) {
        console.error("Could not save shipped contacts", error);
      }

      return ensureLabelEmailSent(updated, deps);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /timed out|timeout|abort|504|502|503|network/i.test(message);
      const failedEnough = attempted.fulfillmentAttempts >= (retryable ? 6 : 4);
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: failedEnough ? "FAILED" : "PAID",
          lastError: message,
        },
      });
      await alert(
        failedEnough
          ? "Label purchase failed after several tries — customer paid"
          : "Label purchase failed — will retry",
        `Shipment ${shipmentId} (${existing.customerEmail}) paid ${existing.customerTotalCents} cents but label purchase failed: ${message}`,
      );
      throw error;
    }
  });

  if (result === "busy") {
    const current = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!current) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }
    return current;
  }
  return result;
}

export async function reconcileStuckPaidShipments(deps: FulfillmentDeps = {}) {
  const cutoff = new Date((deps.now?.() ?? new Date()).getTime() - 5 * 60 * 1000);
  const stuck = await prisma.shipment.findMany({
    where: {
      status: "PAID",
      updatedAt: { lte: cutoff },
    },
    take: 25,
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const shipment of stuck) {
    try {
      await purchaseLabelForShipment(shipment.id, deps);
      results.push({ id: shipment.id, ok: true });
    } catch (error) {
      results.push({
        id: shipment.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
