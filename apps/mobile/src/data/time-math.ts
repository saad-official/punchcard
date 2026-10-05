// Thin device-side glue over @punchcard/shared's time math: resolves the device time zone
// and turns "today" into ISO bounds. All arithmetic lives in the shared package.
import { addDaysToKey, dayKey, earningsCents, splitAtMidnight, zonedMidnight } from '@punchcard/shared';
import { getCalendars } from 'expo-localization';

import type { DateRange, Entry } from './types';

/** IANA zone of the device, e.g. "America/Toronto". */
export function deviceTimeZone(): string {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  }
}

export function toIsoBound(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

/** Local day `[00:00, next 00:00)` containing `date` in `tz`, as ISO bounds. */
export function dayRange(date: Date | string = new Date(), tz: string = deviceTimeZone()): { from: string; to: string } {
  const key = dayKey(toIsoBound(date), tz);
  return {
    from: new Date(zonedMidnight(key, tz)).toISOString(),
    to: new Date(zonedMidnight(addDaysToKey(key, 1), tz)).toISOString(),
  };
}

/** Net worked seconds of `entry` that fall on the local day containing `range.from`. */
export function workedSecondsOnDay(entry: Entry, range: DateRange, nowIso: string, tz: string): number {
  const key = dayKey(toIsoBound(range.from), tz);
  return splitAtMidnight(entry, tz, nowIso)
    .filter((s) => s.day === key)
    .reduce((sum, s) => sum + s.netSeconds, 0);
}

export function earningsFor(seconds: number, hourlyRateCents: number): number {
  return earningsCents(Math.max(0, Math.floor(seconds)), Math.max(0, Math.floor(hourlyRateCents)));
}
