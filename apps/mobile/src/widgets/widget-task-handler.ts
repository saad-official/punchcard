// Android widget task handler (headless JS). Runs when a widget is added, resized, updated by
// the system or clicked — possibly with the app process cold — so it reads SQLite directly.
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { clockIn } from '@/data/entries-repo';
import { ensureDatabaseReady } from '@/data/migrate';
import { syncNativeSurfaces } from '@/native/surface-sync';
import { buildWidgetSnapshot } from '@/native/widget-snapshot';
import { renderTodayWidget } from '@/native/widgets.android';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, clickAction, clickActionData, renderWidget } = props;
  if (widgetAction === 'WIDGET_DELETED') return;
  await ensureDatabaseReady();

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'START_LAST') {
    const clientId = typeof clickActionData?.clientId === 'string' ? clickActionData.clientId : '';
    if (clientId) {
      clockIn({ clientId, source: 'widget' });
      // Live Update / nudge follow the new entry even with the app closed.
      await syncNativeSurfaces();
    }
  }

  renderWidget(renderTodayWidget(buildWidgetSnapshot(), widgetInfo));
}
