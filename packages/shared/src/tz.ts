/** Time-zone helpers on top of Intl.DateTimeFormat. Pure; zones are always passed explicitly. */

export type IsoString = string;
/** A local calendar day in a zone, `YYYY-MM-DD`. */
export type DayKey = string;

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(tz, f);
  }
  return f;
}

function toMs(instant: IsoString | number): number {
  return typeof instant === "number" ? instant : Date.parse(instant);
}

/** Wall-clock parts of an instant in a zone (default UTC). */
export function zonedParts(instant: IsoString | number, tz = "UTC"): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of formatterFor(tz).formatToParts(new Date(toMs(instant)))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  const year = out.year ?? 0;
  const month = out.month ?? 1;
  const day = out.day ?? 1;
  return {
    year,
    month,
    day,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** Offset of the zone from UTC at that instant, in minutes (Toronto winter = -300). */
export function tzOffsetMinutes(instant: IsoString | number, tz = "UTC"): number {
  const ms = toMs(instant);
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

function parseKey(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

/** UTC epoch ms of the first instant of the local day `key` in `tz`. */
export function zonedMidnight(key: DayKey, tz = "UTC"): number {
  const [y, m, d] = parseKey(key);
  const wall = Date.UTC(y, m - 1, d);
  let guess = wall - tzOffsetMinutes(wall, tz) * 60_000;
  guess = wall - tzOffsetMinutes(guess, tz) * 60_000;
  // Zones whose DST jump happens at midnight have no 00:00; step forward to the day's first hour.
  for (let i = 0; i < 3 && zonedParts(guess, tz).day !== d; i++) guess += 3_600_000;
  return guess;
}

/** Calendar arithmetic on a `YYYY-MM-DD` key. */
export function addDaysToKey(key: DayKey, days: number): DayKey {
  const [y, m, d] = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `HH:mm` wall-clock time of an instant in a zone. */
export function localTime(instant: IsoString | number, tz = "UTC"): string {
  const p = zonedParts(instant, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` from zoned parts. */
export function partsToKey(p: Pick<ZonedParts, "year" | "month" | "day">): DayKey {
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
