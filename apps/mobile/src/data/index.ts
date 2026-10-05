// Public surface of the data layer. Screens/components import from '@/data' (repositories)
// and '@/hooks/use-*' (reactive reads).
export * from './clients-repo';
export * from './entries-repo';
export * from './maintenance-repo';
export * from './settings-repo';
export { getRowsByIds, normalizeRemoteRow, upsertFromRemote, type SyncedRows } from './remote-repo';
export { clearDirty, getSyncState, setLastPulledAt, type SyncedTable } from './sync-state-repo';
export { ensureDatabaseReady, useDatabaseMigrations, type DatabaseReadyState } from './migrate';
export { createStore, onTablesChanged, useStore, type Store, type TableName } from './store';
export { dayRange, deviceTimeZone, earningsFor } from './time-math';
export { newId } from './ids';
export { seedDemoData } from './seed';
export * from './types';
