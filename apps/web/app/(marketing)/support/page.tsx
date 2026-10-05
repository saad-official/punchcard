import type { Metadata } from "next";
import { FaqList } from "@/components/marketing/faq";
import { ProsePage, ProseSection } from "@/components/marketing/prose";
import { CONTACT_EMAIL, type Faq } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Support",
  description: "Fixes for the Lock Screen timer, widgets, reminders and sync, and how to reach us.",
};

const FIXES: Faq[] = [
  {
    question: "The timer is not on my iPhone Lock Screen",
    answer:
      "Open Settings > Punchcard and turn on Live Activities. The Lock Screen timer needs iOS 16.2 or later and appears when you start a job; it ends when you stop.",
  },
  {
    question: "I do not see the Live Update on Android",
    answer:
      "Live Updates need Android 16. Allow notifications for Punchcard and, if your phone asks, allow it to show promoted notifications. On older Android versions the timer appears as an ongoing notification instead.",
  },
  {
    question: "The widget shows yesterday's total",
    answer:
      "Widgets refresh when you start, switch or stop a job. Open Punchcard once to refresh them, and check that Background App Refresh (iPhone) or battery optimisation (Android) is not blocking the app.",
  },
  {
    question: "Arrive and leave reminders do not fire",
    answer:
      "They are part of Pro and need location access set to Always. Check that the client has a site address and a radius, and give the reminder a minute: phones check site boundaries to save battery, not every second.",
  },
  {
    question: "My second phone is missing entries",
    answer:
      "Sync is part of Pro and needs both phones signed in to the same account. Make sure both are online, then open Punchcard on each; sync runs when the app opens. If the same entry was edited on both phones, the most recent edit wins.",
  },
  {
    question: "I upgraded but still see the Free limits",
    answer:
      "Use Restore purchases in Punchcard settings. If you bought Pro on another phone, sign in to the same Punchcard account and the same App Store or Google Play account first.",
  },
];

export default function SupportPage() {
  return (
    <ProsePage
      title="Support"
      intro={
        <p>
          Stuck on site? Most problems are a permission or a setting. Start with the fixes below; if they do not help,
          email us and include your phone model and what you tapped.
        </p>
      }
    >
      <ProseSection title="Common fixes">
        <FaqList items={FIXES} />
      </ProseSection>
      <ProseSection title="Contact">
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We read every message.
        </p>
        <p>
          To delete your account and synced data, use Delete account in Punchcard settings, or email us from the address on
          your account.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
