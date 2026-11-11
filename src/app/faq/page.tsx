import Link from "next/link";
import { FaqBrowser, type FaqGroup } from "@/components/legal/FaqBrowser";
import { legalInfo } from "@/lib/legal";

export const metadata = {
  title: "FAQ",
  description: "Answers about quotes, payment, labels, pickups, tracking, cancellations and refunds.",
};

export const dynamic = "force-dynamic";

function item(q: string, text: string, a?: React.ReactNode) {
  return { q, text, a: a ?? <p>{text}</p> };
}

export default function FaqPage() {
  const info = legalInfo();
  const windowText = info.onlineCancelEnabled ? `within ${info.cancelWindowDays} days of purchase` : "by contacting support";
  const feeText = info.cancellationFee > 0 ? ` minus a ${info.cancellationFeeText} cancellation fee` : "";

  const groups: FaqGroup[] = [
    {
      id: "quotes",
      title: "Quotes & pricing",
      items: [
        item(
          "How do I get a quote?",
          "Go to Get a quote, enter your email, the From and To addresses, and the parcel size and weight. You'll see live rates in seconds.",
          <p>
            Go to <Link href="/quote">Get a quote</Link>, enter your email, the From and To addresses, and the parcel
            size and weight. Live rates appear in seconds.
          </p>,
        ),
        item("Where can I ship?", "Anywhere in the United States, between any two US addresses. International shipping isn't available yet."),
        item("Are there hidden fees?", "No. The price you see includes our service fee. A pickup fee is added only if you book a pickup. Carriers may charge adjustments if the parcel is larger or heavier than entered."),
        item("Do I need a carrier account?", "No. We buy the label for you, so there are no carrier accounts or extra checkouts."),
      ],
    },
    {
      id: "saved",
      title: "Saved addresses",
      items: [
        item("How do saved addresses work?", "After you ship once, type the same email on a quote and your previous From and To addresses pop up. Pick one to fill the form instantly."),
        item(
          "How do I delete saved addresses?",
          `Email ${info.supportEmail} from the address you shipped with and we'll delete them.`,
          <p>
            Email <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a> from the address you shipped with and
            we’ll delete them.
          </p>,
        ),
      ],
    },
    {
      id: "payment",
      title: "Payment & labels",
      items: [
        item("How do I pay?", "By card through Stripe. Your card details go straight to Stripe and never touch our servers."),
        item("When is my label created?", "Right after your payment succeeds, never before. It usually takes a few seconds."),
        item("Where do I get my label?", "On your confirmation page, plus a copy by email. It's a 4×6 PDF you can print on plain paper or a label sheet."),
        item("What if my label fails after I've paid?", "You won't be charged twice. Retry from your confirmation page. If it still fails, we'll create the label or refund you in full."),
      ],
    },
    {
      id: "cancel",
      title: "Cancellations & refunds",
      items: [
        item(
          "Can I cancel a label?",
          `Yes, as long as it hasn't been used. Cancel ${windowText} from your confirmation page.`,
          <p>
            Yes, as long as it hasn’t been used. Cancel {windowText} from your confirmation page: select{" "}
            <strong>Cancel label</strong> and confirm your email. See the{" "}
            <Link href="/refund-policy">Cancellation &amp; Refund Policy</Link>.
          </p>,
        ),
        item("How much do I get back?", `What you paid for the shipment, including any pickup fee${feeText}, back to your original payment method.`),
        item("How long does a refund take?", "We issue it as soon as the carrier accepts the cancellation. Banks usually take 5–10 business days to show it."),
        item("Why can't I cancel my label?", "Once the carrier has scanned or accepted the parcel, the label can't be voided. Labels past the cancellation window need to go through support."),
        item("Do you accept returns?", "We sell shipping labels, not goods, so there's nothing to return to us. To send something back, create a new label with the addresses swapped."),
      ],
    },
    {
      id: "shipping",
      title: "Pickups, tracking & claims",
      items: [
        item("Can a carrier pick up my parcel?", "Where available, you can book a pickup window during checkout. Otherwise, drop the parcel at any location of the carrier on your label."),
        item("How do I track my parcel?", "Use the tracking number from your confirmation page or email on our tracking page. Updates start after the carrier's first scan."),
        item(
          "My parcel is lost or damaged. What now?",
          `Keep the packaging, take photos, and email ${info.supportEmail} with your tracking number. We'll help you file a claim with the carrier.`,
          <p>
            Keep the packaging, take photos, and email <a href={`mailto:${info.supportEmail}`}>{info.supportEmail}</a>{" "}
            with your tracking number. We’ll help you file a claim with the carrier. See the{" "}
            <Link href="/shipping-policy#claims">Shipping Policy</Link>.
          </p>,
        ),
        item("What can't I ship?", "Hazardous, illegal, or carrier-prohibited items, such as explosives, flammables, illegal drugs, and cash. See our Terms for the full list."),
      ],
    },
  ];

  return (
    <div>
      <header className="pb-12 pt-4 text-center">
        <p className="text-lg font-semibold text-ocean-500">Help</p>
        <h1 className="mt-2 text-5xl font-bold tracking-[-0.04em] sm:text-7xl">Questions? Answered.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Everything about quotes, labels, pickups, and refunds.
        </p>
      </header>
      <FaqBrowser groups={groups} supportEmail={info.supportEmail} />
      <div className="mx-auto mt-20 max-w-3xl rounded-[2rem] bg-ink p-8 text-center text-white sm:p-12">
        <h2 className="text-3xl font-bold tracking-tight">Still need help?</h2>
        <p className="mt-2 text-white/70">Our team is a message away.</p>
        <a
          href={`mailto:${info.supportEmail}`}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-lime-400 px-7 font-semibold text-ink"
        >
          Email support
        </a>
      </div>
    </div>
  );
}
