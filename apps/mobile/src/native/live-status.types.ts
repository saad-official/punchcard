import { clientColorHex, elapsedSeconds, earningsCents, formatDuration, formatMoney } from '@punchcard/shared';

import type { Client, Entry } from '@/data/types';

/** What every running-status surface needs. `EntryWithClient` from the data layer satisfies both. */
export type StatusEntry = Pick<Entry, 'id' | 'clientId' | 'startedAt' | 'endedAt' | 'breakSeconds' | 'breakStartedAt'>;
export type StatusClient = Pick<Client, 'name' | 'color' | 'hourlyRateCents' | 'currency'> & { jobName?: string | null };

export type StatusActionSource = 'live-activity' | 'live-update' | 'notification';

/** One event for every "do something with the clock" tap outside the app UI. */
export type StatusAction = {
  /** `open` = the surface itself was tapped (deep link opens the Clock tab). */
  action: 'stop' | 'break' | 'start' | 'open';
  entryId?: string;
  clientId?: string;
  source: StatusActionSource;
};

export type StatusActionListener = (event: StatusAction) => void;

export function statusFigures(entry: StatusEntry, client: StatusClient, now = new Date()) {
  const worked = elapsedSeconds(entry, now.toISOString());
  const cents = earningsCents(worked, client.hourlyRateCents);
  let money = '';
  let rate = '';
  try {
    money = formatMoney(cents, client.currency);
    rate = `${formatMoney(client.hourlyRateCents, client.currency)}/h`;
  } catch {
    money = (cents / 100).toFixed(2);
    rate = `${(client.hourlyRateCents / 100).toFixed(2)}/h`;
  }
  return {
    workedSeconds: worked,
    onBreak: !!entry.breakStartedAt && !entry.endedAt,
    elapsedLabel: formatDuration(worked, { style: 'compact' }),
    earningsText: money,
    rateText: rate,
    colorHex: clientColorHex(client.color),
  };
}
