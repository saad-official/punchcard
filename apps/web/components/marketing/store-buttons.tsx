import { STORE_LINKS } from "@/lib/marketing/content";

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 shrink-0" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.1 1.72-3.12 1.8-3.17-.98-1.43-2.5-1.63-3.04-1.65-1.29-.13-2.52.76-3.18.76-.66 0-1.66-.74-2.74-.72-1.4.02-2.7.82-3.43 2.08-1.47 2.54-.37 6.3 1.05 8.36.7 1 1.52 2.13 2.6 2.09 1.05-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.73.65 1.13-.02 1.84-1.02 2.53-2.03.8-1.16 1.13-2.29 1.15-2.35-.03-.01-2.2-.84-2.22-3.35ZM14.3 6.43c.58-.7.97-1.67.86-2.64-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.17Z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 shrink-0" fill="currentColor">
      <path d="M4.6 2.9c-.26.27-.4.68-.4 1.2v15.8c0 .52.14.93.4 1.2l.07.06 8.85-8.85v-.21L4.67 2.84l-.07.06Zm11.87 11.36-2.95-2.95v-.2l2.95-2.96.07.04 3.5 1.99c1 .57 1 1.5 0 2.06l-3.5 1.99-.07.03Zm-.07.04-3.02-3.02-8.91 8.91c.33.35.88.4 1.5.04l10.43-5.93m0-6.04L5.97 2.2c-.62-.35-1.17-.31-1.5.04l8.91 8.91 3.02-3.03Z" />
    </svg>
  );
}

type StoreButtonProps = { href: string; store: string; glyph: React.ReactNode; tone: "solid" | "outline" };

function StoreButton({ href, store, glyph, tone }: StoreButtonProps) {
  const toneClass =
    tone === "solid"
      ? "bg-accent text-on-accent hover:bg-accent-pressed"
      : "border border-line-strong text-ink hover:border-ink hover:bg-surface-elevated";
  return (
    <a
      href={href}
      className={`inline-flex min-h-14 items-center gap-3 rounded-sm px-5 py-2.5 transition-colors ${toneClass}`}
    >
      {glyph}
      <span className="flex flex-col text-left leading-tight">
        <span className="text-callout font-semibold">{store}</span>
        <span className="text-caption opacity-80">Coming soon</span>
      </span>
    </a>
  );
}

/** "Get the app" placeholders until the TestFlight and Play betas open. */
export function StoreButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <StoreButton href={STORE_LINKS.testflight} store="TestFlight for iPhone" glyph={<AppleGlyph />} tone="solid" />
      <StoreButton href={STORE_LINKS.googlePlay} store="Google Play" glyph={<PlayGlyph />} tone="outline" />
    </div>
  );
}
