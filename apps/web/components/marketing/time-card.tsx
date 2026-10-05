/**
 * "How it works" printed as a paper time card: three numbered rows (the
 * steps really are a sequence) with the punch-clock stamp each step leaves.
 */

const STEPS = [
  {
    title: "Add your clients",
    body: "Name, colour and hourly rate. Add the site address if you want arrive and leave reminders. It takes about a minute each.",
    stamp: "07:02",
    stampLabel: "Mon",
  },
  {
    title: "Tap Start on site",
    body: "One tap, a firm buzz, and the clock lives on your Lock Screen. Switch jobs or take a break from there without opening the app.",
    stamp: "07:54",
    stampLabel: "In",
  },
  {
    title: "Send the timesheet",
    body: "Pick the week, pick the client, share a PDF or CSV. Hours, breaks, notes and the total, ready to attach to an invoice.",
    stamp: "17:30",
    stampLabel: "Out",
  },
];

export function TimeCard() {
  return (
    <div className="relative mx-auto max-w-[880px] rounded-md border border-line-strong bg-surface-elevated shadow-md">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink px-5 py-4 md:px-8">
        <p className="condensed text-title font-extrabold">Time card</p>
        <p className="text-caption text-ink-muted">Week 40</p>
      </div>
      <ol>
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 border-b border-line px-5 py-6 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:gap-x-8 md:px-8"
          >
            <span className="condensed text-[3.5rem] leading-[0.85] font-extrabold text-accent-ink tabular" aria-hidden>
              {index + 1}
            </span>
            <div>
              <h3 className="semi-condensed text-headline font-bold">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-1.5 max-w-[56ch] text-ink-muted">{step.body}</p>
            </div>
            <span
              className="col-start-2 inline-flex w-fit -rotate-2 items-baseline gap-2 rounded-sm border-2 border-accent-ink px-2.5 py-1 font-semibold text-accent-ink tabular md:col-start-3 md:mt-1"
              aria-hidden
            >
              <span className="text-caption">{step.stampLabel}</span>
              <span className="text-headline">{step.stamp}</span>
            </span>
          </li>
        ))}
      </ol>
      {/* Punched holes down the left edge, like a card that has been through the clock. */}
      <div className="pointer-events-none absolute top-24 bottom-8 -left-[7px] hidden flex-col justify-around md:flex" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-3.5 rounded-full border border-line-strong bg-surface" />
        ))}
      </div>
    </div>
  );
}
