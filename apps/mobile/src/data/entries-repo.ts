import {
  clockIn as clockInTransition,
  clockOut as clockOutTransition,
  endBreak as endBreakTransition,
  isOnBreak,
  startBreak as startBreakTransition,
  switchJob as switchJobTransition,
  type ClockTransition,
} from '@punchcard/shared';
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';

import { db, type Executor } from './db';
import { newId, nowIso, toIso } from './ids';
import { clients, entries, entryPhotos, jobs } from './schema';
import { notifyTables } from './store';
import { markDirty } from './sync-state-repo';
import { dayRange, deviceTimeZone, earningsFor, toIsoBound, workedSecondsOnDay } from './time-math';
import type {
  DateRange,
  DayTotals,
  Entry,
  EntryPatch,
  EntryPhoto,
  EntrySource,
  EntryWithClient,
  ManualEntryInput,
} from './types';

export type { ClockTransition } from '@punchcard/shared';

// ---------------------------------------------------------------------------
// Row mapping

type EntryInsert = typeof entries.$inferInsert;

function toRow(e: Entry): EntryInsert {
  return {
    id: e.id,
    clientId: e.clientId,
    jobId: e.jobId ?? null,
    startedAt: e.startedAt,
    endedAt: e.endedAt ?? null,
    breakSeconds: e.breakSeconds,
    breakStartedAt: e.breakStartedAt ?? null,
    note: e.note ?? '',
    mileageKm: e.mileageKm ?? null,
    source: e.source,
    editedNote: e.editedNote ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    deletedAt: e.deletedAt ?? null,
  };
}

function upsertEntry(ex: Executor, e: Entry): void {
  const { id: _id, createdAt: _createdAt, ...rest } = toRow(e);
  ex.insert(entries).values(toRow(e)).onConflictDoUpdate({ target: entries.id, set: rest }).run();
}

const withClientColumns = {
  entry: entries,
  clientName: clients.name,
  clientColor: clients.color,
  hourlyRateCents: clients.hourlyRateCents,
  currency: clients.currency,
  jobName: jobs.name,
};

type JoinedRow = {
  entry: Entry;
  clientName: string;
  clientColor: EntryWithClient['clientColor'];
  hourlyRateCents: number;
  currency: string;
  jobName: string | null;
};

const flatten = ({ entry, ...rest }: JoinedRow): EntryWithClient => ({ ...entry, ...rest });

// ---------------------------------------------------------------------------
// Reads

export function getEntry(id: string): Entry | null {
  return db.select().from(entries).where(eq(entries.id, id)).get() ?? null;
}

/** The single running entry (ended_at IS NULL), or null when idle. */
export function getRunningEntry(): Entry | null {
  return (
    db
      .select()
      .from(entries)
      .where(and(isNull(entries.endedAt), isNull(entries.deletedAt)))
      .get() ?? null
  );
}

export function getRunningEntryWithClient(): EntryWithClient | null {
  const row = db
    .select(withClientColumns)
    .from(entries)
    .innerJoin(clients, eq(entries.clientId, clients.id))
    .leftJoin(jobs, eq(entries.jobId, jobs.id))
    .where(and(isNull(entries.endedAt), isNull(entries.deletedAt)))
    .get();
  return row ? flatten(row) : null;
}

