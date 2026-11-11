import Image from "next/image";
import { StaffLoginForm } from "@/components/staff/StaffLoginForm";
import { photos } from "@/lib/photos";

export const metadata = {
  title: "Staff sign in",
};

export default function StaffLoginPage() {
  return (
    <div className="wrap grid items-center gap-10 py-10 lg:grid-cols-2">
      <div className="relative hidden h-[600px] overflow-hidden rounded-[2.25rem] lg:block">
        <Image src={photos.warehouseAisle} alt="Warehouse aisle" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <p className="absolute bottom-10 left-10 text-5xl font-bold tracking-[-0.04em] text-white">
          Staff only.
        </p>
      </div>
      <StaffLoginForm />
    </div>
  );
}
