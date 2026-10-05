// Writes that come from the server (sync pull). Unlike every other repository write these do
// NOT mark rows dirty: the server already has them, pushing them back would only echo.
import { inArray } from 'drizzle-orm';

import { db, type Executor } from './db';
import { clients, entries, entryPhotos, jobs } from './schema';
import { notifyTables } from './store';
import type { SyncedTable } from './sync-state-repo';
import type { Client, Entry, EntryPhoto, Job } from './types';

/** Row type per synced table. */
export type SyncedRows = {
  clients: Client;
  jobs: Job;
  entries: Entry;
  entry_photos: EntryPhoto;
};

const TABLE = { clients, jobs, entries, entry_photos: entryPhotos } as const;

/** SQLite caps bound parameters per statement; stay well below it. */
const CHUNK = 400;

const n = <T,>(v: T | null | undefined): T | null => v ?? null;

/** Wire rows may omit nullish fields; local rows always carry `null`. Normalise so comparisons and updates match. */
export function normalizeRemoteRow<T extends SyncedTable>(table: T, row: SyncedRows[T]): SyncedRows[T] {
  const sync = { createdAt: row.createdAt, updatedAt: row.updatedAt, deletedAt: n(row.deletedAt) };
  switch (table) {
    case 'clients': {
      const c = row as Client;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        hourlyRateCents: c.hourlyRateCents,
        currency: c.currency,
        address: n(c.address),
        lat: n(c.lat),
        lng: n(c.lng),
        geofenceRadiusM: n(c.geofenceRadiusM),
        archivedAt: n(c.archivedAt),
        ...sync,
      } satisfies Client as SyncedRows[T];
    }
    case 'jobs': {
      const j = row as Job;
      return { id: j.id, clientId: j.clientId, name: j.name, archivedAt: n(j.archivedAt), ...sync } satisfies Job as SyncedRows[T];
    }
    case 'entries': {
      const e = row as Entry;
      return {
        id: e.id,
        clientId: e.clientId,
        jobId: n(e.jobId),
        startedAt: e.startedAt,
        endedAt: n(e.endedAt),
        breakSeconds: e.breakSeconds,
        breakStartedAt: n(e.breakStartedAt),
        note: e.note ?? '',
        mileageKm: n(e.mileageKm),
        source: e.source,
        editedNote: n(e.editedNote),
        ...sync,
      } satisfies Entry as SyncedRows[T];
    }
    default: {
      const p = row as EntryPhoto;
      return { id: p.id, entryId: p.entryId, localUri: p.localUri, remoteUrl: n(p.remoteUrl), ...sync } satisfies EntryPhoto as SyncedRows[T];
    }
  }
}

/** Local copies of the given ids (any state, tombstones included), for merging a pull. */
export function getRowsByIds<T extends SyncedTable>(table: T, ids: readonly string[], ex: Executor = db): SyncedRows[T][] {
  const t = TABLE[table];
  const out: SyncedRows[T][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    out.push(...(ex.select().from(t).where(inArray(t.id, chunk)).all() as SyncedRows[T][]));
  }
  return out;
}

function writeRows<T extends SyncedTable>(ex: Executor, table: T, rows: readonly SyncedRows[T][]): void {
  const t = TABLE[table];
  for (const raw of rows) {
    const row = normalizeRemoteRow(table, raw) as Record<string, unknown>;
    const { id: _id, createdAt: _createdAt, ...set } = row;
    // drizzle's per-table insert types differ; the row shape matches the table by construction.
    (ex.insert(t) as unknown as { values: (v: unknown) => { onConflictDoUpdate: (c: unknown) => { run: () => void } } })
      .values(row)
      .onConflictDoUpdate({ target: t.id, set })
      .run();
  }
}

/**
 * Insert or overwrite rows pulled from the server without marking them dirty, then notify the
 * table's hooks. Pass `ex` (a transaction) to batch several tables; notifications are then the
 * caller's job (`notifyTables`). Entries are written finished-first so the single-running index
 * holds when a pull stops one entry and starts another.
 */
export function upsertFromRemote<T extends SyncedTable>(table: T, rows: readonly SyncedRows[T][], ex?: Executor): number {
  if (rows.length === 0) return 0;
  const ordered =
    table === 'entries'
      ? [...rows].sort((a, b) => Number(!(a as Entry).endedAt && !a.deletedAt) - Number(!(b as Entry).endedAt && !b.deletedAt))
      : rows;
  if (ex) writeRows(ex, table, ordered);
  else {
    db.transaction((tx) => writeRows(tx, table, ordered));
    notifyTables(table);
  }
  return rows.length;
}
