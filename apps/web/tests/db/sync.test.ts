import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SyncPullResponseSchema, SyncPushResponseSchema } from "@punchcard/shared";
import { and, eq } from "drizzle-orm";
import { POST as push } from "@/app/api/sync/push/route";
import { GET as pull } from "@/app/api/sync/pull/route";
import type { DbHandle } from "@/lib/db/client";
import { clients, entries } from "@/lib/db/schema";
import { jsonRequest, signUpTestUser, startTestDb, stopTestDb, type TestUser } from "./helpers";

let handle: DbHandle;
let sam: TestUser;
let ana: TestUser;

beforeAll(async () => {
  handle = await startTestDb();
  sam = await signUpTestUser("Sam");
  ana = await signUpTestUser("Ana");
}, 60_000);

afterAll(async () => {
  await stopTestDb(handle);
});

const T0 = "2026-10-05T08:00:00.000Z";
const T1 = "2026-10-05T09:00:00.000Z";
const T2 = "2026-10-05T10:00:00.000Z";

let idCounter = 0;
/** A valid UUIDv7-shaped id. */
function uuid(): string {
  idCounter += 1;
  return `0199b0c4-0000-7000-8000-${String(idCounter).padStart(12, "0")}`;
}

function clientRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: "Smith kitchen",
    color: "blue",
    hourlyRateCents: 8500,
    currency: "USD",
    address: "12 Elm St",
    lat: 40.7,
    lng: -74,
    geofenceRadiusM: 150,
    archivedAt: null,
    createdAt: T0,
    updatedAt: T0,
    deletedAt: null,
    ...overrides,
  };
}

function entryRow(id: string, clientId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    clientId,
    jobId: null,
    startedAt: "2026-10-05T07:00:00.000Z",
    endedAt: "2026-10-05T11:30:00.000Z",
    breakSeconds: 1800,
    breakStartedAt: null,
    note: "Replaced trap under sink",
    mileageKm: 12.5,
    source: "manual",
    editedNote: null,
    createdAt: T0,
    updatedAt: T0,
    deletedAt: null,
    ...overrides,
  };
}

async function pushAs(who: TestUser, tables: Record<string, unknown[]>) {
  const response = await push(jsonRequest("/api/sync/push", { body: { deviceId: "test-device", tables }, cookie: who.cookie }));
  return { status: response.status, json: await response.json() };
}

async function pullAs(who: TestUser, since?: string) {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const response = await pull(jsonRequest(`/api/sync/pull${query}`, { cookie: who.cookie }));
  return { status: response.status, json: await response.json() };
}

async function storedClient(who: TestUser, id: string) {
  const [row] = await handle.db
    .select()
    .from(clients)
    .where(and(eq(clients.userId, who.id), eq(clients.id, id)));
  return row;
}

