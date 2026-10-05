# Mobile data layer and native adapters: API for screens

Everything a screen needs from storage or the OS. Screens and components import only from
`@/data`, `@/hooks/use-*` and `@/native/*`; never from `expo-sqlite`, `drizzle-orm`,
`expo-notifications`, `expo-widgets`, `expo-live-updates`, `react-native-purchases` etc.

Domain types (`Client`, `Job`, `Entry`, `EntryPhoto`, `Settings`, `Plan`, `ClientColor`) are the
zod-inferred types from `@punchcard/shared`, re-exported by `@/data`. Pure math (durations,
rounding, pay, weeks, CSV/timesheet models, `clientColorHex`, `formatDuration`, `formatMoney`)
comes straight from `@punchcard/shared`.

Conventions: ids are UUIDv7 strings; timestamps are ISO-8601 UTC strings; money is integer
cents; client `color` is a palette swatch name (`'orange'`, `'teal'`, …), render it with
`clientColorHex(color)`; deletes are soft (`deletedAt`).

## 1. Root layout wiring (do this once)

```tsx
// src/app/_layout.tsx
import { useEffect } from 'react';
import { useDatabaseMigrations } from '@/data';
import { startNativeServices } from '@/native/surface-sync';

export default function RootLayout() {
  const db = useDatabaseMigrations();               // { success, error }
  useEffect(() => (db.success ? startNativeServices() : undefined), [db.success]);
  if (db.error) return <DatabaseErrorScreen error={db.error} />;
  if (!db.success) return null;                     // keep the splash screen up
  return <Tabs />;
}
```

- `apps/mobile/index.ts` is the JS entry (`package.json` `main`). It imports
  `src/native/background-tasks.ts` (geofence task + Android widget handler) before
  `expo-router/entry`, so background launches work without rendering the layout. Do not move
  task definitions into components.
- `startNativeServices({ onAction? })` sets up notification channels/categories, applies a
  Stop/Break/Start pressed while the app was killed, reconciles the Live Activity / Live
  Update with SQLite, then keeps Live Activity / Live Update / widgets / "still clocked in"
  nudge in sync with every repository write and refreshes earnings labels once a minute.
  Screens never call the native surfaces after clock actions: calling the repository is enough.
- Data hooks return empty fallbacks until migrations finish; gate on `success` as above.

## 2. Hooks (reactive reads)

All hooks are `useSyncExternalStore` based: they re-render only when a table they read is
written. Results are referentially stable between writes.

| Hook | Returns | Example |
|---|---|---|
| `useClients({ includeArchived? })` (`@/hooks/use-clients`) | `Client[]` sorted by name | `const clients = useClients();` |
| `useClient(id)` | `Client \| null` | `const client = useClient(params.id);` |
| `useJobs(clientId)` | `Job[]` | `const jobs = useJobs(client?.id);` |
| `useEntries(range, { clientId? })` (`@/hooks/use-entries`) | `EntryWithClient[]` overlapping `[from, to)`, newest first, running included | `const entries = useEntries({ from: week.start, to: week.end });` |
| `useRecentClientIds(limit = 3)` | `string[]` of recently used active clients | `const quick = useRecentClientIds(3);` |
| `useEntryPhotos(entryId)` | `EntryPhoto[]` | `const photos = useEntryPhotos(entry.id);` |
| `useRunningEntry()` (`@/hooks/use-running-entry`) | `RunningEntryState \| null`: `{ entry: EntryWithClient, elapsedSeconds, onBreak, currentBreakSeconds, earningsCents }`, ticks every second, derived from timestamps | `const running = useRunningEntry();` |
| `useTodayTotals()` (`@/hooks/use-today-totals`) | `DayTotals`: `{ totalSeconds, earningsCents, entryCount, byClient[] }` for the local day; ticks while running | `const today = useTodayTotals();` |
| `useSettings()` (`@/hooks/use-settings`) | `Settings` (shared schema, defaults applied) | `const { weekStartsOn, currency } = useSettings();` |
| `useNowSeconds(enabled = true)` (`@/hooks/use-now`) | shared 1 Hz Unix seconds | `const now = useNowSeconds(isRunning);` |
| `useDatabaseMigrations()` (`@/data`) | `{ success, error? }` | see section 1 |
| `usePlan()` (`@/native/purchases`) | `'free' \| 'pro'` (cached offline) | `const plan = usePlan(); canAddClient(plan, clients.length)` |
| `usePurchasesAvailable()` | `boolean` (RevenueCat configured) | `if (!usePurchasesAvailable()) hidePaywallButton();` |

