import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { splitDisplayCourierName } from "@/lib/courier-names";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PhotoBanner } from "@/components/PhotoBanner";
import { photos } from "@/lib/photos";

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
      cancelledAt: null,
    },
  });
  if (!shipment) notFound();

  const { label, carrier } = splitDisplayCourierName(shipment.brandedCourierName);
  const service =
    label && !carrier.toLowerCase().includes(label.toLowerCase()) ? `${label} ${carrier}` : carrier || label;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PhotoBanner img={photos.freightTrain} eyebrow={`${config.appName} tracking`} title={shipment.trackingNumber ?? ""} />
      <div className="surface grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Service</p>
            <p className="text-xl font-bold text-ink">{service}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-lime-500" />
            </span>
            <p className="font-semibold text-ink">Label created</p>
          </div>
          <p className="text-sm text-muted">Carrier scans appear here as they happen.</p>
        </div>
        <Link href={`/shipments/${shipment.id}`} className="btn-primary">
          View label
          <span className="btn-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
