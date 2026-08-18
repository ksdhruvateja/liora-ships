import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TrackPage({
  params,
}: {
  params: { trackingNumber: string };
}) {
  const config = getConfig();
  const shipment = await prisma.shipment.findFirst({
    where: {
      trackingNumber: params.trackingNumber,
      status: "LABEL_CREATED",
    },
  });
  if (!shipment) notFound();

  return (
    <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
      <p className="eyebrow">{config.appName} tracking</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{shipment.trackingNumber}</h1>
      <p className="mt-3 text-muted">
        Service: <strong className="text-ink">{shipment.brandedCourierName}</strong>
      </p>
      <p className="mt-2 text-muted">
        Status: label created. Scan updates from the carrier will appear on this {config.appName} page as they
        become available.
      </p>
      <Link href={`/shipments/${shipment.id}`} className="btn-primary mt-6">
        View label & confirmation
        <span className="btn-arrow">→</span>
      </Link>
    </div>
  );
}
