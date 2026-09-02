import { QuoteForm } from "@/components/QuoteForm";

export const metadata = {
  title: "Create Shipment",
};

export default function StaffCreatePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Create Shipment</h1>
        <p className="mt-2 text-muted">Generate a quote and start customer checkout.</p>
      </div>
      <QuoteForm />
    </div>
  );
}
