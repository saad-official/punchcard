// Device <-> server sync (Pro, signed in). Push sends rows dirtied since the last push
// (`POST /api/sync/push`); pull fetches rows changed on the server since the last pull
// (`GET /api/sync/pull?since=`) and applies them with the shared last-write-wins rules
// (`planRemoteApply`) through `upsertFromRemote`, which does not mark rows dirty.
// Photos: only metadata syncs (id, entry, local URI, remote URL); binary upload is deferred,
// so pulled photos that only exist on another phone are skipped (`acceptPulledPhoto`).
// Not exported from '@/data' so headless tasks never load the auth client.
import {
  acceptPulledPhoto,
  deferConflictingRunning,
  planRemoteApply,
  pullCursor,
  rowVersion,
  SyncPullResponseSchema,
  type SyncPushRequest,
  type SyncRow,
  type SyncTables,
} from '@punchcard/shared';

import { authedFetch } from './auth-client';
import { getClient, getJob } from './clients-repo';
import { db } from './db';
import { getEntry, getPhoto, getRunningEntry } from './entries-repo';
import { getRowsByIds, normalizeRemoteRow, upsertFromRemote, type SyncedRows } from './remote-repo';
import { getDeviceId } from './settings-repo';
import { notifyTables } from './store';
import { clearDirty, getSyncState, setLastPulledAt, type SyncedTable } from './sync-state-repo';
import type { EntryPhoto } from './types';

/** Parents before children, so foreign keys hold while applying a pull. */
const TABLES: SyncedTable[] = ['clients', 'jobs', 'entries', 'entry_photos'];
const WIRE: Record<SyncedTable, keyof SyncTables> = {
  clients: 'clients',
  jobs: 'jobs',
  entries: 'entries',
  entry_photos: 'entryPhotos',
};
const TIMEOUT_MS = 30_000;

export type SyncFailure = {
  ok: false;
  reason: 'signed-out' | 'not-pro' | 'server' | 'network' | 'invalid-response';
  status?: number;
  message: string;
};

export type PushResult = { ok: true; sent: number; accepted: number; serverTime: string | null } | SyncFailure;

export type PullResult =
  | {
      ok: true;
      /** Rows the server sent. */
      received: number;
      /** Rows written locally (new or newer than the local copy). */
      applied: number;
      /** Local rows that were newer and stay queued for the next push. */
      kept: number;
      /** Remote running entries held back while another entry runs here (arrive once stopped). */
      deferred: number;
      /** Photos that only exist on another phone (binary upload is deferred). */
      skippedPhotos: number;
      serverTime: string;
    }
  | SyncFailure;

export type SyncNowResult =
  | { ok: true; push: Extract<PushResult, { ok: true }>; pull: Extract<PullResult, { ok: true }> }
  | (SyncFailure & { stage: 'push' | 'pull'; sent?: number });

/** Rows waiting to be pushed, across every synced table. */
export function pendingChanges(): number {
  return TABLES.reduce((n, t) => n + getSyncState(t).dirtyIds.length, 0);
}

/** The `since` the next pull will use: the oldest per-table cursor, or undefined for a full pull. */
export function currentPullCursor(): string | undefined {
  return pullCursor(TABLES.map((t) => getSyncState(t).lastPulledAt));
}

function failureFor(status: number): SyncFailure {
  if (status === 401) return { ok: false, reason: 'signed-out', status, message: 'Your session expired. Sign in again.' };
  if (status === 403) return { ok: false, reason: 'not-pro', status, message: 'Sync is part of Punchcard Pro.' };
  return { ok: false, reason: 'server', status, message: `The server said ${status}. Try again later.` };
}

const NETWORK_FAILURE: SyncFailure = { ok: false, reason: 'network', message: "Couldn't reach the server. Check your connection." };
const INVALID_FAILURE: SyncFailure = { ok: false, reason: 'invalid-response', message: 'The server sent something unexpected. Try again later.' };

async function request(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response | SyncFailure> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await authedFetch(path, { ...init, signal: controller.signal });
    return res.ok ? res : failureFor(res.status);
  } catch {
    return NETWORK_FAILURE;
  } finally {
    clearTimeout(timer);
  }
}

const acceptPhoto = (remote: SyncRow, local: SyncRow | undefined) => acceptPulledPhoto(remote as EntryPhoto, local);

const nonNull = <T,>(v: T | null | undefined): v is T => v != null;

const READERS: { [T in SyncedTable]: (id: string) => SyncedRows[T] | null } = {
  clients: getClient,
  jobs: getJob,
  entries: getEntry,
  entry_photos: getPhoto,
};

