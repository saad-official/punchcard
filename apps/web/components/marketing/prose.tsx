import type { ReactNode } from "react";

/** Long-form page shell for privacy, terms and support: one readable column. */
export function ProsePage({ title, updated, intro, children }: { title: string; updated?: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-4 pt-14 md:px-8 md:pt-20">
      <h1 className="condensed text-section font-extrabold">{title}</h1>
      {updated ? <p className="mt-3 text-caption text-ink-muted">Last updated {updated}</p> : null}
      {intro ? <div className="mt-6 text-[1.1875rem] leading-relaxed text-ink-muted">{intro}</div> : null}
      <div className="prose-pc mt-10">{children}</div>
    </article>
  );
}

export function ProseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="semi-condensed text-title font-bold">{title}</h2>
      <div className="mt-3 space-y-4 text-ink-muted [&_a]:font-semibold [&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
