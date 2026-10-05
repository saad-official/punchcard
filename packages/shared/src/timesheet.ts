import { formatDuration, hoursDecimal } from "./duration";
import type { ClientColor } from "./palette";
import { formatMoney } from "./pay";
import { priceEntries, summarize, type ReportClient, type ReportEntry, type ReportJob, type ReportOptions } from "./reports";
import { localTime, zonedMidnight, type DayKey, type IsoString } from "./tz";
import { bucketEntriesByDay } from "./week";

export interface TimesheetBrand {
  businessName?: string;
  logoUri?: string;
  accentHex?: string;
}

export interface TimesheetOptions extends ReportOptions {
  locale?: string;
  jobs?: readonly ReportJob[];
  title?: string;
  /** Client-branded header (Pro); null renders the basic PDF. */
  brand?: TimesheetBrand | null;
}

export interface TimesheetRow {
  entryId: string;
  clientId: string;
  clientName: string;
  clientColor: ClientColor | null;
  jobName: string;
  start: string;
  end: string;
  breakLabel: string;
  durationLabel: string;
  hours: string;
  amountCents: number;
  amountLabel: string;
  note: string;
}

export interface TimesheetDay {
  day: DayKey;
  label: string;
  rows: TimesheetRow[];
  totalSeconds: number;
  totalLabel: string;
}

export interface TimesheetModel {
  header: {
    title: string;
    periodLabel: string;
    from: IsoString;
    to: IsoString;
    clientNames: string[];
    brand: TimesheetBrand | null;
  };
  days: TimesheetDay[];
  totals: {
    seconds: number;
    roundedSeconds: number;
    hours: string;
    durationLabel: string;
    amounts: { currency: string; cents: number; label: string }[];
    perClient: { clientId: string; name: string; color: ClientColor | null; hours: string; amountLabel: string }[];
  };
}

const compact = (s: number) => formatDuration(s, { style: "compact" });

/** View model for the PDF timesheet: header, rows grouped by local day, totals. No rendering here. */
export function timesheetModel(
  entries: readonly ReportEntry[],
  clients: readonly ReportClient[],
  opts: TimesheetOptions,
): TimesheetModel {
  const tz = opts.tz ?? "UTC";
  const locale = opts.locale ?? "en-US";
  const dateFmt = new Intl.DateTimeFormat(locale, { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
  const dayFmt = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const jobNames = new Map((opts.jobs ?? []).map((j) => [j.id, j.name]));
  const priced = priceEntries(entries, clients, opts);
  const summary = summarize(entries, clients, opts);

  const days = bucketEntriesByDay(
    priced.map((p) => ({ ...p, startedAt: p.entry.startedAt })),
    tz,
  ).map(({ day, entries: list }): TimesheetDay => {
    const rows = list.map(({ entry, client, roundedSeconds, earningsCents }): TimesheetRow => ({
      entryId: entry.id,
      clientId: entry.clientId,
      clientName: client?.name ?? "Unknown client",
      clientColor: client?.color ?? null,
      jobName: (entry.jobId && jobNames.get(entry.jobId)) || "",
      start: localTime(entry.startedAt, tz),
      end: entry.endedAt ? localTime(entry.endedAt, tz) : "—",
      breakLabel: entry.breakSeconds > 0 ? compact(entry.breakSeconds) : "",
      durationLabel: compact(roundedSeconds),
      hours: hoursDecimal(roundedSeconds),
      amountCents: earningsCents,
      amountLabel: formatMoney(earningsCents, client?.currency ?? "USD", locale),
      note: entry.note ?? "",
    }));
    const totalSeconds = list.reduce((n, p) => n + p.roundedSeconds, 0);
    return {
      day,
      label: dayFmt.format(new Date(zonedMidnight(day, tz))),
      rows,
      totalSeconds,
      totalLabel: compact(totalSeconds),
    };
  });

  const lastInstant = new Date(Date.parse(opts.to) - 1);
  return {
    header: {
      title: opts.title ?? "Timesheet",
      periodLabel: `${dateFmt.format(new Date(Date.parse(opts.from)))} – ${dateFmt.format(lastInstant)}`,
      from: opts.from,
      to: opts.to,
      clientNames: summary.clients.map((c) => c.name),
      brand: opts.brand ?? null,
    },
    days,
    totals: {
      seconds: summary.total.seconds,
      roundedSeconds: summary.total.roundedSeconds,
      hours: hoursDecimal(summary.total.roundedSeconds),
      durationLabel: compact(summary.total.roundedSeconds),
      amounts: Object.entries(summary.total.earningsByCurrency).map(([currency, cents]) => ({
        currency,
        cents,
        label: formatMoney(cents, currency, locale),
      })),
      perClient: summary.clients.map((c) => ({
        clientId: c.clientId,
        name: c.name,
        color: c.color,
        hours: hoursDecimal(c.roundedSeconds),
        amountLabel: formatMoney(c.earningsCents, c.currency, locale),
      })),
    },
  };
}
