// Accessibility settings that change how surfaces render (glass vs solid).
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduceTransparency = false;
const listeners = new Set<() => void>();
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  AccessibilityInfo.isReduceTransparencyEnabled()
    .then((value) => {
      reduceTransparency = value;
      listeners.forEach((l) => l());
    })
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value: boolean) => {
    reduceTransparency = value;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  ensureSubscribed();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** iOS "Reduce Transparency": render solid surfaces instead of glass or blur. */
export function useReduceTransparency(): boolean {
  return useSyncExternalStore(subscribe, () => reduceTransparency);
}