`EntryWithClient = Entry & { clientName, clientColor, hourlyRateCents, currency, jobName }`.
For week ranges use shared `weekRange(isoNow, settings.weekStartsOn, deviceTimeZone())` and pass
`{ from: w.start, to: w.end }`; for a day use `dayRange(date)` from `@/data`. Memoising the range
object is not required (hooks key on the ISO strings).

## 3. Repositories (`@/data`, synchronous, notify hooks)

All functions are synchronous (drizzle over expo-sqlite sync API), wrap writes in a
transaction, mark the row dirty for sync, and notify subscribers.

### Clients and jobs (`clients-repo.ts`)
| Function | Notes / example |
|---|---|
| `listClients({ includeArchived? }): Client[]` | `listClients()` |
| `getClient(id): Client \| null` | |
| `countActiveClients(): number` | gate: `canAddClient(plan, countActiveClients())` |
| `listGeofencedClients(): Client[]` | clients with lat/lng/radius |
| `createClient(input: NewClientInput): Client` | `createClient({ name: 'Smith kitchen', color: 'orange', hourlyRateCents: 6500, currency: 'USD' })` |
| `updateClient(id, patch: ClientPatch): Client \| null` | `updateClient(id, { geofenceRadiusM: 150, lat, lng })` |
| `archiveClient(id)` / `unarchiveClient(id)` / `deleteClient(id)` | soft; entries keep their client |
| `listJobs(clientId, { includeArchived? }): Job[]` | |
| `getJob(id)` / `createJob(clientId, name)` / `renameJob(id, name)` | `createJob(client.id, 'Tiling')` |
| `archiveJob(id)` / `unarchiveJob(id)` / `deleteJob(id)` | |

### Clock and entries (`entries-repo.ts`)
Clock actions run the pure state machine from `@punchcard/shared/running` and persist its
events. Each returns the `ClockTransition` (`{ state, events }`): `events` is empty when
nothing changed, so `if (t.events.length) haptics.clockIn()`.

| Function | Notes / example |
|---|---|
| `clockIn({ clientId, jobId?, source? = 'manual', at? })` | same client+job running: no-op; other job: switches | `clockIn({ clientId })` |
| `switchJob({ clientId, jobId?, source?, at? })` | always ends current and starts new at the same instant | `switchJob({ clientId, jobId })` |
| `clockOut(at?)` | closes an open break first | `clockOut()` |
| `startBreak(at?)` / `endBreak(at?)` / `toggleBreak(at?)` | break state survives app kill (`breakStartedAt`) | `toggleBreak()` |
| `getRunningEntry(): Entry \| null` / `getRunningEntryWithClient()` | non-hook reads | |
| `getEntry(id)` | | |
| `listEntries(range, { clientId? }): EntryWithClient[]` | non-hook version of `useEntries` | |
| `recentClientIds(limit = 3): string[]` | | |
| `getDayTotals(date?, nowIso?, tz?): DayTotals` | non-hook version of `useTodayTotals` | |
| `addManualEntry(input: ManualEntryInput): Entry` | `addManualEntry({ clientId, startedAt, endedAt, breakSeconds: 900 })` |
| `updateEntry(id, patch: EntryPatch, editedNote?)` | audit note shown on exports | `updateEntry(id, { endedAt }, 'Forgot to stop')` |
| `duplicateEntry(id): Entry \| null` | finished entries only | |
| `deleteEntry(id)` / `restoreEntry(id)` | soft delete + undo | |
| `listPhotos(entryId)` / `addPhoto(entryId, localUri)` / `removePhoto(id)` | URIs from `expo-image-picker` (UI may call the picker; it is a plain module) | |

