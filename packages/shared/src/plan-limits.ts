export type Plan = "free" | "pro";

/** Feature gates per plan. Free is generous enough to be useful; Pro removes the ceilings. */
export const PLAN_LIMITS = {
  free: { maxClients: 3, historyDays: 30, brandedPdf: false, geofences: false, sync: false },
  pro: { maxClients: Infinity, historyDays: Infinity, brandedPdf: true, geofences: true, sync: true },
} as const satisfies Record<Plan, Record<string, number | boolean>>;

export type PlanLimits = (typeof PLAN_LIMITS)[Plan];

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function canAddClient(plan: Plan, currentCount: number): boolean {
  return currentCount < limitsFor(plan).maxClients;
}
