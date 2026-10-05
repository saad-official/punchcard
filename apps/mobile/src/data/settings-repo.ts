import { DEFAULT_SETTINGS, SettingsSchema } from '@punchcard/shared';
import { inArray } from 'drizzle-orm';

import { db } from './db';
import { newId, nowIso } from './ids';
import { settings } from './schema';
import { notifyTables } from './store';
import type { Settings } from './types';

export type SettingKey = keyof Settings;

export { DEFAULT_SETTINGS };

/**
 * All settings merged over `DEFAULT_SETTINGS` and validated with the shared zod schema.
 * Unknown or malformed stored values fall back to defaults field by field.
 */
export function getSettings(): Settings {
  const stored: Record<string, unknown> = {};
  for (const row of db.select().from(settings).all()) {
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      // ignore corrupt value; default applies
    }
  }
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...stored });
  if (parsed.success) return parsed.data;
  // Drop only the invalid keys.
  const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  const cleaned = Object.fromEntries(Object.entries(stored).filter(([k]) => !bad.has(k)));
  return SettingsSchema.parse({ ...DEFAULT_SETTINGS, ...cleaned });
}

export function getSetting<K extends SettingKey>(key: K): Settings[K] {
  return getSettings()[key];
}

/** Persist a partial patch (validated). Throws a ZodError on invalid values. */
export function setSettings(patch: Partial<Settings>): Settings {
  const next = SettingsSchema.parse({ ...getSettings(), ...patch });
  const now = nowIso();
  const keys = Object.keys(patch) as SettingKey[];
  db.transaction((tx) => {
    for (const key of keys) {
      const value = JSON.stringify(next[key] ?? null);
      tx.insert(settings)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
        .run();
    }
  });
  notifyTables('settings');
  return next;
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Settings {
  return setSettings({ [key]: value } as Partial<Settings>);
}

/**
 * Stable id of this install (the sync `deviceId`). Created with `newId()` and stored in
 * `settings.deviceId` on first read. Do not call from render: the first call writes.
 */
export function getDeviceId(): string {
  const existing = getSetting('deviceId');
  if (existing) return existing;
  const id = newId();
  setSetting('deviceId', id);
  return id;
}

/** Reset the given keys (or all) to defaults. `deviceId` is regenerated on the next `getDeviceId()`. */
export function resetSettings(keys?: SettingKey[]): void {
  if (keys) db.delete(settings).where(inArray(settings.key, keys)).run();
  else db.delete(settings).run();
  notifyTables('settings');
}
