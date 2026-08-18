import Image from "next/image";
import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center ${light ? "rounded-xl bg-white px-1.5 py-1" : ""}`}
    >
      <Image
        src="/logo.png"
        alt="Liora Labs Shipping"
        width={512}
        height={512}
        className="h-12 w-auto object-contain object-left sm:h-14"
        priority
      />
    </Link>
  );
}
