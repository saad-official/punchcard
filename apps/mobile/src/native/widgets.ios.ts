import TodayWidget, { type TodayWidgetProps } from '@/widgets/today-widget';

import { buildWidgetSnapshot, todayLabel, runningColorHex, widgetPalette, type WidgetSnapshot } from './widget-snapshot';

export type { WidgetSnapshot } from './widget-snapshot';

function toProps(s: WidgetSnapshot): TodayWidgetProps {
  const at = s.snapshotAt ?? Date.now();
  const running = !!s.runningSince;
  const onBreak = running && !!s.breakStartedAt;
  const runningTimerStartMs =
    running && s.runningSince ? Date.parse(s.runningSince) + (s.runningBreakSeconds ?? 0) * 1000 : null;
  return {
    todaySeconds: s.todaySeconds,
    todayLabel: todayLabel(s.todaySeconds, true),
    // While working, a count-up timer from (snapshot − today) shows today's total live.
    todayTimerStartMs: running && !onBreak ? at - s.todaySeconds * 1000 : null,
    runningClientName: s.runningClientName ?? null,
    runningColorHex: runningColorHex(s),
    runningTimerStartMs,
    onBreak,
    lastClientId: s.lastClientId ?? null,
    lastClientName: s.lastClientName ?? null,
    snapshotAtMs: at,
    palette: widgetPalette,
  };
}

export async function refreshWidgets(snapshot: WidgetSnapshot): Promise<void> {
  try {
    TodayWidget.updateSnapshot(toProps(snapshot));
  } catch (error) {
    console.warn('[widgets] updateSnapshot failed', error);
  }
}

export async function refreshWidgetsFromDatabase(): Promise<void> {
  await refreshWidgets(buildWidgetSnapshot());
}
