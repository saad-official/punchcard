import Link from "next/link";

/** The mark: a safety-orange time card with one punched hole. */
export function PunchMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden className={className}>
      <rect x="0" y="0" width="24" height="32" rx="4" fill="var(--pc-color-accent)" />
      <rect x="5" y="6" width="14" height="2.5" rx="1.25" fill="var(--pc-color-on-accent)" opacity="0.85" />
      <rect x="5" y="11" width="9" height="2.5" rx="1.25" fill="var(--pc-color-on-accent)" opacity="0.85" />
      <circle cx="12" cy="23" r="4" fill="var(--pc-color-surface)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 rounded-sm" aria-label="Punchcard home">
      <PunchMark className="h-7 w-auto" />
      <span className="condensed text-[1.6rem] leading-none font-extrabold tracking-tight">Punchcard</span>
    </Link>
  );
}
