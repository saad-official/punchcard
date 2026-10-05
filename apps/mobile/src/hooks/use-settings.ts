import { DEFAULT_SETTINGS, getSettings } from '@/data/settings-repo';
import { useLiveQuery } from '@/data/store';
import type { Settings } from '@/data/types';

export { setSetting, setSettings } from '@/data/settings-repo';

/** Current settings (`DEFAULT_SETTINGS` until the database is ready). Write with `setSetting(s)`. */
export function useSettings(): Settings {
  return useLiveQuery('settings', ['settings'], getSettings, DEFAULT_SETTINGS);
}
