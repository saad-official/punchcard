/**
 * Server side of the sync contract defined in `@punchcard/shared`
 * (`SyncPushRequestSchema`, `SyncPushResponseSchema`, `SyncPullResponseSchema`,
 * merge helpers in shared/src/sync.ts).
 *
 * Push (`POST /api/sync/push`, body `{ deviceId, tables: { clients, jobs,
 * entries, entryPhotos } }`): each row is merged against the stored copy of
 * the same (account, id) with `pickWinner(stored, incoming)`: the later
 * `rowVersion` (max of `updatedAt` / `deletedAt`, compared as instants) wins,
 * ties go to the incoming row, so a newer delete beats an older edit and a
 * newer edit beats an older delete. Rows whose version is more than a day
 * ahead of the server clock are refused (a wrong device clock must not win
 * every future conflict). Answer: `{ serverTime, accepted }`.
 *
 * Pull (`GET /api/sync/pull?since=<serverTime>`): the caller's rows written
 * on the server after `since` (all rows when omitted), tombstones included,
 * as `{ serverTime, tables }`. The returned `serverTime` is the next `since`;
 * it lags the server clock by a few seconds so a push that committed while a
 * pull ran is sent again next time instead of being missed (devices apply
 * pulled rows with `applyPull`, which is idempotent).
 */

export const SYNC_TABLES = ["clients", "jobs", "entries", "entryPhotos"] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** Max rows per table in one push. */
export const MAX_PUSH_ROWS = 2000;
/** How far the pull cursor (`serverTime`) lags the server clock. */
export const PULL_OVERLAP_MS = 5_000;
/** Row versions further than this ahead of the server clock are refused. */
export const MAX_CLOCK_SKEW_MS = 86_400_000;
