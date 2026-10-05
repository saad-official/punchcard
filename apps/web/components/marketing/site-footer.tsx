import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/marketing/content";
import { PunchMark } from "./wordmark";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-[1fr_auto] md:px-8">
        <div className="flex items-start gap-3">
          <PunchMark className="mt-1 h-8 w-auto" />
          <div>
            <p className="condensed text-headline font-extrabold">Punchcard</p>
            <p className="max-w-sm text-callout text-ink-muted">
              A job clock for plumbers, electricians, cleaners, landscapers and anyone else who bills by the hour.
            </p>
          </div>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-callout">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="rounded-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Email us
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
