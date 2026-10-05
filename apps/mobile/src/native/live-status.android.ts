import {
  addNotificationStateChangeListener,
  startLiveUpdate,
  stopLiveUpdate,
  updateLiveUpdate,
} from 'expo-live-updates';
// The package index does not re-export its state/config types.
import type { LiveUpdateConfig, LiveUpdateState } from 'expo-live-updates/build/types';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import { statusFigures, type StatusActionListener, type StatusClient, type StatusEntry } from './live-status.types';
import {
  addNotificationActionListener,
  dismissRunningStatusNotification,
  getNotificationPermission,
  presentRunningStatusNotification,
} from './notifications';

export type { StatusAction, StatusActionListener, StatusClient, StatusEntry } from './live-status.types';

// Android 16 (API 36) gets a Live Update; older versions an ongoing notification with
// Stop / Break actions. Promotion to the status-bar chip needs API 36.1; on 36.0 the Live
// Update renders as a regular ongoing notification, which is still correct.
const LIVE_UPDATES_MIN_API = 36;
const usesLiveUpdates = () => Number(Platform.Version) >= LIVE_UPDATES_MIN_API;

// The Live Update id must survive an app kill, otherwise the notification could never be stopped.
const ID_KEY = 'punchcard.liveUpdate.notificationId';
const ENTRY_KEY = 'punchcard.liveUpdate.entryId';

function stored(): { id: number | null; entryId: string | null } {
  try {
    const raw = Storage.getItemSync(ID_KEY);
    return { id: raw ? Number(raw) : null, entryId: Storage.getItemSync(ENTRY_KEY) };
  } catch {
    return { id: null, entryId: null };
  }
}

function remember(id: number | null, entryId: string | null): void {
  try {
    if (id == null) {
      Storage.removeItemSync(ID_KEY);
      Storage.removeItemSync(ENTRY_KEY);
    } else {
      Storage.setItemSync(ID_KEY, String(id));
      if (entryId) Storage.setItemSync(ENTRY_KEY, entryId);
    }
  } catch {
    // best effort
  }
}

/** "1:12" — fits the 7-character status chip. */
function hoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function titleOf(client: StatusClient): string {
  return client.jobName ? `${client.name} · ${client.jobName}` : client.name;
}

function toLiveUpdate(entry: StatusEntry, client: StatusClient): { state: LiveUpdateState; config: LiveUpdateConfig } {
  const f = statusFigures(entry, client);
  return {
    state: {
      title: titleOf(client),
      text: `${f.onBreak ? 'On break' : 'Running'} · ${f.elapsedLabel}`,
      subText: f.earningsText,
      progress: { indeterminate: true },
      shortCriticalText: hoursMinutes(f.workedSeconds),
      // Notification "when" = clock-in time; the text above is refreshed each minute while the app lives.
      showTime: true,
      time: Date.parse(entry.startedAt),
    },
    config: { deepLinkUrl: 'punchcard://clock', iconBackgroundColor: f.colorHex },
  };
}

async function fallbackNotification(entry: StatusEntry, client: StatusClient): Promise<void> {
  const f = statusFigures(entry, client);
  await presentRunningStatusNotification({
    entryId: entry.id,
    title: titleOf(client),
    body: `${f.onBreak ? 'On break' : 'Running'} · ${f.elapsedLabel} · ${f.earningsText}`,
  });
}

export async function startRunningStatus(entry: StatusEntry, client: StatusClient): Promise<void> {
  if ((await getNotificationPermission()).status !== 'granted') return;
  if (!usesLiveUpdates()) {
    await fallbackNotification(entry, client);
    return;
  }
  const prev = stored();
  if (prev.id != null && prev.entryId === entry.id) return updateRunningStatus(entry, client);
  if (prev.id != null) {
    try {
      stopLiveUpdate(prev.id);
    } catch {
      // already gone
    }
  }
  try {
    const { state, config } = toLiveUpdate(entry, client);
    const id = startLiveUpdate(state, config);
    remember(typeof id === 'number' ? id : null, entry.id);
  } catch (error) {
    console.warn('[live-status] startLiveUpdate failed; using an ongoing notification', error);
    await fallbackNotification(entry, client);
  }
}

export async function updateRunningStatus(entry: StatusEntry, client: StatusClient): Promise<void> {
  if (!usesLiveUpdates()) {
    if ((await getNotificationPermission()).status === 'granted') await fallbackNotification(entry, client);
    return;
  }
  const prev = stored();
  if (prev.id == null || prev.entryId !== entry.id) return startRunningStatus(entry, client);
  try {
    const { state, config } = toLiveUpdate(entry, client);
    updateLiveUpdate(prev.id, state, config);
  } catch (error) {
    console.warn('[live-status] updateLiveUpdate failed', error);
  }
}

export async function endRunningStatus(): Promise<void> {
  const prev = stored();
  if (prev.id != null) {
    try {
      stopLiveUpdate(prev.id);
    } catch {
      // already gone
    }
  }
  remember(null, null);
  await dismissRunningStatusNotification();
}

export async function reconcileRunningStatus(
  running: { entry: StatusEntry; client: StatusClient } | null,
): Promise<void> {
  if (!running) return endRunningStatus();
  return updateRunningStatus(running.entry, running.client);
}

export function addStatusActionListener(listener: StatusActionListener): () => void {
  const liveSub = addNotificationStateChangeListener((event) => {
    if (event.action === 'clicked') {
      listener({ action: 'open', entryId: stored().entryId ?? undefined, source: 'live-update' });
    }
  });
  const removeNotifications = addNotificationActionListener((e) =>
    listener({ action: e.action, entryId: e.entryId, clientId: e.clientId, source: 'notification' }),
  );
  return () => {
    liveSub?.remove();
    removeNotifications();
  };
}
