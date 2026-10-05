import type { Plan } from "./schemas";
import type { IsoString } from "./tz";

export type { Plan };

/** Feature gates per plan. Free is generous enough to be useful; Pro removes the ceilings. */
export const PLAN_LIMITS = {
  free: { maxClients: 3, historyDays: 30, brandedPdf: false, geofences: false, sync: false },
  pro: { maxClients: Infinity, historyDays: Infinity, brandedPdf: true, geofences: true, sync: true },
} as const satisfies Record<Plan, Record<string, number | boolean>>;

export type PlanLimits = (typeof PLAN_LIMITS)[Plan];
export type GatedFeature = "brandedPdf" | "geofences" | "sync";

const DAY_MS = 86_400_000;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function canAddClient(plan: Plan, currentCount: number): boolean {
  return currentCount < limitsFor(plan).maxClients;
}

/** Earliest visible instant of history: Free → `historyDays` before now; Pro → undefined (unlimited). */
export function historyFloor(plan: Plan, now: IsoString): IsoString | undefined {
  const days = limitsFor(plan).historyDays;
  if (!Number.isFinite(days)) return undefined;
  return new Date(Date.parse(now) - days * DAY_MS).toISOString();
}

/** Whether a Pro-gated feature is available on `plan`. */
export function gate(plan: Plan, feature: GatedFeature): boolean {
  return limitsFor(plan)[feature];
}
