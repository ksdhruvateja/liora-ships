import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEasyship } from "@/lib/easyship-client";
import { getBusinessDayRange } from "@/lib/business-time";
import { requireStaff } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = requireStaff(request, "admin");
  if ("error" in auth) return auth.error;

  const { start, end, businessDate } = getBusinessDayRange();
  const easyship = getEasyship();
  let page = 1;
  let imported = 0;
  let pages = 0;

  while (pages < 50) {
    const batch = await easyship.listShipmentsByLabelGeneratedAt({
      labelGeneratedAtFrom: start.toISOString(),
      labelGeneratedAtTo: end.toISOString(),
      page,
      perPage: 100,
    });
    pages += 1;
    if (batch.shipments.length === 0) break;

    for (const row of batch.shipments) {
      const easyshipShipmentId = String(row.easyship_shipment_id ?? row.id ?? "");
      if (!easyshipShipmentId) continue;
      const existing = await prisma.shipment.findFirst({
        where: { easyshipShipmentId },
      });
      if (!existing) continue;
      const labelGeneratedAt = row.label_generated_at
        ? new Date(String(row.label_generated_at))
        : existing.labelGeneratedAt;
      await prisma.shipment.update({
        where: { id: existing.id },
        data: {
          labelGeneratedAt: labelGeneratedAt ?? existing.labelGeneratedAt,
          businessDate,
          trackingNumber:
            (typeof row.tracking_number === "string" && row.tracking_number) ||
            existing.trackingNumber,
        },
      });
      imported += 1;
    }

    const totalPages = Number(batch.meta.total_pages ?? batch.meta.totalPages ?? 1);
    if (page >= totalPages) break;
    page += 1;
  }

  return NextResponse.json({ businessDate, imported, pages });
}
