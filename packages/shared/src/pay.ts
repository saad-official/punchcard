import type { RoundingMode } from "./schemas";

/**
 * Earnings in integer minor units for `seconds` at `hourlyRateCents`, computed with BigInt so there is
 * no float drift. `rounding` decides the fractional cent: `nearest` (half-up), `up` or `down`.
 */
export function earningsCents(seconds: number, hourlyRateCents: number, rounding: RoundingMode = "nearest"): number {
  if (!Number.isInteger(seconds) || seconds < 0) throw new RangeError("seconds must be a non-negative integer");
  if (!Number.isInteger(hourlyRateCents) || hourlyRateCents < 0) {
    throw new RangeError("hourlyRateCents must be a non-negative integer");
  }
  const product = BigInt(seconds) * BigInt(hourlyRateCents);
  const hour = BigInt(3600);
  let q = product / hour;
  const r = product % hour;
  if (r > BigInt(0)) {
    if (rounding === "up" || (rounding === "nearest" && r * BigInt(2) >= hour)) q += BigInt(1);
  }
  return Number(q);
}

const digitsCache = new Map<string, number>();

/** Number of minor-unit digits for an ISO currency (USD 2, JPY 0, KWD 3). */
export function minorUnitDigits(currency: string): number {
  let d = digitsCache.get(currency);
  if (d === undefined) {
    d = new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    digitsCache.set(currency, d);
  }
  return d;
}

/** Minor units as a plain decimal string for CSV ("65.00", JPY "4500"); exact, no float math. */
export function centsToDecimal(cents: number, currency: string): string {
  const digits = minorUnitDigits(currency);
  const sign = cents < 0 ? "-" : "";
  const abs = String(Math.abs(Math.trunc(cents)));
  if (digits === 0) return sign + abs;
  const padded = abs.padStart(digits + 1, "0");
  return `${sign}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}

/** Localised currency string for minor units, e.g. 123456 USD en-US → "$1,234.56". */
export function formatMoney(cents: number, currency = "USD", locale = "en-US"): string {
  const amount = cents / 10 ** minorUnitDigits(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}
