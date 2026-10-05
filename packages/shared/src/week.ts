import { addDaysToKey, partsToKey, zonedMidnight, zonedParts, type DayKey, type IsoString } from "./tz";

export interface WeekRange {
  /** Inclusive start (local midnight of the first day), ISO. */
  start: IsoString;
  /** Exclusive end (local midnight after the last day), ISO. */
  end: IsoString;
  days: DayKey[];
}

export interface DayBucket<T> {
  day: DayKey;
  entries: T[];
}

export interface WeekBucket<T> {
  weekStart: IsoString;
  startDay: DayKey;
  entries: T[];
}

type Started = { startedAt: IsoString };

/** Local calendar day of an instant in `tz`, `YYYY-MM-DD`. */
export function dayKey(dateIso: IsoString, tz = "UTC"): DayKey {
  return partsToKey(zonedParts(dateIso, tz));
}

function weekStartDay(dateIso: IsoString, weekStartsOn: number, tz: string): DayKey {
  const p = zonedParts(dateIso, tz);
  return addDaysToKey(partsToKey(p), -((p.weekday - weekStartsOn + 7) % 7));
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Local midnight that starts the week containing `dateIso`. */
export function startOfWeek(dateIso: IsoString, weekStartsOn: number, tz = "UTC"): IsoString {
  return iso(zonedMidnight(weekStartDay(dateIso, weekStartsOn, tz), tz));
}

/** The half-open week `[start, end)` containing `dateIso`, plus its seven day keys. */
export function weekRange(dateIso: IsoString, weekStartsOn: number, tz = "UTC"): WeekRange {
  const first = weekStartDay(dateIso, weekStartsOn, tz);
  return {
    start: iso(zonedMidnight(first, tz)),
    end: iso(zonedMidnight(addDaysToKey(first, 7), tz)),
    days: Array.from({ length: 7 }, (_, i) => addDaysToKey(first, i)),
  };
}

const byStart = (a: Started, b: Started) => Date.parse(a.startedAt) - Date.parse(b.startedAt);

function groupBy<T extends Started>(entries: readonly T[], keyOf: (e: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const e of [...entries].sort(byStart)) {
    const k = keyOf(e);
    const list = groups.get(k);
    if (list) list.push(e);
    else groups.set(k, [e]);
  }
  return new Map([...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Group entries by the local day they started on; days ascending, entries by start time. */
export function bucketEntriesByDay<T extends Started>(entries: readonly T[], tz = "UTC"): DayBucket<T>[] {
  return [...groupBy(entries, (e) => dayKey(e.startedAt, tz))].map(([day, list]) => ({ day, entries: list }));
}

/** Group entries by the week they started in; weeks ascending. */
export function bucketEntriesByWeek<T extends Started>(
  entries: readonly T[],
  weekStartsOn: number,
  tz = "UTC",
): WeekBucket<T>[] {
  return [...groupBy(entries, (e) => weekStartDay(e.startedAt, weekStartsOn, tz))].map(([startDay, list]) => ({
    weekStart: iso(zonedMidnight(startDay, tz)),
    startDay,
    entries: list,
  }));
}