### Settings (`settings-repo.ts`)
`getSettings(): Settings`, `getSetting(key)`, `setSetting(key, value)`, `setSettings(patch)`
(validated with `SettingsSchema`, throws `ZodError` on bad input), `resetSettings(keys?)`,
`DEFAULT_SETTINGS`. Keys: `rounding` (`'none'|'1'|'6'|'15'`), `roundingMode`, `weekStartsOn`
(0–6), `currency`, `nudgeAfterHours`, `accent?`, `onboarded`.
Example: `setSetting('onboarded', true)`.

### Sync bookkeeping (`sync-state-repo.ts`)
`getSyncState(table)` → `{ lastPulledAt, dirtyIds }`, `clearDirty(table, sentIds)`,
`setLastPulledAt(table, serverTime)`. Tables: `clients | jobs | entries | entry_photos`.

### Misc
`dayRange(date?, tz?) → { from, to }`, `deviceTimeZone()`, `earningsFor(seconds, rateCents)`,
`newId()`, `createStore(initial)` / `useStore(store, selector?)` (tiny external store),
`onTablesChanged(tables, listener)`, `seedDemoData({ force?, withRunning? })` (dev only; 3
clients, ~2 weeks of entries, a running entry).

## 4. Native adapters (`@/native/*`)

### `haptics.ts`
`tapLight()`, `clockIn()`, `clockOut()`, `success()`, `warning()`; fire-and-forget.
`onPress={() => { const t = clockIn({ clientId }); if (t.events.length) haptics.clockIn(); }}`

### `notifications.ts`
| Function | Example |
|---|---|
| `setupNotifications(): Promise<void>` | called by `startNativeServices` |
| `getNotificationPermission()` / `requestNotificationPermission()` → `{ status: 'granted'\|'denied'\|'undetermined', canAskAgain }` | onboarding priming: `const p = await requestNotificationPermission(); if (!p.canAskAgain) Linking.openSettings();` |
| `scheduleStillClockedIn(entryId, at, { clientName? })` / `cancelStillClockedIn(entryId?)` | automatic via surface sync (`nudgeAt(entry, settings.nudgeAfterHours)`) |
| `presentGeofenceNudge({ kind, clientId, clientName, entryId? })` | used by the geofence task |
| `registerForPushNotifications(): Promise<PushRegistration>` | `{ ok: true, token }` or `{ ok: false, reason: 'not-a-device'\|'permission-denied'\|'missing-project-id'\|'error' }`; send `token` to `POST /api/devices` when signed in |
| `getEasProjectId(): string \| null` | |
| `addNotificationActionListener(cb) → unsubscribe` | low level; prefer `addStatusActionListener` |
| `consumeLaunchNotificationAction()` | used by `startNativeServices` |

Categories: `running` (actions `stop`, `break`), `geofence` (`start`, `stop`). Android channels:
`nudges` (high), `running` (low, shared with Live Updates).

### `live-status.ts` (`.ios.ts` Live Activity, `.android.ts` Live Update / ongoing notification)
| Function | Notes |
|---|---|
| `startRunningStatus(entry, client)` | `client = { name, color, hourlyRateCents, currency, jobName? }`; an `EntryWithClient` works as `entry` |
| `updateRunningStatus(entry, client)` | starts if missing |
| `endRunningStatus()` | |
| `reconcileRunningStatus(running \| null)` | after relaunch (`getInstances()` on iOS, stored id on Android) |
| `addStatusActionListener(cb) → unsubscribe` | `cb({ action: 'stop'\|'break'\|'start'\|'open', entryId?, clientId?, source: 'live-activity'\|'live-update'\|'notification' })` |

You normally do not call these: `startNativeServices` drives them from the database and handles
actions with `handleStatusAction`. Pass `startNativeServices({ onAction })` to also react in the
UI (e.g. haptics or a toast). `syncNativeSurfaces()` forces a refresh.

iOS: Lock Screen banner (client colour bar, name, job/rate, native `Text(timerInterval:)` elapsed
that keeps ticking while suspended and pauses during breaks, earnings), Dynamic Island compact
(icon + timer), minimal, expanded (client, timer, earnings, Break/Resume + Stop buttons).
Android 16+: Live Update (title = client, text "Running · 1h 12m", status chip "1:12", tap opens
`punchcard://clock`; no action buttons in the library). Android < 16: ongoing notification with
Stop / Break actions.

