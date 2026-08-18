import { ShipmentStatus } from "@/components/ShipmentStatus";

export default function ShipmentPage({ params }: { params: { id: string } }) {
  return <ShipmentStatus shipmentId={params.id} />;
}
