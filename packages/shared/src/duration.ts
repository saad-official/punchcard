import type { Rounding, RoundingMode } from "./schemas";
import { addDaysToKey, partsToKey, zonedMidnight, zonedParts, type DayKey, type IsoString } from "./tz";

/** The timing fields of an entry; finished when `endedAt` is set. */
export interface TimedEntry {
  startedAt: IsoString;
  endedAt?: IsoString | null;
  breakSeconds: number;
  breakStartedAt?: IsoString | null;
}

export type DurationStyle = "clock" | "compact" | "long";

export interface DaySegment {
  day: DayKey;
  start: IsoString;
  end: IsoString;
  /** Wall-clock seconds of the entry falling on this local day. */
  seconds: number;
  /** `seconds` minus this day's proportional share of break time. */
  netSeconds: number;
}

/** Timestamps are compared at whole-second resolution. */
const sec = (ms: number) => Math.floor(ms / 1000);

function endMs(entry: TimedEntry, now?: IsoString): number {
  if (entry.endedAt) return Date.parse(entry.endedAt);
  if (now === undefined) throw new RangeError("elapsedSeconds needs `now` for a running entry");
  return Date.parse(now);
}

/** Worked seconds: (end or now) − start − breaks, including a break still in progress. Never negative. */
export function elapsedSeconds(entry: TimedEntry, now?: IsoString): number {
  const end = endMs(entry, now);
  const gross = sec(end) - sec(Date.parse(entry.startedAt));
  const openBreak =
    !entry.endedAt && entry.breakStartedAt ? Math.max(0, sec(end) - sec(Date.parse(entry.breakStartedAt))) : 0;
  return Math.max(0, gross - entry.breakSeconds - openBreak);
}

/** Round to a 1/6/15-minute increment; `nearest` rounds halves up. */
export function roundSeconds(seconds: number, rounding: Rounding, mode: RoundingMode = "nearest"): number {
  if (rounding === "none") return seconds;
  const unit = Number(rounding) * 60;
  const q = seconds / unit;
  const n = mode === "up" ? Math.ceil(q) : mode === "down" ? Math.floor(q) : Math.floor(q + 0.5);
  return n * unit;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** `clock` → "1:05:09", `compact` → "1h 05m", `long` → "1 hour 5 minutes". */
export function formatDuration(seconds: number, opts: { style?: DurationStyle } = {}): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (opts.style ?? "clock") {
    case "compact":
      return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
    case "long":
      if (h === 0) return plural(m, "minute");
      return m === 0 ? plural(h, "hour") : `${plural(h, "hour")} ${plural(m, "minute")}`;
    default:
      return `${h}:${pad(m)}:${pad(s)}`;
  }
}

/** Decimal hours with exactly 2dp, half-up, computed in integers ("1.50"). */
export function hoursDecimal(seconds: number): string {
  const hundredths = Math.floor((Math.max(0, Math.floor(seconds)) * 100 + 1800) / 3600);
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** Split an entry into local-day segments in `tz` (DST-aware: days may be 23 or 25 hours). */
export function splitAtMidnight(entry: TimedEntry, tz = "UTC", now?: IsoString): DaySegment[] {
  const start = sec(Date.parse(entry.startedAt)) * 1000;
  const end = sec(endMs(entry, now)) * 1000;
  const segments: DaySegment[] = [];
  for (let cursor = start; cursor < end; ) {
    const day = partsToKey(zonedParts(cursor, tz));
    const segEnd = Math.min(zonedMidnight(addDaysToKey(day, 1), tz), end);
    segments.push({
      day,
      start: new Date(cursor).toISOString(),
      end: new Date(segEnd).toISOString(),
      seconds: (segEnd - cursor) / 1000,
      netSeconds: 0,
    });
    cursor = segEnd;
  }
  const gross = (end - start) / 1000;
  const net = elapsedSeconds(entry, now);
  let cumGross = 0;
  let cumNet = 0;
  for (const seg of segments) {
    cumGross += seg.seconds;
    const target = Math.round((cumGross * net) / gross);
    seg.netSeconds = target - cumNet;
    cumNet = target;
  }
  return segments;
}