describe("POST /api/sync/push", () => {
  it("rejects requests without a session", async () => {
    const response = await push(jsonRequest("/api/sync/push", { body: { deviceId: "d", tables: {} } }));
    expect(response.status).toBe(401);
  });

  it("rejects rows that fail the shared schema with 400", async () => {
    expect((await pushAs(sam, { clients: [{ id: uuid(), name: "No timestamps" }] })).status).toBe(400);
    expect((await pushAs(sam, { clients: [clientRow("not-a-uuid")] })).status).toBe(400);
    expect((await pushAs(sam, { clients: [clientRow(uuid(), { color: "#123456" })] })).status).toBe(400);
  });

  it("inserts new rows and answers with the shared push response", async () => {
    const id = uuid();
    const { status, json } = await pushAs(sam, { clients: [clientRow(id)] });
    expect(status).toBe(200);
    expect(SyncPushResponseSchema.parse(json)).toEqual({ serverTime: expect.any(String), accepted: 1 });
    const row = await storedClient(sam, id);
    expect(row).toMatchObject({ name: "Smith kitchen", color: "blue", hourlyRateCents: 8500, geofenceRadiusM: 150 });
    expect(row?.updatedAt.toISOString()).toBe(T0);
  });

  it("applies a newer edit (last write wins)", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id)] });
    const { json } = await pushAs(sam, { clients: [clientRow(id, { name: "Smith bathroom", updatedAt: T1 })] });
    expect(json.accepted).toBe(1);
    expect((await storedClient(sam, id))?.name).toBe("Smith bathroom");
  });

  it("ignores an older edit", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id, { name: "Newest", updatedAt: T2 })] });
    const { json } = await pushAs(sam, { clients: [clientRow(id, { name: "Older", updatedAt: T1 })] });
    expect(json.accepted).toBe(0);
    expect((await storedClient(sam, id))?.name).toBe("Newest");
  });

  it("lets the incoming row win a tie (same instant, any offset)", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id, { name: "First", updatedAt: T2 })] });
    const { json } = await pushAs(sam, {
      clients: [clientRow(id, { name: "Second", updatedAt: "2026-10-05T12:00:00.000+02:00" })],
    });
    expect(json.accepted).toBe(1);
    expect((await storedClient(sam, id))?.name).toBe("Second");
  });

  it("a newer delete beats an older edit", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id, { updatedAt: T1, name: "Edited on tablet" })] });
    const { json } = await pushAs(sam, { clients: [clientRow(id, { updatedAt: T0, deletedAt: T2 })] });
    expect(json.accepted).toBe(1);
    expect((await storedClient(sam, id))?.deletedAt?.toISOString()).toBe(T2);
  });

  it("an older delete loses to a newer edit", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id, { updatedAt: T2, name: "Edited later" })] });
    const { json } = await pushAs(sam, { clients: [clientRow(id, { updatedAt: T0, deletedAt: T1 })] });
    expect(json.accepted).toBe(0);
    const row = await storedClient(sam, id);
    expect(row?.deletedAt).toBeNull();
    expect(row?.name).toBe("Edited later");
  });

  it("refuses rows stamped more than a day in the future", async () => {
    const id = uuid();
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const { json } = await pushAs(sam, { clients: [clientRow(id, { updatedAt: future })] });
    expect(json.accepted).toBe(0);
    expect(await storedClient(sam, id)).toBeUndefined();
  });

  it("keeps accounts apart even when ids collide", async () => {
    const id = uuid();
    await pushAs(sam, { clients: [clientRow(id, { name: "Sam's client" })] });
    const { json } = await pushAs(ana, { clients: [clientRow(id, { name: "Ana's client", updatedAt: T2 })] });
    expect(json.accepted).toBe(1);
    expect((await storedClient(sam, id))?.name).toBe("Sam's client");
    expect((await storedClient(ana, id))?.name).toBe("Ana's client");
  });

  it("syncs clients, jobs, entries and photos in one push", async () => {
    const clientId = uuid();
    const jobId = uuid();
    const entryId = uuid();
    const photoId = uuid();
    const { status, json } = await pushAs(sam, {
      clients: [clientRow(clientId)],
      jobs: [{ id: jobId, clientId, name: "Rough-in", archivedAt: null, createdAt: T0, updatedAt: T0, deletedAt: null }],
      entries: [entryRow(entryId, clientId, { jobId, source: "live_activity" })],
      entryPhotos: [
        { id: photoId, entryId, localUri: "file:///photo.jpg", remoteUrl: null, createdAt: T0, updatedAt: T0, deletedAt: null },
      ],
    });
    expect(status).toBe(200);
    expect(json.accepted).toBe(4);
    const [entry] = await handle.db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, sam.id), eq(entries.id, entryId)));
    expect(entry).toMatchObject({ jobId, breakSeconds: 1800, mileageKm: 12.5, source: "live_activity" });
    expect(entry?.endedAt?.toISOString()).toBe("2026-10-05T11:30:00.000Z");
  });

  it("accepts a running entry on a break", async () => {
    const entryId = uuid();
    const { json } = await pushAs(sam, {
      entries: [entryRow(entryId, uuid(), { endedAt: null, breakStartedAt: "2026-10-05T09:30:00.000Z" })],
    });
    expect(json.accepted).toBe(1);
    const [entry] = await handle.db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, sam.id), eq(entries.id, entryId)));
    expect(entry?.breakStartedAt?.toISOString()).toBe("2026-10-05T09:30:00.000Z");
  });
});

describe("GET /api/sync/pull", () => {
  it("rejects requests without a session", async () => {
    expect((await pull(jsonRequest("/api/sync/pull"))).status).toBe(401);
  });

  it("rejects an unparseable since", async () => {
    expect((await pullAs(sam, "yesterday")).status).toBe(400);
  });

  it("returns only the caller's rows, tombstones included, in the shared shape", async () => {
    const fresh = await signUpTestUser("Puller");
    const liveId = uuid();
    const goneId = uuid();
    const entryId = uuid();
    await pushAs(fresh, {
      clients: [clientRow(liveId), clientRow(goneId, { deletedAt: T1, updatedAt: T1 })],
      entries: [entryRow(entryId, liveId)],
    });
    await pushAs(ana, { clients: [clientRow(uuid(), { name: "Not yours" })] });

    const { status, json } = await pullAs(fresh);
    expect(status).toBe(200);
    const parsed = SyncPullResponseSchema.parse(json);
    expect(parsed.tables.clients.map((r) => r.id).sort()).toEqual([liveId, goneId].sort());
    expect(parsed.tables.clients.find((r) => r.id === goneId)).toEqual(clientRow(goneId, { deletedAt: T1, updatedAt: T1 }));
    expect(parsed.tables.entries).toEqual([entryRow(entryId, liveId)]);
    expect(json.tables.clients[0]).not.toHaveProperty("userId");
    expect(parsed.tables.jobs).toEqual([]);
  });

  it("returns rows changed after since, using the previous serverTime as the cursor", async () => {
    const fresh = await signUpTestUser("Incremental");
    const oldId = uuid();
    await pushAs(fresh, { clients: [clientRow(oldId)] });
    // Back-date the first write well before the cursor.
    await handle.db
      .update(clients)
      .set({ serverUpdatedAt: new Date(Date.now() - 60_000) })
      .where(eq(clients.userId, fresh.id));
    const first = await pullAs(fresh);
    expect(first.json.tables.clients.map((r: { id: string }) => r.id)).toEqual([oldId]);
    expect(Date.parse(first.json.serverTime)).toBeLessThanOrEqual(Date.now());

    const newId = uuid();
    await pushAs(fresh, { clients: [clientRow(newId)] });
    const second = await pullAs(fresh, first.json.serverTime);
    expect(second.json.tables.clients.map((r: { id: string }) => r.id)).toEqual([newId]);
  });
});
