// Job-site lookup for the client editor: address -> coordinates and "where am I now", via the
// platform geocoders in expo-location (no API key; Apple / Google Play services). Both need
// foreground ("While using") location permission; geofencing asks for "Always" separately.
import { formatAddressLabel, formatCoordinates } from '@punchcard/shared';
import * as Location from 'expo-location';

export type GeocodedPlace = { lat: number; lng: number; label: string };

export type GeocodeErrorReason =
  /** Location permission denied (`canAskAgain` false: only system Settings can fix it). */
  | 'permission'
  /** Location services are off device-wide. */
  | 'services-disabled'
  /** No geocoder on this platform (web) or the platform service failed / was rate-limited. */
  | 'unavailable';

export class GeocodeError extends Error {
  constructor(
    readonly reason: GeocodeErrorReason,
    message: string,
    readonly canAskAgain = true,
  ) {
    super(message);
    this.name = 'GeocodeError';
  }
}

/** Fix wait before falling back to the last known position. */
const POSITION_TIMEOUT_MS = 15_000;

async function ensureForegroundPermission(): Promise<void> {
  if (process.env.EXPO_OS === 'web') throw new GeocodeError('unavailable', 'Address lookup works in the phone app.');
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new GeocodeError('services-disabled', 'Location services are off on this phone.', false);
  }
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return;
  const asked = current.canAskAgain ? await Location.requestForegroundPermissionsAsync() : current;
  if (!asked.granted) throw new GeocodeError('permission', 'Location access is off for Punchcard.', asked.canAskAgain);
}

/** Best-effort one-line label for coordinates; falls back to "lat, lng". */
async function labelFor(lat: number, lng: number): Promise<string> {
  try {
    const [first] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    return (first && formatAddressLabel(first)) || formatCoordinates(lat, lng);
  } catch {
    return formatCoordinates(lat, lng);
  }
}

/**
 * Coordinates for a typed address (first platform match) with a readable label for the
 * confirmation row, or null when nothing matches. Throws `GeocodeError` for permission /
 * services / platform failures.
 */
export async function geocodeAddress(address: string): Promise<GeocodedPlace | null> {
  const query = address.trim();
  if (!query) return null;
  await ensureForegroundPermission();
  let results: Location.LocationGeocodedLocation[];
  try {
    results = await Location.geocodeAsync(query);
  } catch (error) {
    // iOS throws for "no result"; both platforms throw when rate-limited or offline.
    const message = error instanceof Error ? error.message : String(error);
    if (/no.?result|not.?found/i.test(message)) return null;
    throw new GeocodeError('unavailable', "Couldn't look up that address. Check your connection and try again.");
  }
  const first = results[0];
  if (!first) return null;
  return { lat: first.latitude, lng: first.longitude, label: await labelFor(first.latitude, first.longitude) };
}

/**
 * The phone's current position (balanced accuracy, ~100 m: enough for a geofence of at least
 * 100 m) with a reverse-geocoded label. Falls back to the last known fix when a fresh one
 * takes too long. Throws `GeocodeError`.
 */
export async function currentPosition(): Promise<GeocodedPlace> {
  await ensureForegroundPermission();
  let position: Location.LocationObject | null = null;
  try {
    position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), POSITION_TIMEOUT_MS)),
    ]);
  } catch {
    position = null;
  }
  position ??= await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
  if (!position) throw new GeocodeError('unavailable', "Couldn't get a location fix. Try again near a window or outside.");
  const { latitude: lat, longitude: lng } = position.coords;
  return { lat, lng, label: await labelFor(lat, lng) };
}
