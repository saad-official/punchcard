/**
 * Postgres schema (docs/spec.md section 4). Every table, including Better
 * Auth's, lives in the `punchcard` Postgres schema so the database can be
 * dedicated or shared with sibling apps.
 *
 * The device is the source of truth (local-first SQLite). The `clients`,
 * `jobs`, `entries` and `entry_photos` tables mirror it for sync, column for
 * column with the `@punchcard/shared` zod schemas (`Client`, `Job`, `Entry`,
 * `EntryPhoto`):
 * - ids are UUIDv7 strings generated on the device; the primary key is
 *   `(user_id, id)` so one account can never collide with (or overwrite)
 *   another account's rows, whatever ids a client sends;
 * - `updated_at` / `deleted_at` are device times; the later of the two is the
 *   row version that decides last-write-wins (`rowVersion` in shared/sync.ts);
 * - `deleted_at` is a soft delete (tombstone) that sync propagates;
 * - `clients.color` is a `CLIENT_PALETTE` swatch name, not a hex value;
 * - `server_updated_at` is set by the server on every accepted write and is
 *   the cursor for `GET /api/sync/pull?since=` (device clocks may be skewed,
 *   the server clock is monotonic enough for a cursor).
 * There are no foreign keys between mirror tables: devices push tables in
 * any order and a job may arrive before its client.
 */
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const punchcard = pgSchema("punchcard");

const tz = (name: string) => timestamp(name, { withTimezone: true });

// ---------------------------------------------------------------------------
// Enums (value lists exported for zod schemas)
// ---------------------------------------------------------------------------

export const PLANS = ["free", "pro"] as const;
export const PLATFORMS = ["ios", "android"] as const;
export const ENTRY_SOURCES = ["manual", "geofence", "widget", "live_activity"] as const;

export const planEnum = punchcard.enum("plan", PLANS);
export const platformEnum = punchcard.enum("platform", PLATFORMS);
export const entrySourceEnum = punchcard.enum("entry_source", ENTRY_SOURCES);

// ---------------------------------------------------------------------------
// Better Auth core schema (v1.7). JS keys are Better Auth's field names (the
// drizzle adapter looks columns up by them); column names are snake_case.
// ---------------------------------------------------------------------------

export const user = punchcard.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = punchcard.table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: tz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = punchcard.table(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tz("access_token_expires_at"),
    refreshTokenExpiresAt: tz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = punchcard.table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tz("expires_at").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Push devices and plan entitlements
// ---------------------------------------------------------------------------

/** One row per Expo push token. Re-registering a token from another account moves it. */
export const devices = punchcard.table(
  "devices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull().unique(),
    platform: platformEnum("platform").notNull(),
    lastSeenAt: tz("last_seen_at").notNull().defaultNow(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("devices_user_id_idx").on(t.userId)],
);

/**
 * Mirror of the RevenueCat `pro` entitlement. `plan` + `expires_at` give the
 * effective plan (pro only while `expires_at` is null or in the future);
 * `event_at` is the RevenueCat event time of the last applied event, so
 * out-of-order deliveries never roll the plan back.
 */
export const entitlements = punchcard.table("entitlements", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  source: text("source").notNull().default("revenuecat"),
  expiresAt: tz("expires_at"),
  eventAt: tz("event_at"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  updatedAt: tz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Every RevenueCat webhook delivery, keyed by event id (idempotency + audit). */
export const revenuecatEvents = punchcard.table(
  "revenuecat_events",
  {
    id: text("id").primaryKey(),
    receivedAt: tz("received_at").notNull().defaultNow(),
    type: text("type").notNull(),
    appUserId: text("app_user_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [index("revenuecat_events_app_user_id_idx").on(t.appUserId)],
);

// ---------------------------------------------------------------------------
// Sync mirrors of the device tables
// ---------------------------------------------------------------------------

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

/** Columns every mirror table shares. */
const mirrorColumns = () => ({
  id: text("id").notNull(),
  userId: userId(),
  createdAt: tz("created_at").notNull(),
  updatedAt: tz("updated_at").notNull(),
  deletedAt: tz("deleted_at"),
  serverUpdatedAt: tz("server_updated_at").notNull().defaultNow(),
});

export const clients = punchcard.table(
  "clients",
  {
    ...mirrorColumns(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    hourlyRateCents: integer("hourly_rate_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geofenceRadiusM: integer("geofence_radius_m"),
    archivedAt: tz("archived_at"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("clients_user_server_updated_idx").on(t.userId, t.serverUpdatedAt),
  ],
);

export const jobs = punchcard.table(
  "jobs",
  {
    ...mirrorColumns(),
    clientId: text("client_id").notNull(),
    name: text("name").notNull(),
    archivedAt: tz("archived_at"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("jobs_user_server_updated_idx").on(t.userId, t.serverUpdatedAt),
  ],
);

export const entries = punchcard.table(
  "entries",
  {
    ...mirrorColumns(),
    clientId: text("client_id").notNull(),
    jobId: text("job_id"),
    startedAt: tz("started_at").notNull(),
    endedAt: tz("ended_at"),
    breakSeconds: integer("break_seconds").notNull().default(0),
    /** Set while a break is in progress on the running entry. */
    breakStartedAt: tz("break_started_at"),
    note: text("note").notNull().default(""),
    mileageKm: doublePrecision("mileage_km"),
    source: entrySourceEnum("source").notNull().default("manual"),
    editedNote: text("edited_note"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("entries_user_server_updated_idx").on(t.userId, t.serverUpdatedAt),
    index("entries_user_started_idx").on(t.userId, t.startedAt),
  ],
);

export const entryPhotos = punchcard.table(
  "entry_photos",
  {
    ...mirrorColumns(),
    entryId: text("entry_id").notNull(),
    /** Device-local file URI (meaningful only on the device that took the photo). */
    localUri: text("local_uri").notNull(),
    remoteUrl: text("remote_url"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("entry_photos_user_server_updated_idx").on(t.userId, t.serverUpdatedAt),
  ],
);
