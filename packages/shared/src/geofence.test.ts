import { geofenceNudge, haversineMeters, isInside, transition } from "./geofence";

const TORONTO = { lat: 43.6532, lng: -79.3832 };
const MONTREAL = { lat: 45.5019, lng: -73.5674 };
const C1 = "client-1";
const C2 = "client-2";

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters(TORONTO, TORONTO)).toBe(0);
  });
  it("measures one degree of latitude as about 111.2 km", () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });
  it("measures Toronto to Montreal as about 504 km and is symmetric", () => {
    const d = haversineMeters(TORONTO, MONTREAL);
    expect(d / 1000).toBeGreaterThan(500);
    expect(d / 1000).toBeLessThan(510);
    expect(haversineMeters(MONTREAL, TORONTO)).toBeCloseTo(d, 6);
  });
  it("handles the antimeridian", () => {
    expect(haversineMeters({ lat: 0, lng: 179.999 }, { lat: 0, lng: -179.999 })).toBeLessThan(250);
  });
});

describe("isInside", () => {
  it("is true within the radius and on the boundary", () => {
    const near = { lat: TORONTO.lat + 0.0009, lng: TORONTO.lng }; // ~100 m north
    expect(isInside(near, TORONTO, 150)).toBe(true);
    expect(isInside(TORONTO, TORONTO, 0)).toBe(true);
  });
  it("is false outside the radius", () => {
    const far = { lat: TORONTO.lat + 0.0018, lng: TORONTO.lng }; // ~200 m north
    expect(isInside(far, TORONTO, 150)).toBe(false);
  });
});

describe("transition", () => {
  it("reports enter and exit", () => {
    expect(transition(false, true)).toBe("enter");
    expect(transition(true, false)).toBe("exit");
  });
  it("is null when nothing changed", () => {
    expect(transition(true, true)).toBeNull();
    expect(transition(false, false)).toBeNull();
  });
  it("is null when the previous state is unknown (no spurious first-fix nudge)", () => {
    expect(transition(null, true)).toBeNull();
    expect(transition(undefined, false)).toBeNull();
  });
});

describe("geofenceNudge", () => {
  it("offers a start when arriving while idle", () => {
    expect(geofenceNudge({ running: null, transition: "enter", clientId: C1 })).toEqual({ kind: "arrived-start", clientId: C1 });
  });
  it("offers a stop when leaving the running client's site", () => {
    expect(geofenceNudge({ running: { clientId: C1 }, transition: "exit", clientId: C1 })).toEqual({ kind: "left-still-running", clientId: C1 });
  });
  it("stays quiet when leaving a different client's site", () => {
    expect(geofenceNudge({ running: { clientId: C2 }, transition: "exit", clientId: C1 })).toBeNull();
  });
  it("stays quiet when arriving while already running", () => {
    expect(geofenceNudge({ running: { clientId: C2 }, transition: "enter", clientId: C1 })).toBeNull();
  });
  it("stays quiet when leaving while idle or with no transition", () => {
    expect(geofenceNudge({ running: null, transition: "exit", clientId: C1 })).toBeNull();
    expect(geofenceNudge({ running: { clientId: C1 }, transition: null, clientId: C1 })).toBeNull();
  });
});
