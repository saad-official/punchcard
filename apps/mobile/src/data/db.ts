import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'punchcard.db';

/**
 * Single connection for the whole JS runtime (also used by headless tasks: geofence,
 * Android widget handler). WAL lets widget/background reads run alongside app writes.
 */
export const sqlite = openDatabaseSync(DATABASE_NAME);
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
/** Anything that can run queries: the db itself or a transaction handle. */
export type Executor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;
