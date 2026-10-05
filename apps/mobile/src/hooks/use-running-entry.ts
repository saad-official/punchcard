import { elapsedSeconds, isOnBreak } from '@punchcard/shared';

import { getRunningEntryWithClient } from '@/data/entries-repo';
import { useLiveQuery } from '@/data/store';
import { earningsFor } from '@/data/time-math';
import type { EntryWithClient } from '@/data/types';

import { useNowSeconds } from './use-now';

export type RunningEntryState = {
  entry: EntryWithClient;
  /** Worked seconds (breaks excluded), recomputed every second from `startedAt`. */
  elapsedSeconds: number;
  onBreak: boolean;
  /** Seconds of the break in progress (0 when not on break). */
  currentBreakSeconds: number;
  earningsCents: number;
};

/**
 * The running entry with live elapsed time, or null when idle. Elapsed is derived from the
 * stored timestamps on every tick, so it is correct after backgrounding or an app kill.
 */
export function useRunningEntry(): RunningEntryState | null {
  const entry = useRunningEntryRow();
  const nowSec = useNowSeconds(entry != null);
  if (!entry) return null;
  const seconds = elapsedSeconds(entry, new Date(nowSec * 1000).toISOString());
  const onBreak = isOnBreak(entry);
  const currentBreakSeconds =
    onBreak && entry.breakStartedAt ? Math.max(0, nowSec - Math.floor(Date.parse(entry.breakStartedAt) / 1000)) : 0;
  return {
    entry,
    elapsedSeconds: seconds,
    onBreak,
    currentBreakSeconds,
    earningsCents: earningsFor(seconds, entry.hourlyRateCents),
  };
}

/** The running entry joined with its client/job, without the 1-second tick (null when idle). */
export function useRunningEntryRow(): EntryWithClient | null {
  return useLiveQuery('running', ['entries', 'clients', 'jobs'], getRunningEntryWithClient, null);
}