/** Entries overlapping `[from, to)` (running entry included), newest first, with client display fields. */
export function listEntries(range: DateRange, opts: { clientId?: string } = {}): EntryWithClient[] {
  const from = toIsoBound(range.from);
  const to = toIsoBound(range.to);
  const conditions = [
    isNull(entries.deletedAt),
    lt(entries.startedAt, to),
    or(isNull(entries.endedAt), gt(entries.endedAt, from)),
  ];
  if (opts.clientId) conditions.push(eq(entries.clientId, opts.clientId));
  return db
    .select(withClientColumns)
    .from(entries)
    .innerJoin(clients, eq(entries.clientId, clients.id))
    .leftJoin(jobs, eq(entries.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(entries.startedAt))
    .all()
    .map(flatten);
}

/** Most recently used active clients (for the idle Clock screen quick-start cards and widgets). */
export function recentClientIds(limit = 3): string[] {
  const lastStart = sql<string>`max(${entries.startedAt})`;
  return db
    .select({ clientId: entries.clientId, lastStart })
    .from(entries)
    .innerJoin(clients, eq(entries.clientId, clients.id))
    .where(and(isNull(entries.deletedAt), isNull(clients.deletedAt), isNull(clients.archivedAt)))
    .groupBy(entries.clientId)
    .orderBy(desc(lastStart))
    .limit(limit)
    .all()
    .map((r) => r.clientId);
}

/** Totals for the local day containing `date`, measuring a running entry up to `now`. */
export function getDayTotals(date: Date = new Date(), now: string = nowIso(), tz: string = deviceTimeZone()): DayTotals {
  const range = dayRange(date, tz);
  const byClient = new Map<string, DayTotals['byClient'][number]>();
  let totalSeconds = 0;
  let totalCents = 0;
  const list = listEntries(range);
  for (const e of list) {
    const seconds = workedSecondsOnDay(e, range, now, tz);
    const cents = earningsFor(seconds, e.hourlyRateCents);
    totalSeconds += seconds;
    totalCents += cents;
    const cur = byClient.get(e.clientId) ?? {
      clientId: e.clientId,
      clientName: e.clientName,
      clientColor: e.clientColor,
      currency: e.currency,
      seconds: 0,
      earningsCents: 0,
    };
    cur.seconds += seconds;
    cur.earningsCents += cents;
    byClient.set(e.clientId, cur);
  }
  return {
    totalSeconds,
    earningsCents: totalCents,
    entryCount: list.length,
    byClient: [...byClient.values()].sort((a, b) => b.seconds - a.seconds),
  };
}

// ---------------------------------------------------------------------------
// Clock (pure transitions from @punchcard/shared, persisted here)

function persist(transition: ClockTransition): ClockTransition {
  if (transition.events.length === 0) return transition;
  db.transaction((tx) => {
    // Events are ordered (break.ended → entry.ended → entry.started), so the previous
    // entry is closed before the new one is inserted and the single-running index holds.
    for (const event of transition.events) upsertEntry(tx, event.entry);
    markDirty(tx, 'entries', [...new Set(transition.events.map((e) => e.entry.id))]);
  });
  notifyTables('entries');
  return transition;
}

const clockState = () => ({ running: getRunningEntry() });

export type ClockInInput = { clientId: string; jobId?: string | null; source?: EntrySource; at?: Date | string };

/** Start (or switch to) a client/job. Same client+job already running → no events. */
export function clockIn({ clientId, jobId = null, source = 'manual', at }: ClockInInput): ClockTransition {
  return persist(clockInTransition(clockState(), { id: newId(), clientId, jobId, source, now: toIso(at) }));
}

/** End the running entry and start another at the same instant (or just start when idle). */
export function switchJob({ clientId, jobId = null, source, at }: ClockInInput): ClockTransition {
  return persist(switchJobTransition(clockState(), { id: newId(), clientId, jobId, source, now: toIso(at) }));
}

export function clockOut(at?: Date | string): ClockTransition {
  return persist(clockOutTransition(clockState(), { now: toIso(at) }));
}

export function startBreak(at?: Date | string): ClockTransition {
  return persist(startBreakTransition(clockState(), { now: toIso(at) }));
}

export function endBreak(at?: Date | string): ClockTransition {
  return persist(endBreakTransition(clockState(), { now: toIso(at) }));
}

/** Break button: starts a break, or ends the current one. */
export function toggleBreak(at?: Date | string): ClockTransition {
  return isOnBreak(getRunningEntry()) ? endBreak(at) : startBreak(at);
}

// ---------------------------------------------------------------------------
// Timesheet edits

export function addManualEntry(input: ManualEntryInput): Entry {
  const now = nowIso();
  const entry: Entry = {
    id: newId(),
    clientId: input.clientId,
    jobId: input.jobId ?? null,
    startedAt: toIso(input.startedAt),
    endedAt: toIso(input.endedAt),
    breakSeconds: Math.max(0, Math.round(input.breakSeconds ?? 0)),
    breakStartedAt: null,
    note: input.note ?? '',
    mileageKm: input.mileageKm ?? null,
    source: 'manual',
    editedNote: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  db.transaction((tx) => {
    tx.insert(entries).values(toRow(entry)).run();
    markDirty(tx, 'entries', [entry.id]);
  });
  notifyTables('entries');
  return entry;
}

/** Edit an entry. `editedNote` is the audit note shown on exports ("Forgot to stop"). */
export function updateEntry(id: string, patch: EntryPatch, editedNote?: string | null): Entry | null {
  const set: Partial<EntryInsert> = { updatedAt: nowIso() };
  if (patch.clientId !== undefined) set.clientId = patch.clientId;
  if (patch.jobId !== undefined) set.jobId = patch.jobId;
  if (patch.startedAt !== undefined) set.startedAt = toIso(patch.startedAt);
  if (patch.endedAt !== undefined) set.endedAt = patch.endedAt === null ? null : toIso(patch.endedAt);
  if (patch.breakSeconds !== undefined) set.breakSeconds = Math.max(0, Math.round(patch.breakSeconds));
  if (patch.note !== undefined) set.note = patch.note;
  if (patch.mileageKm !== undefined) set.mileageKm = patch.mileageKm;
  if (editedNote !== undefined) set.editedNote = editedNote;
  db.transaction((tx) => {
    tx.update(entries).set(set).where(eq(entries.id, id)).run();
    markDirty(tx, 'entries', [id]);
  });
  notifyTables('entries');
  return getEntry(id);
}

/** Copy a finished entry (new id, same times/client) — timesheet context menu "Duplicate". */
export function duplicateEntry(id: string): Entry | null {
  const src = getEntry(id);
  if (!src || !src.endedAt) return null;
  return addManualEntry({
    clientId: src.clientId,
    jobId: src.jobId,
    startedAt: src.startedAt,
    endedAt: src.endedAt,
    breakSeconds: src.breakSeconds,
    note: src.note,
    mileageKm: src.mileageKm,
  });
}

function setDeleted(id: string, deletedAt: string | null): void {
  db.transaction((tx) => {
    tx.update(entries).set({ deletedAt, updatedAt: nowIso() }).where(eq(entries.id, id)).run();
    markDirty(tx, 'entries', [id]);
  });
  notifyTables('entries');
}

/** Soft delete (sync propagates it). */
export const deleteEntry = (id: string) => setDeleted(id, nowIso());
/** Undo for `deleteEntry`. Throws if it would create a second running entry. */
export const restoreEntry = (id: string) => setDeleted(id, null);

// ---------------------------------------------------------------------------
// Photos

export function listPhotos(entryId: string): EntryPhoto[] {
  return db
    .select()
    .from(entryPhotos)
    .where(and(eq(entryPhotos.entryId, entryId), isNull(entryPhotos.deletedAt)))
    .orderBy(asc(entryPhotos.createdAt))
    .all();
}

/** Attach a photo by local file URI (e.g. from expo-image-picker). */
export function addPhoto(entryId: string, localUri: string): EntryPhoto {
  const now = nowIso();
  const row: EntryPhoto = {
    id: newId(),
    entryId,
    localUri,
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  db.transaction((tx) => {
    tx.insert(entryPhotos)
      .values({ ...row, remoteUrl: null, deletedAt: null })
      .run();
    markDirty(tx, 'entry_photos', [row.id]);
  });
  notifyTables('entry_photos');
  return row;
}

export function removePhoto(id: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(entryPhotos).set({ deletedAt: now, updatedAt: now }).where(eq(entryPhotos.id, id)).run();
    markDirty(tx, 'entry_photos', [id]);
  });
  notifyTables('entry_photos');
}