### `widgets.ts`
`refreshWidgets(snapshot: WidgetSnapshot)`, `refreshWidgetsFromDatabase()`;
`WidgetSnapshot = { todaySeconds, runningClientName?, runningClientColor?, runningSince?, runningBreakSeconds?, breakStartedAt?, lastClientId?, lastClientName?, snapshotAt? }`;
`buildWidgetSnapshot()` in `widget-snapshot.ts`. Called automatically by surface sync.
Widget deep links: tap → `punchcard://clock`; iOS medium widget "Start" →
`punchcard://clock?start=<clientId>` (**the Clock route should read `start` and call
`clockIn({ clientId: start, source: 'widget' })`**); Android 4×2 "Start" button clocks in from the
headless handler without opening the app.

### `geofence.ts` (Pro)
| Function | Example |
|---|---|
| `getAlwaysPermission()` / `requestAlwaysPermission()` → `{ status: 'granted'\|'foreground-only'\|'denied'\|'undetermined'\|'services-disabled', canAskAgain }` | show the priming screen first; on `foreground-only` explain "Always" and offer `Linking.openSettings()` |
| `syncGeofences(clients, plan)` → `{ registered }` or `{ registered: 0, reason: 'plan'\|'no-regions'\|'permission'\|'error' }` | after editing a client's site: `await syncGeofences(listGeofencedClients(), plan)` |
| `stopGeofences()` | |
| `GEOFENCE_TASK = 'PUNCHCARD_GEOFENCE'`, `handleGeofenceEvent(data)` | policy = shared `geofenceNudge` (arrive while idle → Start; leave the running client's site → Stop); 10-minute de-dupe; min radius 100 m; max 20 regions |

### `purchases.ts`
| Function | Example |
|---|---|
| `initPurchases(appUserId?) → Promise<boolean>` | auto-called by `usePlan()`; `false` when no key |
| `usePlan()` / `getPlan()` | |
| `presentPaywall() → 'purchased'\|'restored'\|'cancelled'\|'not-presented'\|'unavailable'\|'error'` | `if ((await presentPaywall()) === 'purchased') haptics.success();` |
| `restorePurchases() → Plan`, `logIn(userId) → Plan`, `logOut() → Plan`, `showManageSubscriptions()` | Settings screen |

Keys: `EXPO_PUBLIC_REVENUECAT_TEST_KEY` (debug/dev-client builds), and for release builds
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (a Test Store key crashes
release builds, so it is ignored there and purchases stay disabled). Entitlement id: `pro`.

### `exports.ts`
`exportCsv(text, filename)` and `exportPdf(html, filename)` → `{ uri, shared }`. Build the text
with shared `toCsv(toCsvRows(...))` / the HTML from `timesheetModel(...)`.
`await exportPdf(html, 'Smith kitchen week 41'); haptics.success();`

## 5. Files

```
apps/mobile/index.ts                         JS entry (background tasks, then expo-router)
src/data/schema.ts, db.ts, migrate.ts         drizzle schema, connection (WAL), migrations
src/data/*-repo.ts, store.ts, types.ts        repositories, change bus + live queries, types
src/hooks/use-*.ts                            data hooks
src/native/*.ts                               adapters (platform forks: .ios.ts / .android.ts)
src/widgets/running-entry.activity.tsx        iOS Live Activity ('widget' function)
src/widgets/today-widget.tsx                  iOS TodayWidget ('widget' function)
src/widgets/today-widget.android.tsx          Android TodayWidget / TodayWidgetWide
src/widgets/widget-task-handler.ts            Android headless widget handler
drizzle/                                      generated migrations (`pnpm --filter mobile db:generate`)
```

Schema changes: edit `src/data/schema.ts`, run `pnpm --filter mobile db:generate`, commit the new
`drizzle/*.sql`, `meta/` and `migrations.js`. `drizzle/migrations.d.ts` is hand-written.
