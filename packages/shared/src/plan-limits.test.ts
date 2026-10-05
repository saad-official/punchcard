import { canAddClient, gate, historyFloor, limitsFor, PLAN_LIMITS } from "./plan-limits";

const NOW = "2026-10-05T12:00:00.000Z";

describe("limitsFor", () => {
  it("returns the limits table row for a plan", () => {
    expect(limitsFor("free")).toBe(PLAN_LIMITS.free);
    expect(limitsFor("pro").maxClients).toBe(Infinity);
  });
});

describe("canAddClient", () => {
  it("allows Free up to 3 clients", () => {
    expect(canAddClient("free", 2)).toBe(true);
    expect(canAddClient("free", 3)).toBe(false);
  });
  it("never blocks Pro", () => {
    expect(canAddClient("pro", 10_000)).toBe(true);
  });
});

describe("historyFloor", () => {
  it("is exactly 30 days before now on Free", () => {
    expect(historyFloor("free", NOW)).toBe("2026-09-05T12:00:00.000Z");
  });
  it("is undefined on Pro (unlimited history)", () => {
    expect(historyFloor("pro", NOW)).toBeUndefined();
  });
});

describe("gate", () => {
  it("closes every Pro feature on Free", () => {
    for (const f of ["brandedPdf", "geofences", "sync"] as const) expect(gate("free", f)).toBe(false);
  });
  it("opens every Pro feature on Pro", () => {
    for (const f of ["brandedPdf", "geofences", "sync"] as const) expect(gate("pro", f)).toBe(true);
  });
});
