import { newIdFrom } from '@punchcard/shared';
import { getRandomBytes } from 'expo-crypto';

/** UUIDv7 (time-ordered) built by `@punchcard/shared` from expo-crypto random bytes. */
export function newId(nowMs: number = Date.now()): string {
  return newIdFrom(Math.floor(nowMs), getRandomBytes(10));
}

/** Canonical timestamp format for every column: ISO-8601 UTC (`...Z`). */
export function toIso(date: Date | number | string = Date.now()): string {
  if (typeof date === 'string') return new Date(Date.parse(date)).toISOString();
  return (typeof date === 'number' ? new Date(date) : date).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}
