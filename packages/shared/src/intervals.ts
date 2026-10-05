import type { TimedEntry } from "./duration";
import type { IsoString } from "./tz";

export interface Overlap {
  a: string;
  b: string;
  seconds: number;
}

function bounds(e: TimedEntry, now?: IsoString): [number, number] {
  const start = Date.parse(e.startedAt);
  const end = e.endedAt ? Date.parse(e.endedAt) : now ? Date.parse(now) : start;
  return [start, end];
}

/** Seconds of wall-clock time two entries share (running entries end at `now`). */
export function overlapSeconds(a: TimedEntry, b: TimedEntry, now?: IsoString): number {
  const [as, ae] = bounds(a, now);
  const [bs, be] = bounds(b, now);
  return Math.max(0, Math.floor((Math.min(ae, be) - Math.max(as, bs)) / 1000));
}

/** Every pair of overlapping entries, ordered by start time (useful when validating edits). */
export function findOverlaps<T extends TimedEntry & { id: string }>(entries: readonly T[], now?: IsoString): Overlap[] {
  const sorted = [...entries].sort((x, y) => Date.parse(x.startedAt) - Date.parse(y.startedAt));
  const out: Overlap[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      const seconds = overlapSeconds(a, b, now);
      if (seconds > 0) out.push({ a: a.id, b: b.id, seconds });
    }
  }
  return out;
}
