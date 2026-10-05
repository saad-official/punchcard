import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from './db';
import { newId, nowIso } from './ids';
import { clients, jobs } from './schema';
import { notifyTables } from './store';
import { markDirty } from './sync-state-repo';
import type { Client, ClientPatch, Job, NewClientInput } from './types';

// ---------------------------------------------------------------------------
// Clients (all reads are synchronous; writes notify the `clients` table)

export function listClients(opts: { includeArchived?: boolean } = {}): Client[] {
  const live = isNull(clients.deletedAt);
  const where = opts.includeArchived ? live : and(live, isNull(clients.archivedAt));
  return db.select().from(clients).where(where).orderBy(asc(clients.name)).all();
}

export function getClient(id: string): Client | null {
  return db.select().from(clients).where(eq(clients.id, id)).get() ?? null;
}

/** Active (not archived, not deleted) clients; feed this to `canAddClient(plan, count)`. */
export function countActiveClients(): number {
  return listClients().length;
}

/** Clients with a site location and radius (geofence candidates). */
export function listGeofencedClients(): Client[] {
  return db
    .select()
    .from(clients)
    .where(
      and(
        isNull(clients.deletedAt),
        isNull(clients.archivedAt),
        isNotNull(clients.lat),
        isNotNull(clients.lng),
        isNotNull(clients.geofenceRadiusM),
      ),
    )
    .all();
}

export function createClient(input: NewClientInput): Client {
  const now = nowIso();
  const row: Client = {
    id: newId(),
    name: input.name.trim(),
    color: input.color,
    hourlyRateCents: Math.max(0, Math.round(input.hourlyRateCents ?? 0)),
    currency: input.currency ?? 'USD',
    address: input.address ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    geofenceRadiusM: input.geofenceRadiusM ?? null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  db.transaction((tx) => {
    tx.insert(clients).values(row).run();
    markDirty(tx, 'clients', [row.id]);
  });
  notifyTables('clients');
  return row;
}

export function updateClient(id: string, patch: ClientPatch): Client | null {
  const set = {
    ...patch,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : null),
    ...(patch.hourlyRateCents !== undefined ? { hourlyRateCents: Math.max(0, Math.round(patch.hourlyRateCents)) } : null),
    updatedAt: nowIso(),
  };
  db.transaction((tx) => {
    tx.update(clients).set(set).where(eq(clients.id, id)).run();
    markDirty(tx, 'clients', [id]);
  });
  notifyTables('clients');
  return getClient(id);
}

function setClientFlag(id: string, field: 'archivedAt' | 'deletedAt', value: string | null): void {
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(clients)
      .set({ [field]: value, updatedAt: now })
      .where(eq(clients.id, id))
      .run();
    markDirty(tx, 'clients', [id]);
  });
  notifyTables('clients');
}

export const archiveClient = (id: string) => setClientFlag(id, 'archivedAt', nowIso());
export const unarchiveClient = (id: string) => setClientFlag(id, 'archivedAt', null);
/** Soft delete. Past entries keep pointing at the row so timesheets still render. */
export const deleteClient = (id: string) => setClientFlag(id, 'deletedAt', nowIso());

// ---------------------------------------------------------------------------
// Jobs (optional sub-labels under a client)

export function listJobs(clientId: string, opts: { includeArchived?: boolean } = {}): Job[] {
  const base = and(eq(jobs.clientId, clientId), isNull(jobs.deletedAt));
  const where = opts.includeArchived ? base : and(base, isNull(jobs.archivedAt));
  return db.select().from(jobs).where(where).orderBy(asc(jobs.name)).all();
}

export function getJob(id: string): Job | null {
  return db.select().from(jobs).where(eq(jobs.id, id)).get() ?? null;
}

export function createJob(clientId: string, name: string): Job {
  const now = nowIso();
  const row: Job = {
    id: newId(),
    clientId,
    name: name.trim(),
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  db.transaction((tx) => {
    tx.insert(jobs).values(row).run();
    markDirty(tx, 'jobs', [row.id]);
  });
  notifyTables('jobs');
  return row;
}

export function renameJob(id: string, name: string): void {
  db.transaction((tx) => {
    tx.update(jobs).set({ name: name.trim(), updatedAt: nowIso() }).where(eq(jobs.id, id)).run();
    markDirty(tx, 'jobs', [id]);
  });
  notifyTables('jobs');
}

function setJobFlag(id: string, field: 'archivedAt' | 'deletedAt', value: string | null): void {
  db.transaction((tx) => {
    tx.update(jobs)
      .set({ [field]: value, updatedAt: nowIso() })
      .where(eq(jobs.id, id))
      .run();
    markDirty(tx, 'jobs', [id]);
  });
  notifyTables('jobs');
}

export const archiveJob = (id: string) => setJobFlag(id, 'archivedAt', nowIso());
export const unarchiveJob = (id: string) => setJobFlag(id, 'archivedAt', null);
export const deleteJob = (id: string) => setJobFlag(id, 'deletedAt', nowIso());
