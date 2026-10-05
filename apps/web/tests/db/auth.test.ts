import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eq } from "drizzle-orm";
import { requireUser } from "@/app/api/_lib/session";
import { isApiError } from "@/app/api/_lib/respond";
import { AUTH_COOKIE_PREFIX, getAuth, trustedOrigins } from "@/lib/auth/server";
import type { DbHandle } from "@/lib/db/client";
import { account, clients, devices, entitlements, user } from "@/lib/db/schema";
import { jsonRequest, signUpTestUser, startTestDb, stopTestDb } from "./helpers";

let handle: DbHandle;

beforeAll(async () => {
  handle = await startTestDb();
}, 60_000);

afterAll(async () => {
  await stopTestDb(handle);
});

describe("Better Auth on PGlite", () => {
  it("signs up with email + password into the punchcard schema with a hashed password", async () => {
    const created = await signUpTestUser("Ana Electric");
    const [stored] = await handle.db.select().from(user).where(eq(user.id, created.id));
    expect(stored).toMatchObject({ name: "Ana Electric", email: created.email, emailVerified: false });
    const [credential] = await handle.db.select().from(account).where(eq(account.userId, created.id));
    expect(credential?.providerId).toBe("credential");
    expect(credential?.password).not.toContain("correct horse");
  });

  it("issues session cookies with the punchcard prefix", async () => {
    const created = await signUpTestUser();
    expect(created.cookie).toContain(`${AUTH_COOKIE_PREFIX}.session_token=`);
  });

  it("deleting the account removes the user's synced data, devices and plan", async () => {
    const created = await signUpTestUser("Leaving");
    const now = new Date();
    await handle.db.insert(clients).values({
      id: "c-1",
      userId: created.id,
      name: "Gone soon",
      color: "blue",
      createdAt: now,
      updatedAt: now,
    });
    await handle.db.insert(devices).values({ userId: created.id, expoPushToken: "ExponentPushToken[leaving]", platform: "ios" });
    await handle.db.insert(entitlements).values({ userId: created.id, plan: "pro" });

    const auth = await getAuth();
    await auth.api.deleteUser({ body: { password: "correct horse battery" }, headers: new Headers({ cookie: created.cookie }) });

    expect(await handle.db.select().from(user).where(eq(user.id, created.id))).toEqual([]);
    expect(await handle.db.select().from(clients).where(eq(clients.userId, created.id))).toEqual([]);
    expect(await handle.db.select().from(devices).where(eq(devices.userId, created.id))).toEqual([]);
    expect(await handle.db.select().from(entitlements).where(eq(entitlements.userId, created.id))).toEqual([]);
  });

  it("trusts the app scheme and localhost", () => {
    const origins = trustedOrigins();
    expect(origins).toContain("punchcard://");
    expect(origins).toContain("http://localhost:3600");
  });
});

describe("requireUser", () => {
  it("returns the session user for a valid session cookie", async () => {
    const created = await signUpTestUser();
    const sessionUser = await requireUser(jsonRequest("/api/me/plan", { cookie: created.cookie }));
    expect(sessionUser.id).toBe(created.id);
  });

  it("throws a 401 ApiError without a session", async () => {
    const error = await requireUser(jsonRequest("/api/me/plan")).catch((e: unknown) => e);
    expect(isApiError(error) && error.status).toBe(401);
  });

  it("throws a 401 ApiError for a forged cookie", async () => {
    const error = await requireUser(
      jsonRequest("/api/me/plan", { cookie: `${AUTH_COOKIE_PREFIX}.session_token=forged.value` }),
    ).catch((e: unknown) => e);
    expect(isApiError(error) && error.status).toBe(401);
  });
});
