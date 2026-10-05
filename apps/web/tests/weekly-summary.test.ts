import type { ReportClient, ReportEntry } from "@punchcard/shared";
import { describe, expect, it } from "vitest";
import {
  computeWeeklySummary,
  formatHours,
  isMondayUtc,
  previousWeekWindow,
  summaryMessage,
} from "@/lib/domain/weekly-summary";

const H = 3600;
const NOW = new Date("2026-10-05T06:00:00Z"); // a Monday
const window = previousWeekWindow(NOW);

let n = 0;
function entry(clientId: string, start: string, end: string | null, extra: Partial<ReportEntry> = {}): ReportEntry {
  n += 1;
  return { id: `e${n}`, clientId, startedAt: start, endedAt: end, breakSeconds: 0, deletedAt: null, ...extra };
}

const clients: ReportClient[] = [
  { id: "smith", name: "Smith kitchen", color: "blue", hourlyRateCents: 8500, currency: "USD" },
  { id: "patel", name: "Patel rewire", color: "green", hourlyRateCents: 9000, currency: "USD" },
];

describe("previousWeekWindow", () => {
  it("is Monday 00:00 UTC to Monday 00:00 UTC of the week before", () => {
    expect(window).toEqual({ start: "2026-09-28T00:00:00.000Z", end: "2026-10-05T00:00:00.000Z" });
  });

  it("works from any day of the week", () => {
    expect(previousWeekWindow(new Date("2026-10-11T23:59:00Z")).start).toBe("2026-09-28T00:00:00.000Z");
  });

  it("isMondayUtc", () => {
    expect(isMondayUtc(NOW)).toBe(true);
    expect(isMondayUtc(new Date("2026-10-06T06:00:00Z"))).toBe(false);
  });
});

describe("computeWeeklySummary", () => {
  it("totals worked time minus breaks and picks the busiest client", () => {
    const summary = computeWeeklySummary(
      [
        entry("smith", "2026-09-29T08:00:00Z", "2026-09-29T16:00:00Z", { breakSeconds: 1800 }),
        entry("patel", "2026-09-30T08:00:00Z", "2026-09-30T12:00:00Z"),
        entry("smith", "2026-10-01T08:00:00Z", "2026-10-01T10:00:00Z"),
      ],
      clients,
      window,
      NOW,
    );
    expect(summary.totalSeconds).toBe(7.5 * H + 4 * H + 2 * H);
    expect(summary.entryCount).toBe(3);
    expect(summary.topClient).toEqual({ id: "smith", name: "Smith kitchen", seconds: 9.5 * H });
  });

  it("skips deleted entries and entries that started outside the week", () => {
    const summary = computeWeeklySummary(
      [
        entry("smith", "2026-09-29T08:00:00Z", "2026-09-29T09:00:00Z", { deletedAt: "2026-09-30T00:00:00Z" }),
        entry("patel", "2026-09-20T08:00:00Z", "2026-09-20T12:00:00Z"),
        entry("patel", "2026-10-05T01:00:00Z", "2026-10-05T03:00:00Z"),
      ],
      clients,
      window,
      NOW,
    );
    expect(summary).toEqual({ totalSeconds: 0, entryCount: 0, topClient: null });
  });

  it("counts an entry still running since last week up to now", () => {
    const summary = computeWeeklySummary([entry("patel", "2026-10-04T22:00:00Z", null)], clients, window, NOW);
    expect(summary.totalSeconds).toBe(8 * H);
  });
});

describe("summaryMessage", () => {
  it("formats hours with one decimal", () => {
    expect(formatHours(9.5 * H)).toBe("9.5 h");
    expect(formatHours(40 * H)).toBe("40 h");
    expect(formatHours(10 * 60)).toBe("0.2 h");
  });

  it("reads like a weekly recap", () => {
    const message = summaryMessage({
      totalSeconds: 31.5 * H,
      entryCount: 9,
      topClient: { id: "smith", name: "Smith kitchen", seconds: 14 * H },
    });
    expect(message.title).toBe("Last week: 31.5 h on the clock");
    expect(message.body).toBe("Top client: Smith kitchen (14 h). Open Punchcard to send the timesheet.");
  });
});
