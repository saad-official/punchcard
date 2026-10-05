import type { Faq } from "@/lib/marketing/content";

/** Native <details> disclosures: keyboard and screen-reader friendly with no JavaScript. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 rounded-sm py-5 text-headline font-semibold">
            {item.question}
            <span
              aria-hidden
              className="faq-mark flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-[20px] leading-none font-normal group-open:border-accent group-open:bg-accent group-open:text-on-accent"
            >
              +
            </span>
          </summary>
          <p className="max-w-[68ch] pb-6 text-ink-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
