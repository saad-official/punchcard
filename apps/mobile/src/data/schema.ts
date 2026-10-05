// SQLite schema (device). Mirrors docs/spec.md section 4. Column names are snake_case,
// TypeScript keys camelCase. IDs are UUID text, timestamps ISO-8601 UTC strings
// (`Date.prototype.toISOString()`, so lexical order == chronological order), money is
// integer cents. Rows are never hard-deleted by the app: `deleted_at` marks a soft delete
// so sync can propagate it (last-write-wins by `updated_at`).
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { CLIENT_COLOR_NAMES, EntrySourceSchema, type EntrySource } from '@punchcard/shared';

/** Same values as `EntrySourceSchema` in @punchcard/shared. */
export const ENTRY_SOURCES = EntrySourceSchema.options as [EntrySource, ...EntrySource[]];

const createdAt = () => text('created_at').notNull();
const updatedAt = () => text('updated_at').notNull();
const deletedAt = () => text('deleted_at');

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Palette swatch name from `CLIENT_PALETTE` (never a raw hex). */
    color: text('color', { enum: CLIENT_COLOR_NAMES }).notNull(),
    hourlyRateCents: integer('hourly_rate_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    address: text('address'),
    lat: real('lat'),
    lng: real('lng'),
    geofenceRadiusM: integer('geofence_radius_m'),
    archivedAt: text('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('clients_updated_at_idx').on(t.updatedAt)],
);

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    archivedAt: text('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('jobs_client_id_idx').on(t.clientId)],
);

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    jobId: text('job_id').references(() => jobs.id),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    breakSeconds: integer('break_seconds').notNull().default(0),
    /** Set while a break is in progress; folded into break_seconds when it ends (survives app kill). */
    breakStartedAt: text('break_started_at'),
    note: text('note').notNull().default(''),
    mileageKm: real('mileage_km'),
    source: text('source', { enum: ENTRY_SOURCES }).notNull().default('manual'),
    editedNote: text('edited_note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index('entries_started_at_idx').on(t.startedAt),
    index('entries_client_id_idx').on(t.clientId),
    // Spec invariant: at most one running entry (ended_at IS NULL) at a time.
    uniqueIndex('entries_single_running_idx')
      .on(sql`(ended_at IS NULL)`)
      .where(sql`ended_at IS NULL AND deleted_at IS NULL`),
  ],
);

export const entryPhotos = sqliteTable(
  'entry_photos',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => entries.id),
    localUri: text('local_uri').notNull(),
    remoteUrl: text('remote_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('entry_photos_entry_id_idx').on(t.entryId)],
);

/** Key/value settings. `value` is JSON-encoded. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: updatedAt(),
});

/**
 * Sync bookkeeping per synced table. The spec calls the key column `table`; it is
 * `table_name` here because `table` is an SQL keyword.
 */
export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').primaryKey(),
  lastPulledAt: text('last_pulled_at'),
  /** JSON array of row ids changed locally since the last successful push. */
  dirtyIds: text('dirty_ids').notNull().default('[]'),
});

export type ClientRow = typeof clients.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type EntryPhotoRow = typeof entryPhotos.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;
