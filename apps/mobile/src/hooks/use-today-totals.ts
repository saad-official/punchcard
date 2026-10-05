import { getDayTotals, getRunningEntry } from '@/data/entries-repo';
import { useLiveQuery } from '@/data/store';
import { deviceTimeZone } from '@/data/time-math';
import type { DayTotals } from '@/data/types';

import { useNowSeconds } from './use-now';

const EMPTY: DayTotals = { totalSeconds: 0, earningsCents: 0, entryCount: 0, byClient: [] };

const hasRunningEntry = () => getRunningEntry() != null;

/**
 * Today's worked time, earnings and per-client split (local day, device time zone). Ticks
 * every second while an entry is running so the total grows live; otherwise recomputes only
 * on writes (and on the first render after midnight).
 */
export function useTodayTotals(): DayTotals {
  const running = useLiveQuery('today:has-running', ['entries'], hasRunningEntry, false);
  const nowSec = useNowSeconds(running);
  const tz = deviceTimeZone();
  // When idle `useNowSeconds` does not tick, but still returns the current time on render.
  const now = new Date(nowSec * 1000);
  const variant = running ? String(nowSec) : now.toDateString();
  return useLiveQuery(
    `today:${tz}`,
    ['entries', 'clients'],
    () => getDayTotals(now, now.toISOString(), tz),
    EMPTY,
    variant,
  );
}
