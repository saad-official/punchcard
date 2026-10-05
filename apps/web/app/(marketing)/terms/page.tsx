import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, ProseSection } from "@/components/marketing/prose";
import { CONTACT_EMAIL, PRICES } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Punchcard and its optional account and subscription.",
};

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of use"
      updated="5 October 2026"
      intro={<p>Plain terms for a simple tool. By using Punchcard you agree to them.</p>}
    >
      <ProseSection title="What Punchcard is">
        <p>
          Punchcard is a time-tracking app for recording the hours you work for your clients and producing timesheets.
          It is currently in beta through TestFlight and Google Play testing, so features may change and you may meet
          bugs.
        </p>
      </ProseSection>

      <ProseSection title="Your records are your responsibility">
        <p>
          You decide what you record and what you bill. Check timesheets before sending them; Punchcard is not payroll,
          accounting or legal advice, and we are not responsible for billing disputes or lost earnings caused by wrong
          or missing entries.
        </p>
      </ProseSection>

      <ProseSection title="Accounts">
        <p>
          An account is optional. If you create one, keep your password safe and give a working email address. You can
          delete your account at any time from the app. We may suspend accounts used to abuse the service or other
          people.
        </p>
      </ProseSection>

      <ProseSection title="Subscriptions">
        <p>
          Pro costs {PRICES.proMonthly} a month or {PRICES.proYearly} a year at launch. During the beta, purchases run
          in test mode and nothing is charged. Once live, subscriptions are billed and renewed by the App Store or Google
          Play under their terms, and you cancel or request refunds there. Cancelling keeps Pro until the end of the
          period you paid for. See <Link href="/pricing">pricing</Link> for what each plan includes.
        </p>
      </ProseSection>

      <ProseSection title="Acceptable use">
        <p>
          Do not try to break, overload or reverse-engineer the service, access other people&apos;s data, or use
          Punchcard for anything unlawful.
        </p>
      </ProseSection>

      <ProseSection title="No warranty">
        <p>
          Punchcard is provided as is. We work to keep it reliable and your data safe, but we cannot promise it will
          always be available or free of errors. Keep your own exports of anything you cannot afford to lose. To the
          extent the law allows, our liability is limited to the amount you paid us in the last 12 months.
        </p>
      </ProseSection>

      <ProseSection title="Privacy">
        <p>
          How we handle data is described in the <Link href="/privacy">privacy policy</Link>.
        </p>
      </ProseSection>

      <ProseSection title="Changes and contact">
        <p>
          We will post changes to these terms on this page and update the date above. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
