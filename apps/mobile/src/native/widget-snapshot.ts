import { clientColorHex, formatDuration, hoursDecimal, type ClientColor } from '@punchcard/shared';
import { colors } from '@punchcard/shared/tokens';

import { getClient } from '@/data/clients-repo';
import { getDayTotals, getRunningEntryWithClient, recentClientIds } from '@/data/entries-repo';

/** What every widget renders. Built from the database, so app and headless tasks agree. */
export type WidgetSnapshot = {
  /** Worked seconds today (breaks excluded) at `snapshotAt`. */
  todaySeconds: number;
  runningClientName?: string | null;
  runningClientColor?: ClientColor | null;
  /** ISO start of the running entry. */
  runningSince?: string | null;
  /** Completed break seconds on the running entry (so timers show worked time). */
  runningBreakSeconds?: number;
  /** ISO start of a break in progress, if any. */
  breakStartedAt?: string | null;
  lastClientId?: string | null;
  lastClientName?: string | null;
  /** Epoch ms the snapshot was taken (defaults to now). */
  snapshotAt?: number;
};

export function buildWidgetSnapshot(now: Date = new Date()): WidgetSnapshot {
  const totals = getDayTotals(now, now.toISOString());
  const running = getRunningEntryWithClient();
  const lastId = recentClientIds(1)[0] ?? null;
  const last = lastId ? getClient(lastId) : null;
  return {
    todaySeconds: totals.totalSeconds,
    runningClientName: running?.clientName ?? null,
    runningClientColor: running?.clientColor ?? null,
    runningSince: running?.startedAt ?? null,
    runningBreakSeconds: running?.breakSeconds ?? 0,
    breakStartedAt: running?.breakStartedAt ?? null,
    lastClientId: last?.id ?? null,
    lastClientName: last?.name ?? null,
    snapshotAt: now.getTime(),
  };
}

export const widgetPalette = {
  light: {
    surface: colors.light.surfaceElevated,
    text: colors.light.text,
    textSecondary: colors.light.textSecondary,
    accent: colors.light.accent,
  },
  dark: {
    surface: colors.dark.surface,
    text: colors.dark.text,
    textSecondary: colors.dark.textSecondary,
    accent: colors.dark.accent,
  },
};

/** "6.5h" for tiny surfaces, "1h 05m" below one day otherwise. */
export function todayLabel(seconds: number, compact = false): string {
  return compact ? `${Number(hoursDecimal(seconds))}h` : formatDuration(seconds, { style: 'compact' });
}

export function runningColorHex(snapshot: WidgetSnapshot): string | null {
  return snapshot.runningClientColor ? clientColorHex(snapshot.runningClientColor) : null;
}
