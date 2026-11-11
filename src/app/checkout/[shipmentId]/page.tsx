import Image from "next/image";
import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { photos } from "@/lib/photos";

export default function CheckoutPage({ params }: { params: { shipmentId: string } }) {
  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden h-[640px] overflow-hidden rounded-[2.25rem] lg:sticky lg:top-24 lg:block">
        <Image src={photos.stackedBoxes} alt="Parcels ready to ship" fill priority sizes="45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="font-semibold text-lime-400">Secure checkout</p>
          <p className="mt-1 text-5xl font-bold tracking-[-0.04em]">Almost there.</p>
          <p className="mt-2 text-lg text-white/75">Pay once. Your label follows.</p>
        </div>
      </div>
      <div>
        <p className="font-semibold text-ocean-500 lg:hidden">Secure checkout</p>
        <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Pay for your label.</h1>
        <p className="mt-2 text-muted">The label is created only after payment succeeds.</p>
        <p className="mb-6 mt-5 rounded-2xl border border-ocean-100 bg-ocean-50 px-4 py-3 text-sm text-ink">
          <strong>Unused labels can be cancelled</strong> from your confirmation page for a refund.
        </p>
        <div className="surface p-5 sm:p-6">
          <CheckoutForm
            shipmentId={params.shipmentId}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
          />
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          By paying, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/refund-policy" className="underline underline-offset-2 hover:text-ink">
            Cancellation &amp; Refund Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
