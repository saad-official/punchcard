// Keeps every out-of-app surface in step with SQLite: Live Activity / Live Update / ongoing
// notification, home-screen widgets and the "still clocked in" nudge. Repositories notify the
// change bus on every write, so screens only call repositories; nothing here needs to be
// called after a clock action.
import { nudgeAt } from '@punchcard/shared';
import { AppState } from 'react-native';

import { clockIn, clockOut, getRunningEntry, getRunningEntryWithClient, toggleBreak } from '@/data/entries-repo';
import { ensureDatabaseReady } from '@/data/migrate';
import { getSettings } from '@/data/settings-repo';
import { onTablesChanged } from '@/data/store';
import type { EntryWithClient } from '@/data/types';

import {
  addStatusActionListener,
  endRunningStatus,
  reconcileRunningStatus,
  updateRunningStatus,
  type StatusAction,
  type StatusClient,
} from './live-status';
import { cancelStillClockedIn, consumeLaunchNotificationAction, scheduleStillClockedIn, setupNotifications } from './notifications';
import { refreshWidgetsFromDatabase } from './widgets';

const clientOf = (e: EntryWithClient): StatusClient => ({
  name: e.clientName,
  color: e.clientColor,
  hourlyRateCents: e.hourlyRateCents,
  currency: e.currency,
  jobName: e.jobName,
});

let lastNudgeKey: string | null = null;
let syncing: Promise<void> | null = null;
let again = false;

async function syncOnce(): Promise<void> {
  await ensureDatabaseReady();
  const running = getRunningEntryWithClient();
  if (running) {
    await updateRunningStatus(running, clientOf(running));
    const hours = getSettings().nudgeAfterHours;
    const key = `${running.id}:${hours}`;
    if (key !== lastNudgeKey) {
      lastNudgeKey = key;
      const at = nudgeAt(running, hours);
      if (at) await scheduleStillClockedIn(running.id, at, { clientName: running.clientName });
    }
  } else {
    await endRunningStatus();
    if (lastNudgeKey !== '') {
      lastNudgeKey = '';
      await cancelStillClockedIn();
    }
  }
  await refreshWidgetsFromDatabase();
}

/** Bring all surfaces up to date now. Coalesces concurrent calls. Never throws. */
export function syncNativeSurfaces(): Promise<void> {
  if (syncing) {
    again = true;
    return syncing;
  }
  syncing = (async () => {
    do {
      again = false;
      try {
        await syncOnce();
      } catch (error) {
        console.warn('[surface-sync] failed', error);
      }
    } while (again);
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

/**
 * Apply a Stop / Break / Start pressed on a Live Activity, Live Update or notification.
 * Stale actions (for an entry that is no longer running) are ignored.
 */
export async function handleStatusAction(event: StatusAction): Promise<void> {
  await ensureDatabaseReady();
  const running = getRunningEntry();
  const stale = !!event.entryId && running?.id !== event.entryId;
  switch (event.action) {
    case 'stop':
      if (running && !stale) clockOut();
      break;
    case 'break':
      if (running && !stale) toggleBreak();
      break;
    case 'start':
      if (event.clientId) {
        clockIn({ clientId: event.clientId, source: event.source === 'live-activity' ? 'live_activity' : 'geofence' });
      }
      break;
    case 'open':
      break; // the deep link (punchcard://clock) routes the UI
  }
}

/**
 * Start everything native in one call from the root layout (after the database is ready):
 * notification setup, launch-action handling, surface reconciliation, change-driven sync and
 * a once-a-minute refresh while the app is in the foreground. Returns a cleanup function.
 */
export function startNativeServices(opts: { onAction?: (event: StatusAction) => void } = {}): () => void {
  setupNotifications().catch((e) => console.warn('[surface-sync] notification setup failed', e));

  const onAction = (event: StatusAction) => {
    opts.onAction?.(event);
    handleStatusAction(event).catch((e) => console.warn('[surface-sync] action failed', e));
  };

  (async () => {
    await ensureDatabaseReady();
    const launch = await consumeLaunchNotificationAction().catch(() => null);
    if (launch) onAction({ ...launch, source: 'notification' });
    const running = getRunningEntryWithClient();
    await reconcileRunningStatus(running ? { entry: running, client: clientOf(running) } : null);
    await syncNativeSurfaces();
  })().catch((e) => console.warn('[surface-sync] start failed', e));

  let debounce: ReturnType<typeof setTimeout> | null = null;
  const offTables = onTablesChanged(['entries', 'clients', 'jobs', 'settings'], () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void syncNativeSurfaces(), 150);
  });
  const offActions = addStatusActionListener(onAction);

  // Earnings / "1h 12m" labels are not native timers: refresh them each minute while visible.
  const minute = setInterval(() => {
    if (AppState.currentState === 'active' && getRunningEntry()) void syncNativeSurfaces();
  }, 60_000);
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNativeSurfaces();
  });

  return () => {
    if (debounce) clearTimeout(debounce);
    clearInterval(minute);
    offTables();
    offActions();
    appState.remove();
  };
}
