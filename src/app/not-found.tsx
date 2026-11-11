import Image from "next/image";
import { photos } from "@/lib/photos";

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center overflow-hidden rounded-[2.5rem] p-10 text-center">
      <Image src={photos.desertRoad} alt="Empty desert road" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative text-white">
        <p className="text-8xl font-bold tracking-[-0.05em] sm:text-9xl">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Wrong turn.</h1>
        <p className="mt-2 text-lg text-white/75">That shipment or page doesn’t exist.</p>
        <a href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-lime-400 px-7 font-semibold text-ink">
          Back home
        </a>
      </div>
    </div>
  );
}
