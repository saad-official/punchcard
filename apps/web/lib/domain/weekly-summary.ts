import { summarize, weekRange, type ReportClient, type ReportEntry } from "@punchcard/shared";

/**
 * The Monday weekly-summary push (docs/spec.md section 2): total hours and
 * top client for the previous week, computed with the shared `summarize`
 * from mirrored entries.
 *
 * Weeks run Monday 00:00 to Monday 00:00 UTC: the server does not know each
 * user's time zone, and a recap push only needs to be right to within a few
 * hours at the edges. Entries count in the week they started (the shared
 * report rule), unrounded; deleted entries are skipped and an entry still
 * running is measured up to `now`.
 */

export type WeekWindow = { start: string; end: string };

export type WeeklySummary = {
  totalSeconds: number;
  entryCount: number;
  topClient: { id: string; name: string; seconds: number } | null;
};

const DAY_MS = 86_400_000;

export function isMondayUtc(now: Date): boolean {
  return now.getUTCDay() === 1;
}

/** The full Monday-to-Monday UTC week before the one containing `now`. */
export function previousWeekWindow(now: Date): WeekWindow {
  const { start, end } = weekRange(new Date(now.getTime() - 7 * DAY_MS).toISOString(), 1, "UTC");
  return { start, end };
}

export function computeWeeklySummary(
  entries: readonly ReportEntry[],
  clients: readonly ReportClient[],
  window: WeekWindow,
  now: Date,
): WeeklySummary {
  const report = summarize(entries, clients, {
    from: window.start,
    to: window.end,
    tz: "UTC",
    rounding: "none",
    mode: "nearest",
    now: now.toISOString(),
  });
  const top = report.clients[0];
  return {
    totalSeconds: report.total.seconds,
    entryCount: report.total.entryCount,
    topClient: top && top.seconds > 0 ? { id: top.clientId, name: top.name, seconds: top.seconds } : null,
  };
}

/** "9.5 h", "40 h": one decimal, trailing ".0" dropped. */
export function formatHours(seconds: number): string {
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)} h`;
}

export function summaryMessage(summary: WeeklySummary): { title: string; body: string } {
  const title = `Last week: ${formatHours(summary.totalSeconds)} on the clock`;
  const top = summary.topClient
    ? `Top client: ${summary.topClient.name} (${formatHours(summary.topClient.seconds)}). `
    : "";
  return { title, body: `${top}Open Punchcard to send the timesheet.` };
}
