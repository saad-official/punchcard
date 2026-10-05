import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eq } from "drizzle-orm";
import { GET as getPlan } from "@/app/api/me/plan/route";
import { POST as webhook } from "@/app/api/webhooks/revenuecat/route";
import type { DbHandle } from "@/lib/db/client";
import { entitlements, revenuecatEvents } from "@/lib/db/schema";
import { jsonRequest, signUpTestUser, startTestDb, stopTestDb, type TestUser } from "./helpers";

const SECRET = "rc-webhook-test-secret";
let handle: DbHandle;

beforeAll(async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  handle = await startTestDb();
}, 60_000);

afterAll(async () => {
  delete process.env.REVENUECAT_WEBHOOK_SECRET;
  await stopTestDb(handle);
});

let eventCounter = 0;
const DAY = 86_400_000;

function rcEvent(type: string, appUserId: string, overrides: Record<string, unknown> = {}) {
  eventCounter += 1;
  return {
    api_version: "1.0",
    event: {
      id: `evt-${eventCounter}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      app_user_id: appUserId,
      original_app_user_id: appUserId,
      product_id: "punchcard_pro_monthly",
      entitlement_ids: ["pro"],
      environment: "SANDBOX",
      store: "TEST_STORE",
      event_timestamp_ms: Date.now() - (1000 - eventCounter) * 1000,
      expiration_at_ms: Date.now() + 30 * DAY,
      ...overrides,
    },
  };
}

function send(body: unknown, authorization: string | null = `Bearer ${SECRET}`) {
  return webhook(
    jsonRequest("/api/webhooks/revenuecat", {
      body,
      headers: authorization ? { authorization } : {},
    }),
  );
}

async function planOf(who: TestUser) {
  const response = await getPlan(jsonRequest("/api/me/plan", { cookie: who.cookie }));
  return response.json() as Promise<{ plan: string; expiresAt: string | null }>;
}

describe("POST /api/webhooks/revenuecat", () => {
  it("rejects a missing or wrong Authorization header", async () => {
    const user = await signUpTestUser();
    expect((await send(rcEvent("INITIAL_PURCHASE", user.id), null)).status).toBe(401);
    expect((await send(rcEvent("INITIAL_PURCHASE", user.id), "Bearer nope")).status).toBe(401);
    expect((await send(rcEvent("INITIAL_PURCHASE", user.id), SECRET)).status).toBe(401);
    expect((await planOf(user)).plan).toBe("free");
  });

  it("rejects everything when the secret is not configured", async () => {
    const user = await signUpTestUser();
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    try {
      expect((await send(rcEvent("INITIAL_PURCHASE", user.id), "Bearer ")).status).toBe(401);
    } finally {
      process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
    }
  });

  it("rejects a body without an event id with 400", async () => {
    expect((await send({ event: { type: "RENEWAL" } })).status).toBe(400);
  });

  it.each(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"])("%s grants pro until expiration", async (type) => {
    const user = await signUpTestUser();
    const expiration = Date.now() + 7 * DAY;
    const response = await send(rcEvent(type, user.id, { expiration_at_ms: expiration }));
    expect(response.status).toBe(200);
    const plan = await planOf(user);
    expect(plan.plan).toBe("pro");
    expect(plan.expiresAt).toBe(new Date(expiration).toISOString());
  });

  it("CANCELLATION keeps pro until expiration_at_ms, then free", async () => {
    const user = await signUpTestUser();
    await send(rcEvent("INITIAL_PURCHASE", user.id));
    const soon = Date.now() + 2 * DAY;
    await send(rcEvent("CANCELLATION", user.id, { expiration_at_ms: soon }));
    const plan = await planOf(user);
    expect(plan).toMatchObject({ plan: "pro", expiresAt: new Date(soon).toISOString() });

    const lapsed = await signUpTestUser();
    await send(rcEvent("INITIAL_PURCHASE", lapsed.id));
    await send(rcEvent("CANCELLATION", lapsed.id, { expiration_at_ms: Date.now() - 1000 }));
    expect((await planOf(lapsed)).plan).toBe("free");
  });

  it("EXPIRATION drops to free", async () => {
    const user = await signUpTestUser();
    await send(rcEvent("INITIAL_PURCHASE", user.id));
    await send(rcEvent("EXPIRATION", user.id, { expiration_at_ms: Date.now() - 1000 }));
    expect((await planOf(user)).plan).toBe("free");
  });

  it("is idempotent by event id", async () => {
    const user = await signUpTestUser();
    const purchase = rcEvent("INITIAL_PURCHASE", user.id);
    const first = await send(purchase);
    expect(await first.json()).toMatchObject({ ok: true, duplicate: false });
    await send(rcEvent("EXPIRATION", user.id, { expiration_at_ms: Date.now() - 1000 }));
    const replay = await send(purchase);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ ok: true, duplicate: true });
    expect((await planOf(user)).plan).toBe("free");
    const rows = await handle.db.select().from(revenuecatEvents).where(eq(revenuecatEvents.id, purchase.event.id));
    expect(rows).toHaveLength(1);
  });

  it("ignores an event older than the last applied one", async () => {
    const user = await signUpTestUser();
    const now = Date.now();
    await send(rcEvent("EXPIRATION", user.id, { event_timestamp_ms: now, expiration_at_ms: now - 1000 }));
    await send(rcEvent("RENEWAL", user.id, { event_timestamp_ms: now - 60_000 }));
    expect((await planOf(user)).plan).toBe("free");
  });

  it("stores events for unknown app user ids but changes nothing", async () => {
    const purchase = rcEvent("INITIAL_PURCHASE", "$RCAnonymousID:abc123");
    const response = await send(purchase);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, applied: false });
    const [stored] = await handle.db.select().from(revenuecatEvents).where(eq(revenuecatEvents.id, purchase.event.id));
    expect(stored).toMatchObject({ type: "INITIAL_PURCHASE", appUserId: "$RCAnonymousID:abc123" });
    expect(await handle.db.select().from(entitlements).where(eq(entitlements.userId, "$RCAnonymousID:abc123"))).toEqual(
      [],
    );
  });

  it("stores but ignores other event types (TEST, BILLING_ISSUE)", async () => {
    const user = await signUpTestUser();
    expect((await send(rcEvent("TEST", user.id))).status).toBe(200);
    expect((await send(rcEvent("BILLING_ISSUE", user.id))).status).toBe(200);
    expect((await planOf(user)).plan).toBe("free");
  });
});

describe("GET /api/me/plan", () => {
  it("requires a session", async () => {
    expect((await getPlan(jsonRequest("/api/me/plan"))).status).toBe(401);
  });

  it("is free with no entitlement row", async () => {
    const user = await signUpTestUser();
    expect(await planOf(user)).toMatchObject({ plan: "free", expiresAt: null });
  });
});
