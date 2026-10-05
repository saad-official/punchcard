import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { FaqList } from "@/components/marketing/faq";
import { StoreButtons } from "@/components/marketing/store-buttons";
import { FREE_LIMITS, PLAN_FEATURES, PRICES, type Faq } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Punchcard is free for up to ${FREE_LIMITS.clients} clients. Pro is ${PRICES.proMonthly} a month or ${PRICES.proYearly} a year.`,
};

const BILLING_FAQ: Faq[] = [
  {
    question: "Is anything charged during the beta?",
    answer:
      "No. While Punchcard is in TestFlight and Google Play testing, subscriptions run in test mode and no money changes hands. Prices on this page are what Pro will cost at launch.",
  },
  {
    question: "What happens to my data if I stop paying for Pro?",
    answer: `Nothing is deleted. Your account goes back to the Free limits (${FREE_LIMITS.clients} clients, ${FREE_LIMITS.historyDays} days of history on screen), and upgrading again brings everything back.`,
  },
  {
    question: "How do I cancel?",
    answer:
      "Subscriptions are handled by the App Store or Google Play, so you cancel in your phone's subscription settings. Manage subscription in Punchcard settings takes you straight there.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <>
        <Check aria-hidden className="size-5 text-success" strokeWidth={2.5} />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus aria-hidden className="size-5 text-ink-faint" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span>{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-14 md:px-8 md:pt-20">
      <h1 className="condensed max-w-[16ch] text-section font-extrabold">Free until you outgrow it</h1>
      <p className="mt-4 max-w-[60ch] text-ink-muted">
        Free covers a tradesperson with a few regular clients. Pro removes the limits and adds the things a busy week
        needs: arrive and leave reminders, branded timesheets and sync across phones.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface-elevated p-6 md:p-8">
          <h2 className="semi-condensed text-title font-bold">Free</h2>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="condensed text-[3.5rem] leading-none font-extrabold tabular">$0</span>
            <span className="text-ink-muted">forever</span>
          </p>
          <p className="mt-4 text-ink-muted">
            {FREE_LIMITS.clients} clients, the last {FREE_LIMITS.historyDays} days of history, the Lock Screen timer,
            widgets and basic PDF timesheets.
          </p>
        </div>
        <div className="rounded-lg border-2 border-accent bg-surface-elevated p-6 md:p-8">
          <h2 className="semi-condensed text-title font-bold">Pro</h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="condensed text-[3.5rem] leading-none font-extrabold tabular">{PRICES.proMonthly}</span>
            <span className="text-ink-muted">a month, or {PRICES.proYearly} a year</span>
          </p>
          <p className="mt-4 text-ink-muted">
            Unlimited clients and history, client-branded PDFs, geofence reminders and sync across your phones. Yearly
            works out at {PRICES.proYearlyPerMonth} a month.
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-md border border-line bg-surface-elevated">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">Features in Punchcard Free and Pro</caption>
          <thead>
            <tr className="border-b border-line-strong">
              <th scope="col" className="p-4 text-callout font-semibold text-ink-muted">
                Feature
              </th>
              <th scope="col" className="w-[24%] p-4 text-callout font-bold">
                Free
              </th>
              <th scope="col" className="w-[24%] bg-accent-soft p-4 text-callout font-bold">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature) => (
              <tr key={feature.label} className="border-t border-line">
                <th scope="row" className="p-4 text-callout font-medium">
                  {feature.label}
                </th>
                <td className="p-4 text-callout">
                  <Cell value={feature.free} />
                </td>
                <td className="bg-accent-soft p-4 text-callout">
                  <Cell value={feature.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <StoreButtons />
      </div>

      <section aria-labelledby="billing-title" className="mt-24">
        <h2 id="billing-title" className="condensed text-section font-extrabold">
          Billing questions
        </h2>
        <div className="mt-8">
          <FaqList items={BILLING_FAQ} />
        </div>
      </section>
    </div>
  );
}
