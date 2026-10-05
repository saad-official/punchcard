import {
  ClientSchema,
  DEFAULT_SETTINGS,
  DeviceSchema,
  EntitlementSchema,
  EntryPhotoSchema,
  EntrySchema,
  JobSchema,
  SettingsSchema,
  SyncPullResponseSchema,
  SyncPushRequestSchema,
  SyncPushResponseSchema,
} from "./schemas";

const ID = "0199b3a0-0000-7000-8000-000000000001";
const ID2 = "0199b3a0-0000-7000-8000-000000000002";
const T = "2026-10-05T13:00:00.000Z";

const client = {
  id: ID,
  name: "Smith kitchen",
  color: "orange",
  hourlyRateCents: 6500,
  currency: "CAD",
  createdAt: T,
  updatedAt: T,
};

const entry = {
  id: ID2,
  clientId: ID,
  startedAt: T,
  breakSeconds: 0,
  source: "manual",
  createdAt: T,
  updatedAt: T,
};

describe("ClientSchema", () => {
  it("parses a minimal client and defaults note-like optionals to absent", () => {
    const c = ClientSchema.parse(client);
    expect(c.name).toBe("Smith kitchen");
    expect(c.archivedAt).toBeUndefined();
  });
  it("accepts a geofenced client with nulls for unset columns", () => {
    expect(
      ClientSchema.safeParse({ ...client, lat: 43.65, lng: -79.38, geofenceRadiusM: 150, address: null, deletedAt: null }).success,
    ).toBe(true);
  });
  it("rejects a colour outside the palette", () => {
    expect(ClientSchema.safeParse({ ...client, color: "#FF0000" }).success).toBe(false);
  });
  it("rejects fractional or negative money", () => {
    expect(ClientSchema.safeParse({ ...client, hourlyRateCents: 65.5 }).success).toBe(false);
    expect(ClientSchema.safeParse({ ...client, hourlyRateCents: -1 }).success).toBe(false);
  });
  it("rejects a non-ISO currency and a non-ISO timestamp", () => {
    expect(ClientSchema.safeParse({ ...client, currency: "cad" }).success).toBe(false);
    expect(ClientSchema.safeParse({ ...client, createdAt: "yesterday" }).success).toBe(false);
  });
  it("rejects an empty name and a non-uuid id", () => {
    expect(ClientSchema.safeParse({ ...client, name: "  " }).success).toBe(false);
    expect(ClientSchema.safeParse({ ...client, id: "abc" }).success).toBe(false);
  });
  it("rejects out-of-range coordinates", () => {
    expect(ClientSchema.safeParse({ ...client, lat: 91 }).success).toBe(false);
  });
});

describe("JobSchema", () => {
  it("parses a job under a client", () => {
    expect(JobSchema.parse({ id: ID2, clientId: ID, name: "Backsplash", createdAt: T, updatedAt: T }).name).toBe("Backsplash");
  });
});

describe("EntrySchema", () => {
  it("parses a running entry and defaults note to empty", () => {
    const e = EntrySchema.parse(entry);
    expect(e.endedAt).toBeUndefined();
    expect(e.note).toBe("");
  });
  it("accepts every source", () => {
    for (const source of ["manual", "geofence", "widget", "live_activity"]) {
      expect(EntrySchema.safeParse({ ...entry, source }).success).toBe(true);
    }
  });
  it("rejects an unknown source and negative break seconds", () => {
    expect(EntrySchema.safeParse({ ...entry, source: "watch" }).success).toBe(false);
    expect(EntrySchema.safeParse({ ...entry, breakSeconds: -5 }).success).toBe(false);
  });
  it("rejects an entry that ends before it starts", () => {
    expect(EntrySchema.safeParse({ ...entry, endedAt: "2026-10-05T12:00:00.000Z" }).success).toBe(false);
  });
  it("accepts timestamps with an offset", () => {
    expect(EntrySchema.safeParse({ ...entry, startedAt: "2026-10-05T09:00:00-04:00", endedAt: "2026-10-05T14:00:00Z" }).success).toBe(true);
  });
});

describe("EntryPhotoSchema", () => {
  it("parses a local-only photo", () => {
    expect(EntryPhotoSchema.safeParse({ id: ID, entryId: ID2, localUri: "file:///p.jpg", createdAt: T, updatedAt: T }).success).toBe(true);
  });
});

describe("SettingsSchema", () => {
  it("fills every default from an empty object", () => {
    expect(SettingsSchema.parse({})).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ rounding: "none", roundingMode: "nearest", nudgeAfterHours: 10 });
  });
  it("accepts each rounding increment and mode", () => {
    for (const rounding of ["none", "1", "6", "15"]) expect(SettingsSchema.safeParse({ rounding }).success).toBe(true);
    for (const roundingMode of ["nearest", "up", "down"]) expect(SettingsSchema.safeParse({ roundingMode }).success).toBe(true);
  });
  it("rejects a 5-minute increment and weekStartsOn 7", () => {
    expect(SettingsSchema.safeParse({ rounding: "5" }).success).toBe(false);
    expect(SettingsSchema.safeParse({ weekStartsOn: 7 }).success).toBe(false);
  });
});

describe("DeviceSchema and EntitlementSchema", () => {
  it("parses a device", () => {
    expect(DeviceSchema.safeParse({ userId: "u1", expoPushToken: "ExponentPushToken[x]", platform: "android", lastSeenAt: T }).success).toBe(true);
  });
  it("parses a pro entitlement and rejects an unknown plan", () => {
    const ent = { userId: "u1", plan: "pro", source: "revenuecat", expiresAt: null, updatedAt: T };
    expect(EntitlementSchema.safeParse(ent).success).toBe(true);
    expect(EntitlementSchema.safeParse({ ...ent, plan: "team" }).success).toBe(false);
  });
});

describe("sync payloads", () => {
  it("defaults every table to an empty array in a push", () => {
    const req = SyncPushRequestSchema.parse({ deviceId: "d1" });
    expect(req.tables).toEqual({ clients: [], jobs: [], entries: [], entryPhotos: [] });
  });
  it("carries soft-deleted rows in a push", () => {
    const req = SyncPushRequestSchema.parse({ deviceId: "d1", tables: { entries: [{ ...entry, deletedAt: T }] } });
    expect(req.tables.entries[0]?.deletedAt).toBe(T);
  });
  it("validates rows inside a pull response", () => {
    expect(SyncPullResponseSchema.safeParse({ serverTime: T, tables: { clients: [client] } }).success).toBe(true);
    expect(SyncPullResponseSchema.safeParse({ serverTime: T, tables: { clients: [{ ...client, color: "mauve" }] } }).success).toBe(false);
  });
  it("parses a push response", () => {
    expect(SyncPushResponseSchema.parse({ serverTime: T, accepted: 3 }).accepted).toBe(3);
  });
});
