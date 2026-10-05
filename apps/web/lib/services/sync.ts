import "server-only";
import {
  ClientSchema,
  EntryPhotoSchema,
  EntrySchema,
  JobSchema,
  pickWinner,
  rowVersion,
  SyncPushRequestSchema,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncRow,
  type SyncTables,
} from "@punchcard/shared";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, entries, entryPhotos, jobs } from "@/lib/db/schema";
import { MAX_CLOCK_SKEW_MS, MAX_PUSH_ROWS, PULL_OVERLAP_MS, SYNC_TABLES, type SyncTable } from "@/lib/sync/contract";

/** Merge rules: see lib/sync/contract.ts. */

/** The shared push request, capped per table. */
export const pushRequestSchema = SyncPushRequestSchema.refine(
  (body) => SYNC_TABLES.every((name) => body.tables[name].length <= MAX_PUSH_ROWS),
  { message: `At most ${MAX_PUSH_ROWS} rows per table per push.`, path: ["tables"] },
);

/**
 * The four mirror tables share their sync columns (`id`, `userId`,
 * `updatedAt`, `deletedAt`, `serverUpdatedAt`) and their remaining columns
 * are exactly the shared schema's keys, so one table type stands in for all.
 */
type MirrorTable = typeof clients;
const TABLES: Record<SyncTable, MirrorTable> = {
  clients,
  jobs: jobs as unknown as MirrorTable,
  entries: entries as unknown as MirrorTable,
  entryPhotos: entryPhotos as unknown as MirrorTable,
};

/** Wire keys per table, straight from the shared zod schemas. */
const WIRE_KEYS: Record<SyncTable, string[]> = {
  clients: Object.keys(ClientSchema.shape),
  jobs: Object.keys(JobSchema.shape),
  entries: Object.keys(EntrySchema.shape),
  entryPhotos: Object.keys(EntryPhotoSchema.shape),
};

const TIMESTAMP_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "archivedAt",
  "startedAt",
  "endedAt",
  "breakStartedAt",
]);

type WireRow = SyncRow & Record<string, unknown>;

/** Shared wire row -> column values (ISO strings become Dates, absent optionals become null). */
export function wireToColumns(table: SyncTable, row: WireRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WIRE_KEYS[table]) {
    const value = row[key];
    if (TIMESTAMP_KEYS.has(key)) out[key] = typeof value === "string" ? new Date(value) : null;
    else out[key] = value ?? null;
  }
  return out;
}

/** Stored row -> shared wire row (Dates become ISO strings; server-only columns dropped). */
export function columnsToWire(table: SyncTable, row: Record<string, unknown>): WireRow {
  const out: Record<string, unknown> = {};
  for (const key of WIRE_KEYS[table]) {
    const value = row[key];
    out[key] = value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return out as WireRow;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function applyTable(tx: Tx, name: SyncTable, userId: string, rows: WireRow[], now: Date): Promise<number> {
  if (rows.length === 0) return 0;
  const table = TABLES[name];
  const ids = [...new Set(rows.map((row) => row.id))];
  const existing = await tx
    .select()
    .from(table)
    .where(and(eq(table.userId, userId), inArray(table.id, ids)));
  const stored = new Map<string, WireRow>(existing.map((row) => [row.id, columnsToWire(name, row)]));
  const limit = now.getTime() + MAX_CLOCK_SKEW_MS;

  let accepted = 0;
  for (const incoming of rows) {
    if (rowVersion(incoming) > limit) continue;
    const current = stored.get(incoming.id);
    if (current && pickWinner(current, incoming) !== incoming) continue;
    const values = { ...wireToColumns(name, incoming), serverUpdatedAt: now } as Partial<typeof table.$inferInsert>;
    await tx
      .insert(table)
      .values({ ...values, userId } as typeof table.$inferInsert)
      .onConflictDoUpdate({ target: [table.userId, table.id], set: values });
    stored.set(incoming.id, incoming);
    accepted += 1;
  }
  return accepted;
}

export async function pushChanges(
  db: Db,
  userId: string,
  body: SyncPushRequest,
  now = new Date(),
): Promise<SyncPushResponse> {
  return db.transaction(async (tx) => {
    let accepted = 0;
    for (const name of SYNC_TABLES) {
      accepted += await applyTable(tx, name, userId, body.tables[name] as WireRow[], now);
    }
    return { serverTime: now.toISOString(), accepted };
  });
}

export async function pullChanges(
  db: Db,
  userId: string,
  since: Date | undefined,
  now = new Date(),
): Promise<SyncPullResponse> {
  const after = since ?? new Date(0);
  const tables = {} as Record<SyncTable, WireRow[]>;
  for (const name of SYNC_TABLES) {
    const table = TABLES[name];
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.serverUpdatedAt, after)))
      .orderBy(asc(table.serverUpdatedAt), asc(table.id));
    tables[name] = rows.map((row) => columnsToWire(name, row));
  }
  // The cursor lags the clock (never moving backwards) so a push committing
  // during this pull is re-sent next time rather than skipped.
  const cursor = Math.max(after.getTime(), now.getTime() - PULL_OVERLAP_MS);
  return { serverTime: new Date(cursor).toISOString(), tables: tables as unknown as SyncTables };
}
