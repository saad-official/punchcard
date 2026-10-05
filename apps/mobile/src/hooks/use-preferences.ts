// Device-only UI preferences that the shared `SettingsSchema` has no keys for yet: the
// light/dark override and the business details printed on branded PDFs. Persisted as one
// small JSON blob in SecureStore (sync API, < 2 KB). See docs/mobile-data-api.md gap notes:
// these should move into `settings` (appearance, businessName/Phone/Email) when the schema grows.
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

import { createStore, newId, useStore } from '@/data';

export type AppearancePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  appearance: AppearancePreference;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
};

const KEY = 'punchcard.ui-preferences';

const DEFAULTS: Preferences = { appearance: 'system', businessName: '', businessPhone: '', businessEmail: '' };

function read(): Preferences {
  if (Platform.OS === 'web') return DEFAULTS;
  try {
    const raw = SecureStore.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      appearance: parsed.appearance === 'light' || parsed.appearance === 'dark' ? parsed.appearance : 'system',
      businessName: typeof parsed.businessName === 'string' ? parsed.businessName : '',
      businessPhone: typeof parsed.businessPhone === 'string' ? parsed.businessPhone : '',
      businessEmail: typeof parsed.businessEmail === 'string' ? parsed.businessEmail : '',
    };
  } catch {
    return DEFAULTS;
  }
}

const store = createStore<Preferences>(read());

function applyAppearance(pref: AppearancePreference) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

// Apply the stored override before the first frame renders.
applyAppearance(store.getSnapshot().appearance);

export function usePreferences(): Preferences {
  return useStore(store);
}

export function getPreferences(): Preferences {
  return store.getSnapshot();
}

export function setPreferences(patch: Partial<Preferences>): void {
  const next = { ...store.getSnapshot(), ...patch };
  store.setState(next);
  if (patch.appearance) applyAppearance(patch.appearance);
  if (Platform.OS === 'web') return;
  try {
    SecureStore.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[preferences] save failed', error);
  }
}

const DEVICE_ID_KEY = 'punchcard.device-id';

/** Stable id of this install (sync `deviceId`), created on first use. */
export function getDeviceId(): string {
  try {
    const existing = SecureStore.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = newId();
    SecureStore.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'punchcard-device';
  }
}
