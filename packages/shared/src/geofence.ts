export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceTransition = "enter" | "exit";

export interface GeofenceNudge {
  kind: "arrived-start" | "left-still-running";
  clientId: string;
}

export interface GeofenceNudgeInput {
  /** The running entry (only its client matters), or null when idle. */
  running: { clientId: string } | null;
  transition: GeofenceTransition | null;
  /** Client whose geofence fired. */
  clientId: string;
}

/** Mean Earth radius (IUGG), metres. */
const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInside(point: LatLng, center: LatLng, radiusM: number): boolean {
  return haversineMeters(point, center) <= radiusM;
}

/** Edge between two inside/outside readings; an unknown previous reading yields no transition. */
export function transition(prevInside: boolean | null | undefined, nowInside: boolean): GeofenceTransition | null {
  if (prevInside === null || prevInside === undefined || prevInside === nowInside) return null;
  return nowInside ? "enter" : "exit";
}

/** Arrived while idle → offer start; left the running client's site → offer stop; otherwise nothing. */
export function geofenceNudge({ running, transition: t, clientId }: GeofenceNudgeInput): GeofenceNudge | null {
  if (t === "enter" && !running) return { kind: "arrived-start", clientId };
  if (t === "exit" && running?.clientId === clientId) return { kind: "left-still-running", clientId };
  return null;
}
