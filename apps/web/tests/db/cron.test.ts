import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eq } from "drizzle-orm";
import { GET as daily } from "@/app/api/cron/daily/route";
import { GET as health } from "@/app/api/health/route";
import type { DbHandle } from "@/lib/db/client";
import { clients, devices, entries } from "@/lib/db/schema";
import { runDailyJob, type PushSender } from "@/lib/services/daily";
import { jsonRequest, signUpTestUser, startTestDb, stopTestDb } from "./helpers";

const SECRET = "cron-test-secret";
const MONDAY = new Date("2026-10-05T06:00:00Z");
const TUESDAY = new Date("2026-10-06T06:00:00Z");
let handle: DbHandle;

beforeAll(async () => {
  process.env.CRON_SECRET = SECRET;
  handle = await startTestDb();
}, 60_000);

afterAll(async () => {
  delete process.env.CRON_SECRET;
  await stopTestDb(handle);
});

function cronRequest(authorization?: string) {
  return jsonRequest("/api/cron/daily", { headers: authorization ? { authorization } : {} });
}

describe("GET /api/cron/daily", () => {
  it("rejects a missing or wrong bearer secret", async () => {
    expect((await daily(cronRequest())).status).toBe(401);
    expect((await daily(cronRequest("Bearer wrong"))).status).toBe(401);
  });

  it("rejects everything when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    try {
      expect((await daily(cronRequest("Bearer "))).status).toBe(401);
    } finally {
      process.env.CRON_SECRET = SECRET;
    }
  });

  it("runs the keep-alive with the right secret", async () => {
    const response = await daily(cronRequest(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, keepAlive: true });
  });
});

describe("runDailyJob", () => {
  it("does not send summaries on days other than Monday", async () => {
    const send = vi.fn<PushSender>(async () => []);
    const result = await runDailyJob({ now: TUESDAY, send });
    expect(result.weekly).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it("on Monday sends one summary per device of users who worked last week", async () => {
    const worker = await signUpTestUser("Worker");
    const idle = await signUpTestUser("Idle");
    const base = { createdAt: MONDAY, updatedAt: MONDAY };
    await handle.db.insert(clients).values([
      { ...base, id: "c-smith", userId: worker.id, name: "Smith kitchen", color: "blue" },
      { ...base, id: "c-patel", userId: worker.id, name: "Patel rewire", color: "green" },
    ]);
    await handle.db.insert(entries).values([
      {
        ...base,
        id: "e1",
        userId: worker.id,
        clientId: "c-smith",
        startedAt: new Date("2026-09-29T08:00:00Z"),
        endedAt: new Date("2026-09-29T16:00:00Z"),
        breakSeconds: 1800,
      },
      {
        ...base,
        id: "e2",
        userId: worker.id,
        clientId: "c-patel",
        startedAt: new Date("2026-09-30T08:00:00Z"),
        endedAt: new Date("2026-09-30T10:00:00Z"),
      },
    ]);
    await handle.db.insert(devices).values([
      { userId: worker.id, expoPushToken: "ExponentPushToken[worker-phone]", platform: "ios" },
      { userId: worker.id, expoPushToken: "ExponentPushToken[worker-tablet]", platform: "android" },
      { userId: idle.id, expoPushToken: "ExponentPushToken[idle-phone]", platform: "ios" },
    ]);

    const send = vi.fn<PushSender>(async (messages) =>
      messages.map((m) =>
        m.to === "ExponentPushToken[worker-tablet]"
          ? { status: "error" as const, message: "gone", details: { error: "DeviceNotRegistered" as const } }
          : { status: "ok" as const, id: "ticket" },
      ),
    );
    const result = await runDailyJob({ now: MONDAY, send });

    expect(result.weekly).toMatchObject({ users: 1, messages: 2, removedDevices: 1 });
    const messages = send.mock.calls.flatMap(([batch]) => batch);
    expect(messages.map((m) => m.to).sort()).toEqual(["ExponentPushToken[worker-phone]", "ExponentPushToken[worker-tablet]"]);
    expect(messages[0]).toMatchObject({
      title: "Last week: 9.5 h on the clock",
      body: "Top client: Smith kitchen (7.5 h). Open Punchcard to send the timesheet.",
      data: { url: "punchcard://timesheet" },
    });
    // DeviceNotRegistered tokens are pruned.
    expect(await handle.db.select().from(devices).where(eq(devices.expoPushToken, "ExponentPushToken[worker-tablet]"))).toEqual(
      [],
    );
  });
});

describe("GET /api/health", () => {
  it("answers without auth or database", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, service: "punchcard" });
  });
});
