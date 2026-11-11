import Link from "next/link";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { legalInfo } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you buy shipping labels from Liora Labs Shipping.",
};

export const dynamic = "force-dynamic";

export default function TermsPage() {
  const info = legalInfo();
  const law = info.governingState
    ? `the laws of the State of ${info.governingState} and applicable US federal law`
    : "applicable US federal law and the laws of the state where we are organized";

  return (
    <LegalDoc
      current="/terms"
      title="Terms of Service"
      intro={
        <p>
          These terms apply when you use {info.appName} to get quotes, buy shipping labels, schedule pickups, or track
          parcels. By paying for a label, you agree to them.
        </p>
      }
      sections={[
        {
          id: "who-we-are",
          title: "Who we are",
          body: (
            <p>
              {info.appName} is operated by {info.businessName} (“we”, “us”). We help you compare rates and buy
              domestic US shipping labels from third-party carriers through our logistics partner. <strong>We are not a
              carrier.</strong> The carrier named on your label transports your parcel under its own terms of carriage,
              which also apply to your shipment.
            </p>
          ),
        },
        {
          id: "eligibility",
          title: "Using the service",
          body: (
            <ul>
              <li>You must be at least 18 and able to enter a binding contract.</li>
              <li>The service covers shipments between addresses in the United States.</li>
              <li>
                You’re responsible for the information you enter (names, addresses, phone numbers, parcel weight,
                dimensions, contents, and declared value) being accurate and complete.
              </li>
              <li>You agree not to misuse the service, interfere with it, or use it for anything unlawful.</li>
            </ul>
          ),
        },
        {
          id: "quotes-pricing",
          title: "Quotes and pricing",
          body: (
            <>
              <p>
                Prices are shown in US dollars and include our service fee. The price at checkout is what you pay for the
                label, plus any pickup fee you choose. Quotes are based on the details you enter and may expire. If you
                change the shipment, you’ll need a new quote.
              </p>
              <p>
                Delivery times are carrier estimates, not guarantees. We are not responsible for carrier delays.
              </p>
            </>
          ),
        },
        {
          id: "payment",
          title: "Payment",
          body: (
            <p>
              Payments are processed securely by Stripe. We never see or store your full card number. Your label is
              purchased from the carrier only after your payment succeeds. If label creation fails after payment, we’ll
              either complete the label or refund you. You won’t be charged twice.
            </p>
          ),
        },
        {
          id: "labels",
          title: "Your label",
          body: (
            <ul>
              <li>Each label is for one parcel and one use. Don’t copy, alter, or reuse it.</li>
              <li>Print it clearly and attach it securely to the outside of the parcel.</li>
              <li>
                Use the label within the carrier’s validity period. Unused labels can be cancelled as described in our{" "}
                <Link href="/refund-policy">Cancellation &amp; Refund Policy</Link>.
              </li>
              <li>
                If the carrier finds the parcel is heavier or larger than declared, it may charge an adjustment, which we
                may pass on to you.
              </li>
            </ul>
          ),
        },
        {
          id: "prohibited",
          title: "Prohibited and restricted items",
          body: (
            <>
              <p>
                You may not ship anything the carrier prohibits or that’s illegal to ship, including (but not limited
                to) explosives, flammable or hazardous materials, illegal drugs, weapons or ammunition where restricted,
                cash or negotiable instruments, and live animals. Items like lithium batteries, alcohol, and perishables
                are restricted and must follow carrier rules.
              </p>
              <p>
                You’re responsible for packaging, labeling, and declaring contents correctly. Carriers may refuse,
                return, or dispose of non-compliant parcels at your cost.
              </p>
            </>
          ),
        },
        {
          id: "pickups",
          title: "Pickups",
          body: (
            <p>
              If you book a pickup, have the labeled parcel ready during the window you selected. Pickup availability and
              timing are set by the carrier. Pickup fees are included in your total and are refunded only if the label is
              cancelled before pickup.
            </p>
          ),
        },
        {
          id: "cancellations",
          title: "Cancellations and refunds",
          body: (
            <p>
              Unused labels can be cancelled
              {info.onlineCancelEnabled ? ` online within ${info.cancelWindowDays} days of purchase` : " by contacting support"}
              . Full details, including what can’t be refunded, are in our{" "}
              <Link href="/refund-policy">Cancellation &amp; Refund Policy</Link>, which is part of these terms.
            </p>
          ),
        },
        {
          id: "loss-damage",
          title: "Loss, damage, and claims",
          body: (
            <p>
              Carriers are responsible for parcels in their care, subject to their liability limits and claim rules.
              Coverage depends on the carrier and the declared value. We’ll help you file a claim, but we don’t insure
              shipments ourselves and can’t guarantee the result. See our{" "}
              <Link href="/shipping-policy">Shipping Policy</Link>.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Disclaimers and limitation of liability",
          body: (
            <>
              <p>
                The service is provided “as is” and “as available”. To the fullest extent the law allows, we disclaim
                implied warranties, including merchantability and fitness for a particular purpose, and we don’t
                guarantee the service will be uninterrupted or error-free.
              </p>
              <p>
                To the fullest extent the law allows, we aren’t liable for indirect, incidental, special, or
                consequential losses, or for acts or failures of carriers. Our total liability for any claim relating to a
                shipment is limited to the amount you paid us for that shipment. Nothing in these terms limits liability
                that can’t be limited by law.
              </p>
            </>
          ),
        },
        {
          id: "indemnity",
          title: "Your responsibility to us",
          body: (
            <p>
              You agree to cover our reasonable losses and costs arising from your breach of these terms, inaccurate
              shipment information, or shipping prohibited items, including carrier fines and adjustments.
            </p>
          ),
        },
        {
          id: "privacy",
          title: "Privacy",
          body: (
            <p>
              Our <Link href="/privacy">Privacy Policy</Link> explains what information we collect and how we use it.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              We may update these terms from time to time. The version on this page at the time you buy a label applies to
              that purchase. We’ll update the date at the top when we make changes.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          body: (
            <p>
              These terms are governed by {law}, without regard to conflict-of-law rules. If a provision is found
              unenforceable, the rest remains in effect.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about these terms? Email <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a>
              {info.mailingAddress ? `, or write to ${info.businessName}, ${info.mailingAddress}` : ""}.
            </p>
          ),
        },
      ]}
    />
  );
}
