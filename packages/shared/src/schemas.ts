import { z } from "zod";
import { isUuid } from "./ids";
import { CLIENT_COLOR_NAMES } from "./palette";

/** ISO-8601 timestamp, `Z` or numeric offset. */
export const IsoTimestamp = z.iso.datetime({ offset: true });
export const IdSchema = z.string().refine(isUuid, "Invalid UUID");
/** Integer minor units (cents). */
export const CentsSchema = z.number().int().nonnegative();
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/, "ISO 4217 code, e.g. USD");
export const ClientColorSchema = z.enum(CLIENT_COLOR_NAMES);
export const PlanSchema = z.enum(["free", "pro"]);
export const EntrySourceSchema = z.enum(["manual", "geofence", "widget", "live_activity"]);
export const RoundingSchema = z.enum(["none", "1", "6", "15"]);
export const RoundingModeSchema = z.enum(["nearest", "up", "down"]);

const syncFields = {
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
  deletedAt: IsoTimestamp.nullish(),
};

export const ClientSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1).max(120),
  color: ClientColorSchema,
  hourlyRateCents: CentsSchema,
  currency: CurrencySchema,
  address: z.string().max(300).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  geofenceRadiusM: z.number().int().positive().max(10_000).nullish(),
  archivedAt: IsoTimestamp.nullish(),
  ...syncFields,
});

export const JobSchema = z.object({
  id: IdSchema,
  clientId: IdSchema,
  name: z.string().trim().min(1).max(120),
  archivedAt: IsoTimestamp.nullish(),
  ...syncFields,
});

export const EntrySchema = z
  .object({
    id: IdSchema,
    clientId: IdSchema,
    jobId: IdSchema.nullish(),
    startedAt: IsoTimestamp,
    endedAt: IsoTimestamp.nullish(),
    breakSeconds: z.number().int().nonnegative(),
    /** Set while a break is in progress on the running entry; cleared (and folded into breakSeconds) when it ends. */
    breakStartedAt: IsoTimestamp.nullish(),
    note: z.string().max(2000).default(""),
    mileageKm: z.number().nonnegative().nullish(),
    source: EntrySourceSchema,
    editedNote: z.string().max(500).nullish(),
    ...syncFields,
  })
  .refine((e) => !e.endedAt || Date.parse(e.endedAt) >= Date.parse(e.startedAt), {
    message: "endedAt must not be before startedAt",
    path: ["endedAt"],
  });

export const EntryPhotoSchema = z.object({
  id: IdSchema,
  entryId: IdSchema,
  localUri: z.string().min(1),
  remoteUrl: z.url().nullish(),
  ...syncFields,
});

export const SettingsSchema = z.object({
  rounding: RoundingSchema.default("none"),
  roundingMode: RoundingModeSchema.default("nearest"),
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn: z.number().int().min(0).max(6).default(1),
  currency: CurrencySchema.default("USD"),
  nudgeAfterHours: z.number().positive().max(24).default(10),
  accent: z.string().optional(),
  onboarded: z.boolean().default(false),
});

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export const DeviceSchema = z.object({
  userId: z.string().min(1),
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  lastSeenAt: IsoTimestamp,
});

export const EntitlementSchema = z.object({
  userId: z.string().min(1),
  plan: PlanSchema,
  source: z.literal("revenuecat"),
  expiresAt: IsoTimestamp.nullish(),
  raw: z.unknown().optional(),
  updatedAt: IsoTimestamp,
});

export const SyncTablesSchema = z.object({
  clients: z.array(ClientSchema).default([]),
  jobs: z.array(JobSchema).default([]),
  entries: z.array(EntrySchema).default([]),
  entryPhotos: z.array(EntryPhotoSchema).default([]),
});

const EMPTY_TABLES = { clients: [], jobs: [], entries: [], entryPhotos: [] };

/** Device → server: rows dirtied since the last push (soft deletes carry `deletedAt`). */
export const SyncPushRequestSchema = z.object({
  deviceId: z.string().min(1),
  tables: SyncTablesSchema.default(EMPTY_TABLES),
});

export const SyncPushResponseSchema = z.object({
  serverTime: IsoTimestamp,
  accepted: z.number().int().nonnegative(),
});

/** Server → device: rows changed since `?since=`; `serverTime` becomes the next `since`. */
export const SyncPullResponseSchema = z.object({
  serverTime: IsoTimestamp,
  tables: SyncTablesSchema.default(EMPTY_TABLES),
});

export type Plan = z.infer<typeof PlanSchema>;
export type EntrySource = z.infer<typeof EntrySourceSchema>;
export type Rounding = z.infer<typeof RoundingSchema>;
export type RoundingMode = z.infer<typeof RoundingModeSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Job = z.infer<typeof JobSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type EntryPhoto = z.infer<typeof EntryPhotoSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type Entitlement = z.infer<typeof EntitlementSchema>;
export type SyncTables = z.infer<typeof SyncTablesSchema>;
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
