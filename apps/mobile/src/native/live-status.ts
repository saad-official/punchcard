// Default (web) implementation: no system running-status surface, but notification actions
// still flow through `addStatusActionListener`. iOS: live-status.ios.ts, Android: live-status.android.ts.
import type { StatusActionListener, StatusClient, StatusEntry } from './live-status.types';
import { addNotificationActionListener } from './notifications';

export type { StatusAction, StatusActionListener, StatusClient, StatusEntry } from './live-status.types';

/** Show the running entry on the Lock Screen / Dynamic Island / status bar. */
export async function startRunningStatus(_entry: StatusEntry, _client: StatusClient): Promise<void> {}

/** Refresh after switch / break / every minute (earnings, labels). Starts the surface if missing. */
export async function updateRunningStatus(_entry: StatusEntry, _client: StatusClient): Promise<void> {}

/** Remove the surface (clock-out). */
export async function endRunningStatus(): Promise<void> {}

/** After launch: adopt or end surfaces left over from a previous process. */
export async function reconcileRunningStatus(
  _running: { entry: StatusEntry; client: StatusClient } | null,
): Promise<void> {}

/** Unified Stop / Break / Start / open events from every surface. Returns unsubscribe. */
export function addStatusActionListener(listener: StatusActionListener): () => void {
  return addNotificationActionListener((e) =>
    listener({ action: e.action, entryId: e.entryId, clientId: e.clientId, source: 'notification' }),
  );
}
