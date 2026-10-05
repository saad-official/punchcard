import { requestWidgetUpdate, type WidgetInfo } from 'react-native-android-widget';
import { createElement } from 'react';

import { TODAY_WIDGET_NAMES, TodayWidgetAndroid, type AndroidWidgetPalette } from '@/widgets/today-widget.android';

import { buildWidgetSnapshot, runningColorHex, todayLabel, widgetPalette, type WidgetSnapshot } from './widget-snapshot';

export type { WidgetSnapshot } from './widget-snapshot';

const asPalette = (p: Record<keyof AndroidWidgetPalette, string>) => p as AndroidWidgetPalette;

/** Light + dark renderings; the launcher picks by system theme. */
export function renderTodayWidget(snapshot: WidgetSnapshot, info: Pick<WidgetInfo, 'widgetName' | 'width'>) {
  const wide = info.widgetName === 'TodayWidgetWide' || info.width >= 250;
  const running = snapshot.runningClientName
    ? snapshot.breakStartedAt
      ? `${snapshot.runningClientName} · break`
      : `${snapshot.runningClientName} · running`
    : null;
  const props = {
    todayLabel: todayLabel(snapshot.todaySeconds, !wide),
    runningLabel: running,
    runningColorHex: runningColorHex(snapshot) as `#${string}` | null,
    lastClientId: snapshot.lastClientId ?? null,
    lastClientName: snapshot.lastClientName ?? null,
    wide,
  };
  return {
    light: createElement(TodayWidgetAndroid, { ...props, palette: asPalette(widgetPalette.light) }),
    dark: createElement(TodayWidgetAndroid, { ...props, palette: asPalette(widgetPalette.dark) }),
  };
}

export async function refreshWidgets(snapshot: WidgetSnapshot): Promise<void> {
  await Promise.all(
    TODAY_WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => renderTodayWidget(snapshot, info) }).catch(
        (error: unknown) => console.warn('[widgets] requestWidgetUpdate failed', widgetName, error),
      ),
    ),
  );
}

export async function refreshWidgetsFromDatabase(): Promise<void> {
  await refreshWidgets(buildWidgetSnapshot());
}
