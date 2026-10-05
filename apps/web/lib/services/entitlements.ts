import "server-only";
import type { Plan } from "@punchcard/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import { entitlements, revenuecatEvents, user } from "@/lib/db/schema";

/**
 * RevenueCat -> plan mirror. The app sets RevenueCat's app user id to the
 * Better Auth user id after sign-in, so `event.app_user_id` names our user.
 * Events for ids we do not know (anonymous `$RCAnonymousID:...`, other apps)
 * are stored for audit and otherwise ignored.
 */

export const GRANTING_EVENTS = ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"] as const;
export const ENDING_EVENTS = ["EXPIRATION", "CANCELLATION"] as const;

export const revenueCatBodySchema = z.object({
  api_version: z.string().optional(),
  event: z
    .object({
      id: z.string().min(1).max(200),
      type: z.string().min(1).max(64),
      app_user_id: z.string().max(500).nullish(),
      expiration_at_ms: z.number().nullish(),
      event_timestamp_ms: z.number().nullish(),
    })
    .loose(),
});
export type RevenueCatBody = z.infer<typeof revenueCatBodySchema>;

type Entitlement = typeof entitlements.$inferSelect;

/** Pro only while the entitlement has not expired. */
export function effectivePlan(row: Pick<Entitlement, "plan" | "expiresAt"> | undefined, now = new Date()): Plan {
  if (!row || row.plan !== "pro") return "free";
  if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return "free";
  return "pro";
}

export type PlanState = { plan: Plan; expiresAt: string | null; source: string | null };

export async function getPlanState(db: Db, userId: string, now = new Date()): Promise<PlanState> {
  const [row] = await db.select().from(entitlements).where(eq(entitlements.userId, userId)).limit(1);
  return {
    plan: effectivePlan(row, now),
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    source: row?.source ?? null,
  };
}

/** The entitlement change an event implies, or null when it implies none. */
export function planChangeFor(event: RevenueCatBody["event"]): { plan: Plan; expiresAt: Date | null } | null {
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  if ((GRANTING_EVENTS as readonly string[]).includes(event.type)) return { plan: "pro", expiresAt };
  if (event.type === "EXPIRATION") return { plan: "free", expiresAt };
  // Auto-renew turned off (or refund): Pro stays until the paid period ends.
  if (event.type === "CANCELLATION" && expiresAt) return { plan: "pro", expiresAt };
  return null;
}

export type WebhookOutcome = { duplicate: boolean; applied: boolean };

export async function recordRevenueCatEvent(db: Db, body: RevenueCatBody): Promise<WebhookOutcome> {
  const { event } = body;
  const appUserId = event.app_user_id ?? null;
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(revenuecatEvents)
      .values({ id: event.id, type: event.type, appUserId, payload: body as Record<string, unknown> })
      .onConflictDoNothing()
      .returning({ id: revenuecatEvents.id });
    if (inserted.length === 0) return { duplicate: true, applied: false };

    const change = planChangeFor(event);
    if (!change || !appUserId) return { duplicate: false, applied: false };
    const [known] = await tx.select({ id: user.id }).from(user).where(eq(user.id, appUserId)).limit(1);
    if (!known) return { duplicate: false, applied: false };

    const eventAt = new Date(event.event_timestamp_ms ?? Date.now());
    const [current] = await tx.select().from(entitlements).where(eq(entitlements.userId, appUserId)).limit(1);
    if (current?.eventAt && current.eventAt.getTime() > eventAt.getTime()) return { duplicate: false, applied: false };

    const values = {
      plan: change.plan,
      expiresAt: change.expiresAt,
      eventAt,
      source: "revenuecat",
      raw: event as Record<string, unknown>,
    };
    await tx
      .insert(entitlements)
      .values({ userId: appUserId, ...values })
      .onConflictDoUpdate({ target: entitlements.userId, set: { ...values, updatedAt: new Date() } });
    return { duplicate: false, applied: true };
  });
}
