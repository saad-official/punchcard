// "Sync now": pushes locally changed clients, jobs and entries to POST /api/sync/push.
// Pull (server -> device) and photo upload need repository functions that do not exist yet
// (see the API gaps in docs/mobile-data-api.md), so this is push-only for now.
import type { SyncPushRequest } from '@punchcard/shared';

import { authedFetch } from '@/data/auth-client';
import { clearDirty, getClient, getEntry, getJob, getSyncState, type SyncedTable } from '@/data';
import { getDeviceId } from '@/hooks/use-preferences';

const TABLES: SyncedTable[] = ['clients', 'jobs', 'entries', 'entry_photos'];

/** Rows waiting to be pushed, per table. */
export function pendingChanges(): number {
  return TABLES.reduce((n, t) => n + getSyncState(t).dirtyIds.length, 0);
}

export type SyncResult = { ok: true; accepted: number; skippedPhotos: number } | { ok: false; message: string };

const nonNull = <T,>(v: T | null | undefined): v is T => v != null;

export async function syncNow(): Promise<SyncResult> {
  const clientIds = getSyncState('clients').dirtyIds;
  const jobIds = getSyncState('jobs').dirtyIds;
  const entryIds = getSyncState('entries').dirtyIds;
  const photoIds = getSyncState('entry_photos').dirtyIds;
  const body: SyncPushRequest = {
    deviceId: getDeviceId(),
    tables: {
      clients: clientIds.map(getClient).filter(nonNull),
      jobs: jobIds.map(getJob).filter(nonNull),
      entries: entryIds.map(getEntry).filter(nonNull),
      entryPhotos: [],
    },
  };
  try {
    const res = await authedFetch('/api/sync/push', { method: 'POST', body });
    if (res.status === 401) return { ok: false, message: 'Your session expired. Sign in again.' };
    if (res.status === 403) return { ok: false, message: 'Sync is part of Punchcard Pro.' };
    if (!res.ok) return { ok: false, message: `The server said ${res.status}. Try again later.` };
    const json = (await res.json()) as { accepted?: number };
    clearDirty('clients', clientIds);
    clearDirty('jobs', jobIds);
    clearDirty('entries', entryIds);
    return { ok: true, accepted: json.accepted ?? 0, skippedPhotos: photoIds.length };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection." };
  }
}
