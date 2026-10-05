/** The address parts a platform geocoder returns (expo-location `LocationGeocodedAddress`). */
export interface AddressParts {
  name?: string | null;
  streetNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  /** Android only: the platform's own one-line address. */
  formattedAddress?: string | null;
}

const clean = (v: string | null | undefined) => (v ?? "").trim();

/** One-line label for a reverse-geocoded place ("12 Harbour St, Sydney, NSW, 2000"), or null when empty. */
export function formatAddressLabel(parts: AddressParts): string | null {
  const formatted = clean(parts.formattedAddress);
  if (formatted) return formatted;
  const street = [clean(parts.streetNumber), clean(parts.street)].filter(Boolean).join(" ");
  const pieces = [street || clean(parts.name), clean(parts.city) || clean(parts.subregion), clean(parts.region), clean(parts.postalCode)];
  const unique = pieces.filter((p, i) => p && pieces.indexOf(p) === i);
  if (unique.length) return unique.join(", ");
  return clean(parts.country) || null;
}

/** "lat, lng" with five decimals (about a metre), for showing a pin without an address. */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
