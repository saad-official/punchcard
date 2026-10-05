/** IDs are UUIDv7 strings generated on device; this module validates and formats them. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TIMESTAMP = 2 ** 48 - 1;

/** True for an RFC 9562 UUID (versions 1–8, variant 10xx), any case. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function hex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

/**
 * Format a UUIDv7 from a millisecond timestamp and at least 10 random bytes
 * (the caller supplies them, e.g. from expo-crypto), so output is deterministic.
 */
export function newIdFrom(timestampMs: number, randomBytes: Uint8Array): string {
  if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > MAX_TIMESTAMP) {
    throw new RangeError("timestampMs must be an integer between 0 and 2^48 - 1");
  }
  if (randomBytes.length < 10) throw new RangeError("newIdFrom needs at least 10 random bytes");
  const r = (i: number) => randomBytes[i] ?? 0;
  const bytes: number[] = [];
  for (let shift = 40; shift >= 0; shift -= 8) bytes.push(Math.floor(timestampMs / 2 ** shift) % 256);
  bytes.push(0x70 | (r(0) & 0x0f), r(1), 0x80 | (r(2) & 0x3f));
  for (let i = 3; i < 10; i++) bytes.push(r(i));
  const h = bytes.map(hex).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The embedded millisecond timestamp of a UUIDv7, or null for any other id. */
export function uuidV7Timestamp(id: string): number | null {
  if (!isUuid(id) || id[14] !== "7") return null;
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}
