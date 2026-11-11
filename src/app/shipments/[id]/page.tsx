import { ShipmentStatus } from "@/components/ShipmentStatus";
import { PhotoBanner } from "@/components/PhotoBanner";
import { photos } from "@/lib/photos";

export default function ShipmentPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      <PhotoBanner img={photos.vanLoading} eyebrow="Liora Shipping" title="Your shipment." height="h-[260px] sm:h-[340px]" />
      <ShipmentStatus shipmentId={params.id} />
    </div>
  );
}
