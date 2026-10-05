import Link from "next/link";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { FaqList } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { HeroDevice } from "@/components/marketing/hero-device";
import { StoreButtons } from "@/components/marketing/store-buttons";
import { TimeCard } from "@/components/marketing/time-card";
import { FAQS, FREE_LIMITS, PRICES } from "@/lib/marketing/content";

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-[1200px] scroll-mt-8 px-4 pt-24 md:px-8 md:pt-32">
      <h2 id={`${id}-title`} className="condensed max-w-[18ch] text-section font-extrabold">
        {title}
      </h2>
      {intro ? <p className="mt-4 max-w-[60ch] text-ink-muted">{intro}</p> : null}
      <div className="mt-10 md:mt-12">{children}</div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-12 pb-4 md:px-8 md:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <h1 className="condensed text-hero font-extrabold">
            <span className="block lg:whitespace-nowrap">Tap once.</span>
            <span className="block lg:whitespace-nowrap">Bill every hour.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1.1875rem] leading-relaxed text-ink-muted">
            Punchcard is a job clock for plumbers, electricians, cleaners, landscapers and handypeople. Start the clock
            when you get to a job, watch it on your Lock Screen, and send your client a timesheet at the end of the week.
          </p>
          <div className="mt-8">
            <StoreButtons />
          </div>
          <p className="mt-4 text-caption text-ink-muted">
            Free for up to {FREE_LIMITS.clients} clients. Pro is {PRICES.proMonthly} a month. No account needed.
          </p>
        </div>
        <HeroDevice />
      </section>

      <Section
        id="how-it-works"
        title="Three taps a day, not an hour on Sunday night"
        intro="Most people who bill by the hour rebuild their week from memory and lose about one billable hour in five. Punchcard records it as it happens."
      >
        <TimeCard />
      </Section>

      <Section
        id="features"
        title="Built into the phone, not buried in an app"
        intro="The clock shows up where you already look: the Lock Screen, the Dynamic Island, your notifications and your Home Screen."
      >
        <Features />
      </Section>

      <Section
        id="compare"
        title="Priced for one van, not a payroll department"
        intro="Time-tracking suites charge a base fee plus a fee per person. Here is what one tradesperson pays each month."
      >
        <ComparisonTable />
        <p className="mt-6">
          <Link href="/pricing" className="rounded-sm font-semibold text-accent-ink underline underline-offset-4">
            See what is in Free and Pro
          </Link>
        </p>
      </Section>

      <Section id="faq" title="Questions from the job site">
        <FaqList items={FAQS} />
      </Section>
    </>
  );
}
