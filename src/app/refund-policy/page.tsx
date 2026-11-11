import Link from "next/link";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { legalInfo } from "@/lib/legal";

export const metadata = {
  title: "Cancellation & Refund Policy",
  description: "How to cancel an unused shipping label, how refunds work, and what can't be refunded.",
};

export const dynamic = "force-dynamic";

export default function RefundPolicyPage() {
  const info = legalInfo();
  const fee = info.cancellationFee > 0 ? info.cancellationFeeText : null;

  return (
    <LegalDoc
      current="/refund-policy"
      title="Cancellation & Refunds"
      intro={<p>Bought a label you don’t need? If it hasn’t been used, you can cancel it and get your money back.</p>}
      sections={[
        {
          id: "summary",
          title: "The short version",
          body: (
            <div className="legal-callout">
              <ul className="!mt-0">
                <li>
                  <strong>Unused labels can be cancelled</strong>
                  {info.onlineCancelEnabled ? ` online within ${info.cancelWindowDays} days of purchase.` : " by contacting support."}
                </li>
                <li>
                  <strong>You get back what you paid</strong>
                  {fee ? `, minus a ${fee} cancellation fee,` : ""} to your original payment method.
                </li>
                <li>
                  <strong>Once the carrier has scanned or accepted the parcel,</strong> the label can no longer be
                  cancelled.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "how-to-cancel",
          title: "How to cancel a label",
          body: (
            <>
              <ol>
                <li>Open your shipment confirmation page (the link is in your label email).</li>
                <li>
                  Select <strong>Cancel label</strong>, confirm the email address you used at checkout, and choose a
                  reason.
                </li>
                <li>
                  We ask the carrier to void the label. If they accept, your refund is issued right away and we email
                  you a confirmation.
                </li>
              </ol>
              <p>
                After cancelling, <strong>do not use the old label.</strong> It is void, and a parcel shipped with it may
                be returned, delayed, or billed back to you by the carrier.
              </p>
              <p>
                Can’t find your confirmation page? Email{" "}
                <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a> with your tracking number and we’ll
                cancel it for you.
              </p>
            </>
          ),
        },
        {
          id: "eligibility",
          title: "What can and can’t be cancelled",
          body: (
            <>
              <h3>Can be cancelled</h3>
              <ul>
                <li>
                  Labels that haven’t been scanned by the carrier
                  {info.onlineCancelEnabled ? `, within ${info.cancelWindowDays} days of purchase` : ""}.
                </li>
                <li>Duplicate labels or labels created with the wrong address, service, or parcel details.</li>
              </ul>
              <h3>Can’t be cancelled</h3>
              <ul>
                <li>Labels the carrier has scanned, picked up, or marked in transit, out for delivery, or delivered.</li>
                <li>Labels the carrier has already voided or refused to void.</li>
                <li>
                  Labels older than {info.onlineCancelEnabled ? `${info.cancelWindowDays} days` : "the carrier’s void window"}{" "}
                  — contact support and we’ll ask the carrier, but we can’t guarantee approval.
                </li>
              </ul>
              <p>
                The carrier makes the final decision on whether a label can be voided. If they decline, we can’t refund
                the label.
              </p>
            </>
          ),
        },
        {
          id: "refund-amount",
          title: "How much is refunded",
          body: (
            <>
              <p>
                We refund the total you paid for the shipment, including any pickup fee
                {fee ? `, minus a ${fee} cancellation fee that covers payment-processing costs` : ""}. You’ll see the
                exact amount before you confirm.
              </p>
              <p>Refunds go to the original payment method only. We can’t refund to a different card or as cash.</p>
            </>
          ),
        },
        {
          id: "timing",
          title: "When you’ll get your money",
          body: (
            <p>
              We issue the refund as soon as the carrier accepts the cancellation. Your bank then usually takes{" "}
              <strong>5–10 business days</strong> to show it on your statement. If it hasn’t appeared after 10 business
              days, email us and we’ll send you the refund reference to give your bank.
            </p>
          ),
        },
        {
          id: "failed-labels",
          title: "If we couldn’t create your label",
          body: (
            <p>
              If you paid but a label couldn’t be generated, you won’t be charged twice. Retry from your confirmation
              page. If it still fails, we’ll either create the label or refund you in full.
            </p>
          ),
        },
        {
          id: "returns",
          title: "Returns",
          body: (
            <>
              <p>
                {info.appName} sells shipping labels, not goods, so there’s nothing to return to us. A label is a
                digital service. Once it’s used to ship, the service is complete.
              </p>
              <ul>
                <li>
                  <strong>Need to send something back to yourself?</strong> Create a new label with the recipient as the
                  sender. See <Link href="/quote">Get a quote</Link>.
                </li>
                <li>
                  <strong>Returning a purchase to a store?</strong> Follow the seller’s return policy. We only provide the
                  shipping label.
                </li>
                <li>
                  <strong>Returned to sender by the carrier</strong> (refused, undeliverable, or wrong address)? The
                  carrier may charge return postage, and the original label isn’t refundable.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "carrier-adjustments",
          title: "Carrier adjustments",
          body: (
            <p>
              Carriers check parcel weight and size. If the actual parcel is larger or heavier than what you entered,
              the carrier may charge an adjustment. Adjustments aren’t refundable, and we may contact you to collect
              them. Enter accurate measurements to avoid this.
            </p>
          ),
        },
        {
          id: "lost-damaged",
          title: "Lost or damaged parcels",
          body: (
            <p>
              A lost or damaged parcel is a carrier claim, not a label refund. Email us with your tracking number and
              photos, and we’ll help you file the claim. Payouts depend on the carrier’s rules and your declared value.
              See our <Link href="/shipping-policy">Shipping Policy</Link>.
            </p>
          ),
        },
        {
          id: "disputes",
          title: "Questions and disputes",
          body: (
            <p>
              Please contact us at <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a> before opening a
              chargeback. We can usually sort out a problem faster than your bank can. This policy is part of our{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
