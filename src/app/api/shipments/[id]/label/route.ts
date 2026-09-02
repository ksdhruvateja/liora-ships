import { NextResponse } from "next/server";
import type { Shipment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { downloadLabelPdf } from "@/lib/label-file";
import { buildMockLabelPdf } from "@/lib/mock-label-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const config = getConfig();
  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment || shipment.status !== "LABEL_CREATED") {
    return NextResponse.json({ error: "Label is not available yet." }, { status: 404 });
  }

  if (!shipment.labelUrl) {
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

  const file = await downloadLabelPdf(shipment.labelUrl, config.EASYSHIP_API_KEY);
  if (!file) {
    return NextResponse.json(
      { error: "The label file could not be retrieved." },
      { status: 502 },
    );
  }

  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
