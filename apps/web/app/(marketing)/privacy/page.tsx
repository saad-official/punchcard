import type { Metadata } from "next";
import { ProsePage, ProseSection } from "@/components/marketing/prose";
import { CONTACT_EMAIL } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Punchcard stores, where it lives, who processes it, and how to export or delete it.",
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      updated="5 October 2026"
      intro={
        <p>
          Punchcard is local-first. Your clients, jobs and hours live on your phone, and the app works without an
          account. This page explains what leaves your phone, and only if you choose to use those features.
        </p>
      }
    >
      <ProseSection title="Data that stays on your phone">
        <p>
          Clients (names, colours, hourly rates, site addresses), jobs, time entries, breaks, notes, mileage, photo
          references and your settings are stored in a database on your device. Photos stay in your phone&apos;s
          storage.
        </p>
        <p>
          If you add a site address, your phone&apos;s system geocoding service (Apple or Google) turns it into map
          coordinates. Arrive and leave reminders (Pro) use your phone&apos;s location in the background to notice when
          you cross a site boundary. That check happens on the device; your location is not sent to us.
        </p>
      </ProseSection>

      <ProseSection title="If you create an account">
        <p>An account is optional. It turns on sync between phones and the Monday summary notification.</p>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and a hashed password (we never store or see the
            password itself), plus the IP address and device type of each signed-in session, used to keep sessions
            secure.
          </li>
          <li>
            <strong>Synced records:</strong> a copy of your clients, jobs, time entries and photo references, so another
            phone signed in to the same account can download them. Photo files are not uploaded.
          </li>
          <li>
            <strong>Push notifications:</strong> if you allow notifications, the Expo push token for your device and its
            platform (iOS or Android). We use it to send the weekly summary, which we calculate from your synced
            entries. Notifications are delivered through Expo&apos;s push service and Apple or Google.
          </li>
        </ul>
      </ProseSection>

      <ProseSection title="Subscriptions">
        <p>
          Pro subscriptions are sold through the App Store or Google Play and managed by RevenueCat, which receives your
          purchase details from the store. We never see your card or payment details. If you are signed in, RevenueCat
          links the subscription to your Punchcard account ID; otherwise it uses an anonymous ID. RevenueCat sends us
          subscription events (for example, a purchase, renewal or expiry and its date) so we know which plan your
          account is on. See{" "}
          <a href="https://www.revenuecat.com/privacy" rel="noopener noreferrer">
            RevenueCat&apos;s privacy policy
          </a>
          .
        </p>
      </ProseSection>

      <ProseSection title="Who processes it">
        <ul>
          <li>Vercel hosts this website and the Punchcard API.</li>
          <li>Neon hosts the database that holds accounts and synced records.</li>
          <li>Expo delivers push notifications.</li>
          <li>RevenueCat, Apple and Google handle subscriptions.</li>
        </ul>
        <p>Data is sent to these services over encrypted connections and only to run the features above.</p>
      </ProseSection>

      <ProseSection title="What we do not do">
        <p>
          Punchcard shows no ads. We do not sell your data or share it for advertising, and we do not read your entries
          except to calculate your weekly summary and keep sync working.
        </p>
      </ProseSection>

      <ProseSection title="Export and delete">
        <ul>
          <li>Export any week or month as PDF or CSV, or everything at once, from Settings in the app.</li>
          <li>
            Deleting your account in Settings removes your account, synced records, push tokens and plan record from our
            servers straight away.
          </li>
          <li>
            Data on your phone is yours to delete in Settings, or by deleting the app. Subscription event records we
            received from RevenueCat may be kept for accounting.
          </li>
        </ul>
      </ProseSection>

      <ProseSection title="Children">
        <p>Punchcard is a work tool and is not meant for children under 13.</p>
      </ProseSection>

      <ProseSection title="Changes and contact">
        <p>
          If this policy changes, we will update this page and the date at the top. Questions, or a request to export or
          delete your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
