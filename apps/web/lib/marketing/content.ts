import { PLAN_LIMITS } from "@punchcard/shared";

/** One place for the facts the marketing pages repeat. */

export const CONTACT_EMAIL = "saad.khan+punchcard@zortik.com";

export const PRICES = {
  proMonthly: "$6.99",
  proYearly: "$49.99",
  proYearlyPerMonth: "$4.17",
} as const;

export const FREE_LIMITS = {
  clients: PLAN_LIMITS.free.maxClients,
  historyDays: PLAN_LIMITS.free.historyDays,
} as const;

/** Store links are placeholders until the betas open. */
export const STORE_LINKS = {
  testflight: "#",
  googlePlay: "#",
} as const;

export type Competitor = {
  name: string;
  base: number;
  perUser: number;
};

/** List prices per month, as published by each vendor (checked October 2026, before discounts). */
export const COMPETITORS: Competitor[] = [
  { name: "QuickBooks Time", base: 20, perUser: 8 },
  { name: "ClockShark", base: 40, perUser: 9 },
];

export function soloMonthly(competitor: Competitor): number {
  return competitor.base + competitor.perUser;
}

export type PlanFeature = { label: string; free: string | boolean; pro: string | boolean };

export const PLAN_FEATURES: PlanFeature[] = [
  { label: "Clients", free: `Up to ${FREE_LIMITS.clients}`, pro: "Unlimited" },
  { label: "History", free: `Last ${FREE_LIMITS.historyDays} days`, pro: "Everything, forever" },
  { label: "Lock Screen and Dynamic Island timer", free: true, pro: true },
  { label: "Android 16 Live Update", free: true, pro: true },
  { label: "Home and Lock Screen widgets", free: true, pro: true },
  { label: "Still-clocked-in reminder", free: true, pro: true },
  { label: "Notes, photos and mileage", free: true, pro: true },
  { label: "PDF and CSV timesheets", free: "Basic PDF, CSV", pro: "Branded PDF, CSV" },
  { label: "Arrive and leave reminders (geofences)", free: false, pro: true },
  { label: "Sync across your phones", free: false, pro: true },
  { label: "Monday summary of last week", free: "With an account", pro: "With an account" },
];

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "Do I need an account?",
    answer:
      "No. Punchcard keeps everything on your phone and works offline. Create an account only if you want sync between phones or the Monday summary notification.",
  },
  {
    question: "What happens if I forget to stop the clock?",
    answer:
      "Punchcard reminds you when you have been clocked in for 10 hours (you can change the limit). With Pro, it also asks when your phone leaves the job site. Every entry can be edited afterwards, and the edit keeps a short note of what changed.",
  },
  {
    question: "Does the timer keep running if I close the app or my phone restarts?",
    answer:
      "Yes. The running job is saved as a start time, not a ticking counter, so nothing is lost when the app is closed, the phone restarts or the battery dies.",
  },
  {
    question: "Which phones does it support?",
    answer:
      "iPhone and Android. The Lock Screen and Dynamic Island timer needs iOS 16.2 or later. On Android 16 the running job shows as a Live Update; older Android versions show an ongoing notification with the same timer.",
  },
  {
    question: "Can my crew use it?",
    answer:
      "Each person can run Punchcard on their own phone today. Crew features with a manager view are planned, not shipped, so we do not charge for them.",
  },
  {
    question: "Can I get my data out?",
    answer:
      "Any time. Export a PDF or CSV timesheet for a week or a month, or export everything from Settings. Deleting your account removes the synced copy from our servers.",
  },
];
