import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useSyncExternalStore } from 'react';

import migrations from '../../drizzle/migrations';
import { db } from './db';
import { createStore, markDatabaseReady } from './store';

export type DatabaseReadyState = { success: boolean; error?: Error };

const readyState = createStore<DatabaseReadyState>({ success: false });
let pending: Promise<void> | null = null;

/**
 * Applies pending drizzle migrations exactly once per JS runtime (single-flight), then
 * marks the change bus ready so live queries start returning data. Safe to call from the
 * root layout and from headless tasks (geofence, Android widget) concurrently.
 */
export function ensureDatabaseReady(): Promise<void> {
  if (!pending) {
    pending = migrate(db, migrations)
      .then(() => {
        markDatabaseReady();
        readyState.setState({ success: true });
      })
      .catch((error: unknown) => {
        pending = null; // allow a retry
        const err = error instanceof Error ? error : new Error(String(error));
        readyState.setState({ success: false, error: err });
        throw err;
      });
  }
  return pending;
}

/**
 * Same contract as drizzle's `useMigrations` (`{ success, error }`), but shares the
 * single-flight promise above so a background task and the UI never migrate twice.
 * Gate the app on `success` before rendering screens that use data hooks.
 */
export function useDatabaseMigrations(): DatabaseReadyState {
  useEffect(() => {
    ensureDatabaseReady().catch(() => undefined);
  }, []);
  return useSyncExternalStore(readyState.subscribe, readyState.getSnapshot);
}
