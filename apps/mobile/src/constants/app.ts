// App-wide constants that are not design tokens.

/** Marketing site + API (Better Auth, sync, devices). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://getpunchcard.vercel.app').replace(/\/$/, '');

export const LINKS = {
  privacy: `${API_URL}/privacy`,
  support: `${API_URL}/support`,
  terms: `${API_URL}/terms`,
  pricing: `${API_URL}/pricing`,
} as const;

/** Currencies offered in pickers; the user's default currency is always added if missing. */
export const CURRENCIES: readonly string[] = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD'];

export function currencyOptions(extra?: string | null): readonly string[] {
  return extra && !CURRENCIES.includes(extra) ? [extra, ...CURRENCIES] : CURRENCIES;
}

/** Pro pricing as listed on the RevenueCat Test Store offering (spec section 2). */
export const PRO_PRICES = { monthly: '$6.99', yearly: '$49.99' } as const;

/** Geofence radius slider bounds (shared policy: min 100 m). */
export const GEOFENCE_RADIUS = { min: 100, max: 1000, step: 50, default: 150 } as const;

/** "Still clocked in" nudge options, hours. */
export const NUDGE_HOURS = [6, 8, 9, 10, 11, 12, 14] as const;
