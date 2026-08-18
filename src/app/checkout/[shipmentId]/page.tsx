import { CheckoutForm } from "@/components/CheckoutForm";

export default function CheckoutPage({ params }: { params: { shipmentId: string } }) {
  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Secure checkout</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pay for your label</h1>
      <p className="mt-2 mb-4 text-muted">
        Your label is created only after this payment succeeds.
      </p>
      <p className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">
        <strong>No returns.</strong> Labels once fetched cannot be returned, cancelled, or refunded.
      </p>
      <div className="surface p-5 sm:p-6">
        <CheckoutForm shipmentId={params.shipmentId} />
      </div>
    </div>
  );
}
