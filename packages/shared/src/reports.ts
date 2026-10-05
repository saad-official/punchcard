import { elapsedSeconds, hoursDecimal, roundSeconds, splitAtMidnight, type TimedEntry } from "./duration";
import type { ClientColor } from "./palette";
import { centsToDecimal, earningsCents } from "./pay";
import type { Client, Job, Rounding, RoundingMode, Settings } from "./schemas";
import { localTime, type DayKey, type IsoString } from "./tz";
import { dayKey } from "./week";

export type ReportEntry = TimedEntry & {
  id: string;
  clientId: string;
  jobId?: string | null;
  note?: string;
  deletedAt?: IsoString | null;
};

export type ReportClient = Pick<Client, "id" | "name" | "color" | "hourlyRateCents" | "currency">;
export type ReportJob = Pick<Job, "id" | "name">;

export interface ReportOptions {
  /** Inclusive start instant; entries are selected by `startedAt` in `[from, to)`. */
  from: IsoString;
  /** Exclusive end instant. */
  to: IsoString;
  tz?: string;
  rounding?: Rounding;
  mode?: RoundingMode;
  /** Running entries are included (measured up to `now`) only when `now` is given. */
  now?: IsoString;
}

export interface ClientTotal {
  clientId: string;
  name: string;
  color: ClientColor | null;
  currency: string;
  hourlyRateCents: number;
  entryCount: number;
  seconds: number;
  roundedSeconds: number;
  earningsCents: number;
}

export interface ReportSummary {
  from: IsoString;
  to: IsoString;
  /** Busiest client first. */
  clients: ClientTotal[];
  total: {
    entryCount: number;
    seconds: number;
    roundedSeconds: number;
    /** Sum across currencies; use `earningsByCurrency` when clients bill in more than one. */
    earningsCents: number;
    earningsByCurrency: Record<string, number>;
  };
  daysWorked: number;
  longestDay: { day: DayKey; seconds: number } | null;
}

/** An entry with its client and the measured, rounded and priced time. Used by CSV and timesheet. */
export interface PricedEntry<E extends ReportEntry = ReportEntry> {
  entry: E;
  client: ReportClient | null;
  seconds: number;
  roundedSeconds: number;
  earningsCents: number;
}

const UNKNOWN = { name: "Unknown client", hourlyRateCents: 0, currency: "USD" };

/** Live, measurable entries in start order, optionally limited to `[from, to)`. */
export function priceEntries<E extends ReportEntry>(
  entries: readonly E[],
  clients: readonly ReportClient[],
  opts: { from?: IsoString; to?: IsoString; rounding?: Rounding; mode?: RoundingMode; now?: IsoString },
): PricedEntry<E>[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const from = opts.from ? Date.parse(opts.from) : -Infinity;
  const to = opts.to ? Date.parse(opts.to) : Infinity;
  return entries
    .filter((e) => !e.deletedAt && (e.endedAt || opts.now))
    .filter((e) => {
      const t = Date.parse(e.startedAt);
      return t >= from && t < to;
    })
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map((entry) => {
      const client = byId.get(entry.clientId) ?? null;
      const seconds = elapsedSeconds(entry, opts.now);
      const roundedSeconds = roundSeconds(seconds, opts.rounding ?? "none", opts.mode ?? "nearest");
      const rate = client?.hourlyRateCents ?? UNKNOWN.hourlyRateCents;
      return { entry, client, seconds, roundedSeconds, earningsCents: earningsCents(roundedSeconds, rate) };
    });
}

/** Totals per client, grand total, days worked and longest day for a period. */
export function summarize(
  entries: readonly ReportEntry[],
  clients: readonly ReportClient[],
  opts: ReportOptions,
): ReportSummary {
  const tz = opts.tz ?? "UTC";
  const priced = priceEntries(entries, clients, opts);
  const perClient = new Map<string, ClientTotal>();
  const perDay = new Map<DayKey, number>();
  const total: ReportSummary["total"] = { entryCount: 0, seconds: 0, roundedSeconds: 0, earningsCents: 0, earningsByCurrency: {} };

  for (const p of priced) {
    const id = p.entry.clientId;
    let t = perClient.get(id);
    if (!t) {
      t = {
        clientId: id,
        name: p.client?.name ?? UNKNOWN.name,
        color: p.client?.color ?? null,
        currency: p.client?.currency ?? UNKNOWN.currency,
        hourlyRateCents: p.client?.hourlyRateCents ?? UNKNOWN.hourlyRateCents,
        entryCount: 0,
        seconds: 0,
        roundedSeconds: 0,
        earningsCents: 0,
      };
      perClient.set(id, t);
    }
    t.entryCount += 1;
    t.seconds += p.seconds;
    t.roundedSeconds += p.roundedSeconds;
    t.earningsCents += p.earningsCents;
    total.entryCount += 1;
    total.seconds += p.seconds;
    total.roundedSeconds += p.roundedSeconds;
    total.earningsCents += p.earningsCents;
    total.earningsByCurrency[t.currency] = (total.earningsByCurrency[t.currency] ?? 0) + p.earningsCents;
    for (const seg of splitAtMidnight(p.entry, tz, opts.now)) {
      perDay.set(seg.day, (perDay.get(seg.day) ?? 0) + seg.netSeconds);
    }
  }

  let longestDay: ReportSummary["longestDay"] = null;
  let daysWorked = 0;
  for (const [day, seconds] of [...perDay].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (seconds <= 0) continue;
    daysWorked += 1;
    if (!longestDay || seconds > longestDay.seconds) longestDay = { day, seconds };
  }

  return {
    from: opts.from,
    to: opts.to,
    clients: [...perClient.values()].sort((a, b) => b.seconds - a.seconds),
    total,
    daysWorked,
    longestDay,
  };
}

export const CSV_HEADER = ["Date", "Client", "Job", "Start", "End", "Break (min)", "Hours", "Rate", "Amount", "Currency", "Note"];

export interface CsvOptions {
  tz?: string;
  jobs?: readonly ReportJob[];
  from?: IsoString;
  to?: IsoString;
  now?: IsoString;
}

/**
 * Invoice-ready CSV rows (header first): local date/start/end, break minutes, rounded hours with 2dp,
 * rate and amount as plain decimals in the client's currency. Feed to `toCsv` for the file text.
 */
export function toCsvRows(
  entries: readonly ReportEntry[],
  clients: readonly ReportClient[],
  settings: Partial<Pick<Settings, "rounding" | "roundingMode">>,
  opts: CsvOptions = {},
): string[][] {
  const tz = opts.tz ?? "UTC";
  const jobNames = new Map((opts.jobs ?? []).map((j) => [j.id, j.name]));
  const priced = priceEntries(entries, clients, { ...opts, rounding: settings.rounding, mode: settings.roundingMode });
  const rows = priced.map(({ entry, client, roundedSeconds, earningsCents: cents }) => {
    const currency = client?.currency ?? UNKNOWN.currency;
    return [
      dayKey(entry.startedAt, tz),
      client?.name ?? UNKNOWN.name,
      (entry.jobId && jobNames.get(entry.jobId)) || "",
      localTime(entry.startedAt, tz),
      entry.endedAt ? localTime(entry.endedAt, tz) : "",
      String(Math.floor(entry.breakSeconds / 60)),
      hoursDecimal(roundedSeconds),
      centsToDecimal(client?.hourlyRateCents ?? 0, currency),
      centsToDecimal(cents, currency),
      currency,
      entry.note ?? "",
    ];
  });
  return [[...CSV_HEADER], ...rows];
}
