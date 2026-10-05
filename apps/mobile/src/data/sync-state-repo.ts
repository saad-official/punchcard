import { eq } from 'drizzle-orm';

import { db, type Executor } from './db';
import { syncState } from './schema';
import { notifyTables } from './store';

/** Tables mirrored to the backend (spec section 4). */
export type SyncedTable = 'clients' | 'jobs' | 'entries' | 'entry_photos';

export type SyncStateSnapshot = { tableName: SyncedTable; lastPulledAt: string | null; dirtyIds: string[] };

function parseIds(json: string | null | undefined): string[] {
  try {
    const v: unknown = JSON.parse(json ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Record locally changed row ids so the next sync push includes them. Call inside the write's transaction. */
export function markDirty(ex: Executor, table: SyncedTable, ids: readonly string[]): void {
  if (ids.length === 0) return;
  const row = ex.select().from(syncState).where(eq(syncState.tableName, table)).get();
  const merged = Array.from(new Set([...parseIds(row?.dirtyIds), ...ids]));
  ex.insert(syncState)
    .values({ tableName: table, dirtyIds: JSON.stringify(merged) })
    .onConflictDoUpdate({ target: syncState.tableName, set: { dirtyIds: JSON.stringify(merged) } })
    .run();
}

export function getSyncState(table: SyncedTable): SyncStateSnapshot {
  const row = db.select().from(syncState).where(eq(syncState.tableName, table)).get();
  return { tableName: table, lastPulledAt: row?.lastPulledAt ?? null, dirtyIds: parseIds(row?.dirtyIds) };
}

/** After a successful push: drop the ids that were sent. */
export function clearDirty(table: SyncedTable, sentIds: readonly string[]): void {
  const sent = new Set(sentIds);
  const remaining = getSyncState(table).dirtyIds.filter((id) => !sent.has(id));
  db.insert(syncState)
    .values({ tableName: table, dirtyIds: JSON.stringify(remaining) })
    .onConflictDoUpdate({ target: syncState.tableName, set: { dirtyIds: JSON.stringify(remaining) } })
    .run();
  notifyTables('sync_state');
}

/** After a successful pull: remember the server's `serverTime` as the next `since`. */
export function setLastPulledAt(table: SyncedTable, serverTime: string): void {
  db.insert(syncState)
    .values({ tableName: table, lastPulledAt: serverTime })
    .onConflictDoUpdate({ target: syncState.tableName, set: { lastPulledAt: serverTime } })
    .run();
  notifyTables('sync_state');
}
