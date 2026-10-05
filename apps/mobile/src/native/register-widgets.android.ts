import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from '@/widgets/widget-task-handler';

let registered = false;

/** Registers the headless widget handler. Idempotent; must run at JS entry (see index.ts). */
export function registerWidgets(): void {
  if (registered) return;
  registered = true;
  registerWidgetTaskHandler(widgetTaskHandler);
}

registerWidgets();
