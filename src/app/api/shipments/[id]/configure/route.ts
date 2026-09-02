import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEasyship } from "@/lib/easyship-client";
import { pickupSlotKey } from "@/lib/easyship-pickups";
import type { AddressInput } from "@/lib/validations";
import { configureShipmentSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const json = await request.json();
    const parsed = configureShipmentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid shipment configuration." }, { status: 400 });
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }
    if (shipment.status !== "QUOTED") {
      return NextResponse.json({ error: "This quote can no longer be changed." }, { status: 409 });
    }

    const { referenceNumber, pickupRequired, pickupSlot } = parsed.data;
    let pickupData: Record<string, unknown> = {
      pickupRequired: false,
      pickupSlotId: null,
      pickupDate: null,
      pickupFromTime: null,
      pickupToTime: null,
      pickupTimezone: null,
      pickupPriceCents: null,
      pickupBaseCostCents: null,
      pickupCustomerCents: 0,
      pickupCurrency: null,
      pickupStatus: "NONE",
      finalCustomerTotalCents: shipment.customerTotalCents,
    };

    if (pickupRequired) {
      if (!pickupSlot) {
        return NextResponse.json({ error: "Select a pickup slot." }, { status: 400 });
      }
      if (pickupSlot.courierServiceId !== shipment.easyshipRateId) {
        return NextResponse.json({ error: "Pickup slot does not match the selected courier." }, { status: 409 });
      }
      if (pickupSlot.priceCents == null) {
        return NextResponse.json(
          {
            error:
              "Pickup pricing is unavailable for this slot. Select another slot or contact an administrator.",
          },
          { status: 409 },
        );
      }

      const easyship = getEasyship();
      let originAddressId = shipment.easyshipOriginAddressId;
      if (!originAddressId) {
        originAddressId = await easyship.resolveOriginAddress(shipment.originAddress as AddressInput);
      }
      const availability = await easyship.listPickupSlots({
        courierServiceId: pickupSlot.courierServiceId,
        originAddressId,
      });
      if (!availability.supported) {
        return NextResponse.json({ error: availability.message }, { status: 409 });
      }
      const match = availability.slots.find(
        (slot) =>
          pickupSlotKey(slot) ===
          pickupSlotKey({
            courierServiceId: pickupSlot.courierServiceId,
            pickupDate: pickupSlot.pickupDate,
            timeSlotId: pickupSlot.timeSlotId ?? null,
            fromTime: pickupSlot.fromTime,
            toTime: pickupSlot.toTime,
          }),
      );
      if (!match) {
        return NextResponse.json(
          { error: "The selected pickup slot is no longer available. Please choose another slot." },
          { status: 409 },
        );
      }
      if (match.priceCents == null) {
        return NextResponse.json(
          {
            error:
              "Pickup pricing is unavailable for this slot. Select another slot or contact an administrator.",
          },
          { status: 409 },
        );
      }

      pickupData = {
        pickupRequired: true,
        easyshipOriginAddressId: originAddressId,
        pickupSlotId: match.timeSlotId,
        pickupDate: match.pickupDate,
        pickupFromTime: match.fromTime,
        pickupToTime: match.toTime,
        pickupTimezone: match.timezone,
        pickupPriceCents: match.priceCents,
        pickupBaseCostCents: match.priceCents,
        pickupCustomerCents: match.priceCents,
        pickupCurrency: match.currency ?? pickupSlot.currency,
        pickupStatus: "SELECTED",
        finalCustomerTotalCents: shipment.customerTotalCents + match.priceCents,
      };
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        referenceNumber: referenceNumber || null,
        ...pickupData,
      },
    });

    return NextResponse.json({
      shipment: {
        id: updated.id,
        referenceNumber: updated.referenceNumber,
        pickupRequired: updated.pickupRequired,
        pickupCustomerCents: updated.pickupCustomerCents,
        customerTotalCents: updated.customerTotalCents,
        finalCustomerTotalCents:
          updated.finalCustomerTotalCents ?? updated.customerTotalCents,
        pickupStatus: updated.pickupStatus,
      },
    });
  } catch (error) {
    console.error("Configure shipment failed", error);
    return NextResponse.json({ error: "Shipment could not be configured." }, { status: 502 });
  }
}
