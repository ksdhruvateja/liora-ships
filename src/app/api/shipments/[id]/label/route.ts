import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { buildMockLabelPdf } from "@/lib/mock-label-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const config = getConfig();
  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment || shipment.status !== "LABEL_CREATED" || !shipment.labelUrl) {
    return NextResponse.json({ error: "Label is not available yet." }, { status: 404 });
  }

  const tracking = shipment.trackingNumber ?? shipment.id;
  const filename = `${config.appName.toLowerCase().replace(/\s+/g, "-")}-label-${tracking}.pdf`;

  if (shipment.labelUrl.startsWith("mock://")) {
    if (!config.mockMode) {
      return NextResponse.json({ error: "Label is not available." }, { status: 404 });
    }
    const bytes = new Uint8Array(
      buildMockLabelPdf({
        appName: config.appName,
        trackingNumber: tracking,
        courierName: shipment.brandedCourierName,
        shipmentId: shipment.id,
      }),
    );
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  const response = await fetch(shipment.labelUrl, {
    headers: {
      Authorization: `Bearer ${config.EASYSHIP_API_KEY}`,
    },
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: "The label file could not be retrieved." },
      { status: 502 },
    );
  }

  const bytes = await response.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
