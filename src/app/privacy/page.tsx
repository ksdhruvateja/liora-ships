import Link from "next/link";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { legalInfo } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy",
  description: "What information Liora Labs Shipping collects, why, and who it's shared with.",
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const info = legalInfo();
  const contact = <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a>;

  return (
    <LegalDoc
      current="/privacy"
      title="Privacy Policy"
      intro={
        <p>
          We collect only what we need to ship your parcel, and we never sell your personal information. This policy
          explains what we collect and how we use it.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <h3>Information you give us</h3>
              <ul>
                <li>
                  <strong>Your email address</strong>, used to send your label and tracking details and to find your
                  saved addresses.
                </li>
                <li>
                  <strong>Sender and recipient details:</strong> names, company, street addresses, phone numbers, and
                  email addresses.
                </li>
                <li>
                  <strong>Parcel details:</strong> dimensions, weight, contents description, declared value, and any
                  reference number you add.
                </li>
                <li>
                  <strong>Cancellation details:</strong> the reason you choose if you cancel a label.
                </li>
              </ul>
              <h3>Payment information</h3>
              <p>
                Card details are entered directly into Stripe’s secure form and never reach our servers. We keep only a
                Stripe payment reference so we can confirm your payment and issue refunds.
              </p>
              <h3>Collected automatically</h3>
              <p>
                Our hosting provider keeps standard server logs (such as IP address, browser type, and pages requested)
                for security and troubleshooting. We don’t use advertising or analytics trackers.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>To get live rates, buy your label, schedule pickups, and show tracking.</li>
              <li>To take payment, prevent fraud, and process cancellations and refunds.</li>
              <li>To email your label, receipts, and cancellation confirmations.</li>
              <li>
                To remember the From and To addresses you’ve shipped with, so they pop up next time you enter the same
                email.
              </li>
              <li>To provide customer support, and to meet our legal, tax, and accounting obligations.</li>
            </ul>
          ),
        },
        {
          id: "sharing",
          title: "Who we share it with",
          body: (
            <>
              <p>We share information only with the service providers that make shipping work:</p>
              <ul>
                <li>
                  <strong>Easyship and the carrier on your label</strong> (for example UPS, FedEx, or USPS) receive the
                  addresses, contact, and parcel details needed to create and deliver the shipment.
                </li>
                <li>
                  <strong>Stripe</strong> processes your payment and refunds.
                </li>
                <li>
                  <strong>Google (Gmail)</strong> delivers our emails to you.
                </li>
                <li>
                  <strong>Our hosting and database providers</strong> store and serve the website and shipment records.
                </li>
              </ul>
              <p>
                We may also disclose information if required by law, to protect our rights or customers, or as part of a
                business transfer. <strong>We do not sell or rent your personal information</strong>, and we don’t share
                it for cross-context behavioral advertising.
              </p>
            </>
          ),
        },
        {
          id: "saved-addresses",
          title: "Saved addresses",
          body: (
            <p>
              After you ship, we save the sender and recipient addresses under your email. When you type that email on a
              quote, they appear in a pop-up so you can reuse them. Anyone who enters your email on a quote could see
              those saved addresses, so use an email you control. To delete them, email us from that address at{" "}
              {contact}.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <p>
              We don’t use advertising or tracking cookies. Staff sign-in uses one essential cookie. On checkout, Stripe
              may set cookies needed for fraud prevention. See{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
                Stripe’s privacy policy
              </a>
              .
            </p>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <p>
              We keep shipment and payment records as long as needed to provide the service, handle claims and refunds,
              and meet legal, tax, and accounting requirements. We keep saved addresses until you ask us to delete them.
            </p>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              We use encrypted connections (HTTPS), keep payment data with Stripe, and limit staff access. No system is
              perfectly secure, but we work to protect your information and will notify you of a breach where the law
              requires.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your choices and rights",
          body: (
            <>
              <p>
                You can ask us to access, correct, or delete your personal information, or to delete your saved
                addresses. Depending on where you live (for example California and other US states with privacy laws),
                you may have additional rights, such as knowing what we collect and not being discriminated against for
                using your rights.
              </p>
              <p>
                Email {contact} from the address you shipped with. We may need to verify your request, and we may keep
                some records where the law requires it, such as payment records.
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: <p>The service is not intended for children under 13, and we don’t knowingly collect their data.</p>,
        },
        {
          id: "changes",
          title: "Changes and contact",
          body: (
            <p>
              We’ll update this page and the date at the top when this policy changes. Questions? Email {contact}
              {info.mailingAddress ? ` or write to ${info.businessName}, ${info.mailingAddress}` : ""}. See also our{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
