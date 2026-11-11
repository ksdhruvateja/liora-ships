import Link from "next/link";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { legalInfo } from "@/lib/legal";

export const metadata = {
  title: "Shipping Policy",
  description: "Coverage, delivery estimates, packaging, pickups, tracking, and claims.",
};

export const dynamic = "force-dynamic";

export default function ShippingPolicyPage() {
  const info = legalInfo();
  const contact = <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a>;

  return (
    <LegalDoc
      current="/shipping-policy"
      title="Shipping Policy"
      intro={<p>How shipping with {info.appName} works, from your quote to the doorstep.</p>}
      sections={[
        {
          id: "coverage",
          title: "Where we ship",
          body: (
            <p>
              We offer domestic shipping between US addresses, across all 50 states. International shipping isn’t
              available yet.
            </p>
          ),
        },
        {
          id: "carriers",
          title: "Carriers and services",
          body: (
            <p>
              Rates come live from major US carriers through our logistics partner. Each option shows a {info.appName}{" "}
              service name, price, and delivery estimate. The carrier printed on your label handles pickup, transport,
              and delivery.
            </p>
          ),
        },
        {
          id: "delivery-times",
          title: "Delivery estimates",
          body: (
            <p>
              Delivery windows are carrier estimates in business days and start when the carrier first scans your
              parcel, not when you buy the label. Weather, holidays, and address problems can cause delays. Estimates
              aren’t guaranteed.
            </p>
          ),
        },
        {
          id: "label",
          title: "Printing your label",
          body: (
            <ul>
              <li>Your label is a 4×6 PDF, available on your confirmation page and emailed to you.</li>
              <li>
                Print it at full size on plain paper or a 4×6 label sheet. Make sure the barcode is sharp and uncreased.
              </li>
              <li>Tape it flat to the largest side of the box, and cover or remove any old labels.</li>
            </ul>
          ),
        },
        {
          id: "packaging",
          title: "Packaging and measurements",
          body: (
            <>
              <p>
                Use a sturdy box with enough padding that the contents don’t move. Measure the outside of the box,
                round up to the nearest inch, and weigh the packed parcel.
              </p>
              <p>
                If the carrier measures a bigger or heavier parcel than you entered, it may charge an adjustment. See our{" "}
                <Link href="/refund-policy#carrier-adjustments">Refund Policy</Link>.
              </p>
            </>
          ),
        },
        {
          id: "handover",
          title: "Drop-off or pickup",
          body: (
            <p>
              Drop the parcel at any location of the carrier on your label, or book a pickup during checkout where
              available. For pickups, have the labeled parcel ready for the whole window you choose. If the carrier
              can’t schedule the pickup, we’ll let you know and you can drop it off instead.
            </p>
          ),
        },
        {
          id: "tracking",
          title: "Tracking",
          body: (
            <p>
              You’ll get a tracking number as soon as your label is created. Track any time on our{" "}
              <Link href="/#track">tracking page</Link>. Updates appear after the carrier’s first scan.
            </p>
          ),
        },
        {
          id: "address-problems",
          title: "Address problems and returns to sender",
          body: (
            <p>
              Double-check addresses before you pay. Carriers may charge to correct an address, and parcels they can’t
              deliver may be returned to the sender at extra cost. If you spot a mistake before shipping, cancel the
              label and create a new one. See our <Link href="/refund-policy">Cancellation &amp; Refund Policy</Link>.
            </p>
          ),
        },
        {
          id: "claims",
          title: "Lost or damaged parcels",
          body: (
            <>
              <p>If a parcel is lost, late, or arrives damaged:</p>
              <ol>
                <li>Keep the box, packaging, and contents, and take photos.</li>
                <li>Email {contact} with your tracking number, photos, and proof of value (such as a receipt).</li>
                <li>We’ll open a claim with the carrier and keep you updated.</li>
              </ol>
              <p>
                Coverage and payouts follow the carrier’s rules and your declared value. Carriers usually need a claim
                within a set time after the delivery date, so contact us promptly.
              </p>
            </>
          ),
        },
        {
          id: "prohibited",
          title: "Prohibited items",
          body: (
            <p>
              Don’t ship hazardous, illegal, or carrier-prohibited items. See our{" "}
              <Link href="/terms#prohibited">Terms of Service</Link> for the full list.
            </p>
          ),
        },
      ]}
    />
  );
}
