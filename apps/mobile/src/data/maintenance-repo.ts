import { db } from './db';
import { clients, entries, entryPhotos, jobs } from './schema';
import { notifyTables } from './store';
import { resetSyncState } from './sync-state-repo';

/**
 * Settings > Data > Delete all: hard-deletes every photo row, entry (running one included),
 * job and client in one transaction and resets sync bookkeeping. Settings (theme, business
 * details, device id, onboarding) are kept. Nothing is pushed: a signed-in account keeps its
 * server copy, and the next pull (now a full pull) would bring it back. Photo files on disk are
 * not touched. Surface sync ends the Live Activity / widgets from the table notifications.
 */
export function deleteAllData(): void {
  db.transaction((tx) => {
    tx.delete(entryPhotos).run();
    tx.delete(entries).run();
    tx.delete(jobs).run();
    tx.delete(clients).run();
    resetSyncState(tx);
  });
  notifyTables('entry_photos', 'entries', 'jobs', 'clients', 'sync_state');
}