function readRows<T extends SyncedTable>(table: T, ids: readonly string[]): SyncedRows[T][] {
  const read = READERS[table] as (id: string) => SyncedRows[T] | null;
  return ids.map(read).filter(nonNull);
}

/**
 * Push every dirty row. After success only the ids whose row is unchanged since it was read
 * are cleared, so an edit made while the request was in flight is sent next time.
 */
export async function pushChanges(): Promise<PushResult> {
  const sent = Object.fromEntries(TABLES.map((t) => [t, readRows(t, getSyncState(t).dirtyIds)])) as {
    [T in SyncedTable]: SyncedRows[T][];
  };
  const missing = Object.fromEntries(
    TABLES.map((t) => {
      const present = new Set(sent[t].map((r) => r.id));
      return [t, getSyncState(t).dirtyIds.filter((id) => !present.has(id))];
    }),
  ) as Record<SyncedTable, string[]>;
  const count = TABLES.reduce((n, t) => n + sent[t].length, 0);
  if (count === 0) {
    for (const t of TABLES) if (missing[t].length) clearDirty(t, missing[t]);
    return { ok: true, sent: 0, accepted: 0, serverTime: null };
  }

  const body: SyncPushRequest = {
    deviceId: getDeviceId(),
    tables: { clients: sent.clients, jobs: sent.jobs, entries: sent.entries, entryPhotos: sent.entry_photos },
  };
  const res = await request('/api/sync/push', { method: 'POST', body });
  if (!(res instanceof Response)) return res;
  let json: { accepted?: unknown; serverTime?: unknown };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return INVALID_FAILURE;
  }

  for (const t of TABLES) {
    const unchanged = sent[t].filter((row: SyncRow) => {
      const current = READERS[t](row.id) as SyncRow | null;
      return !current || rowVersion(current) === rowVersion(row);
    });
    clearDirty(t, [...unchanged.map((r) => r.id), ...missing[t]]);
  }
  return {
    ok: true,
    sent: count,
    accepted: typeof json.accepted === 'number' ? json.accepted : count,
    serverTime: typeof json.serverTime === 'string' ? json.serverTime : null,
  };
}

/**
 * Pull rows changed on the server after `since` (default: the stored cursor; undefined = all
 * rows) and apply them locally in one transaction. Advances every table's `lastPulledAt` to
 * the response's `serverTime` only after the write commits; `applyPull` is idempotent, so a
 * failed or repeated pull is safe.
 */
export async function pullSince(since: string | null | undefined = currentPullCursor()): Promise<PullResult> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await request(`/api/sync/pull${query}`);
  if (!(res instanceof Response)) return res;
  let parsed;
  try {
    parsed = SyncPullResponseSchema.safeParse(await res.json());
  } catch {
    return INVALID_FAILURE;
  }
  if (!parsed.success) return INVALID_FAILURE;
  const { serverTime, tables } = parsed.data;

  const runningId = getRunningEntry()?.id ?? null;
  const changed: SyncedTable[] = [];
  let received = 0;
  let applied = 0;
  let kept = 0;
  let deferred = 0;
  let skippedPhotos = 0;

  db.transaction((tx) => {
    for (const table of TABLES) {
      const pulled = (tables[WIRE[table]] as SyncedRows[typeof table][]).map((r) => normalizeRemoteRow(table, r));
      received += pulled.length;
      if (pulled.length === 0) continue;
      const local = getRowsByIds(table, pulled.map((r) => r.id), tx);
      const plan = planRemoteApply<SyncedRows[typeof table]>(local, pulled, table === 'entry_photos' ? acceptPhoto : undefined);
      let upserts = plan.upserts;
      if (table === 'entries') {
        const guarded = deferConflictingRunning(runningId, upserts as SyncedRows['entries'][]);
        upserts = guarded.apply;
        deferred += guarded.deferred.length;
      }
      kept += plan.kept.length;
      if (table === 'entry_photos') skippedPhotos += plan.skipped.length;
      applied += upsertFromRemote(table, upserts, tx);
      if (upserts.length) changed.push(table);
    }
  });
  if (changed.length) notifyTables(...changed);
  for (const t of TABLES) setLastPulledAt(t, serverTime);
  return { ok: true, received, applied, kept, deferred, skippedPhotos, serverTime };
}

/** "Sync now": push local changes, then pull everything newer from the server. */
export async function syncNow(): Promise<SyncNowResult> {
  const push = await pushChanges();
  if (!push.ok) return { ...push, stage: 'push' };
  const pull = await pullSince();
  if (!pull.ok) return { ...pull, stage: 'pull', sent: push.sent };
  return { ok: true, push, pull };
}
