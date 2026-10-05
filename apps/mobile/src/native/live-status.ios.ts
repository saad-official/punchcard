import { colors } from '@punchcard/shared/tokens';
import { addUserInteractionListener, type LiveActivity } from 'expo-widgets';

import RunningEntryActivity, { type RunningEntryActivityProps } from '@/widgets/running-entry.activity';

import { statusFigures, type StatusActionListener, type StatusClient, type StatusEntry } from './live-status.types';
import { addNotificationActionListener } from './notifications';

export type { StatusAction, StatusActionListener, StatusClient, StatusEntry } from './live-status.types';

const DEEP_LINK = 'punchcard://clock';

const palette: RunningEntryActivityProps['palette'] = {
  light: {
    surface: colors.light.surfaceElevated,
    text: colors.light.text,
    textSecondary: colors.light.textSecondary,
    accent: colors.light.accentText,
  },
  dark: {
    surface: colors.dark.surface,
    text: colors.dark.text,
    textSecondary: colors.dark.textSecondary,
    accent: colors.dark.accent,
  },
};

let current: LiveActivity<RunningEntryActivityProps> | null = null;
let currentEntryId: string | null = null;

function toProps(entry: StatusEntry, client: StatusClient): RunningEntryActivityProps {
  const f = statusFigures(entry, client);
  return {
    entryId: entry.id,
    clientName: client.name,
    jobName: client.jobName ?? null,
    clientColorHex: f.colorHex,
    timerStartMs: Date.parse(entry.startedAt) + entry.breakSeconds * 1000,
    pausedAtMs: f.onBreak && entry.breakStartedAt ? Date.parse(entry.breakStartedAt) : null,
    earningsText: f.earningsText,
    rateText: f.rateText,
    palette,
  };
}

function safeInstances(): LiveActivity<RunningEntryActivityProps>[] {
  try {
    return RunningEntryActivity.getInstances();
  } catch {
    return [];
  }
}

async function endAll(): Promise<void> {
  await Promise.all(safeInstances().map((a) => a.end('immediate').catch(() => undefined)));
  current = null;
  currentEntryId = null;
}

export async function startRunningStatus(entry: StatusEntry, client: StatusClient): Promise<void> {
  if (current && currentEntryId === entry.id) return updateRunningStatus(entry, client);
  await endAll();
  try {
    current = RunningEntryActivity.start(toProps(entry, client), DEEP_LINK);
    currentEntryId = entry.id;
  } catch (error) {
    // Live Activities turned off in Settings, iOS < 16.2, or the system activity limit.
    console.warn('[live-status] Live Activity start failed', error);
  }
}

export async function updateRunningStatus(entry: StatusEntry, client: StatusClient): Promise<void> {
  if (!current || currentEntryId !== entry.id) return startRunningStatus(entry, client);
  try {
    await current.update(toProps(entry, client));
  } catch (error) {
    console.warn('[live-status] Live Activity update failed', error);
  }
}

export async function endRunningStatus(): Promise<void> {
  await endAll();
}

export async function reconcileRunningStatus(
  running: { entry: StatusEntry; client: StatusClient } | null,
): Promise<void> {
  if (!running) return endAll();
  const [keep, ...extra] = safeInstances();
  await Promise.all(extra.map((a) => a.end('immediate').catch(() => undefined)));
  if (keep) {
    current = keep;
    currentEntryId = running.entry.id;
    await keep.update(toProps(running.entry, running.client)).catch(() => undefined);
  } else {
    await startRunningStatus(running.entry, running.client);
  }
}

export function addStatusActionListener(listener: StatusActionListener): () => void {
  const widgetSub = addUserInteractionListener((event) => {
    if (event.target === 'stop' || event.target === 'break') {
      listener({ action: event.target, entryId: currentEntryId ?? undefined, source: 'live-activity' });
    }
  });
  const removeNotifications = addNotificationActionListener((e) =>
    listener({ action: e.action, entryId: e.entryId, clientId: e.clientId, source: 'notification' }),
  );
  return () => {
    widgetSub.remove();
    removeNotifications();
  };
}
