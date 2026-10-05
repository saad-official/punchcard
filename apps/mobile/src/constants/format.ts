// Locale-aware formatters, hoisted so lists never rebuild an `Intl` object per row.
import { formatDuration, formatMoney } from '@punchcard/shared';
import { getCalendars, getLocales } from 'expo-localization';

const locales = getLocales();

/** BCP-47 tag of the device's first locale, e.g. `en-US`. */
export const LOCALE = locales[0]?.languageTag ?? 'en-US';

/** Whether the device prefers a 24-hour clock. */
export const USES_24H = getCalendars()[0]?.uses24hourClock ?? false;

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: !USES_24H });
const dayLongFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' });
const dayShortFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });
const monthDayFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' });
const weekdayNarrowFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow' });
const weekdayLongFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });

const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));

export const formatTime = (v: string | number | Date) => timeFmt.format(toDate(v));
export const formatDayLong = (v: string | number | Date) => dayLongFmt.format(toDate(v));
export const formatDayShort = (v: string | number | Date) => dayShortFmt.format(toDate(v));
export const formatMonthDay = (v: string | number | Date) => monthDayFmt.format(toDate(v));
export const formatWeekdayNarrow = (v: string | number | Date) => weekdayNarrowFmt.format(toDate(v));
export const formatDate = (v: string | number | Date) => dateFmt.format(toDate(v));

/** "8:05 AM – 12:30 PM", or "8:05 AM – now" for a running entry. */
export function formatTimeRange(startedAt: string, endedAt: string | null | undefined): string {
  return `${formatTime(startedAt)} – ${endedAt ? formatTime(endedAt) : 'now'}`;
}

/** Localised weekday names, Sunday first (index = `settings.weekStartsOn`). */
export const WEEKDAY_NAMES: readonly string[] = Array.from({ length: 7 }, (_, i) =>
  // 2023-01-01 was a Sunday.
  weekdayLongFmt.format(new Date(Date.UTC(2023, 0, 1 + i, 12))),
);

/** Money in the device locale. */
export const money = (cents: number, currency: string) => formatMoney(cents, currency, LOCALE);

/** "1h 05m" style. */
export const compactDuration = (seconds: number) => formatDuration(seconds, { style: 'compact' });

/** "1 hour 5 minutes" for screen readers. */
export const spokenDuration = (seconds: number) => formatDuration(seconds, { style: 'long' });
