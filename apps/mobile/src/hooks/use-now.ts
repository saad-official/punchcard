import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

// One shared 1 Hz clock. It only runs while some component subscribes, ticks on second
// boundaries, and re-syncs immediately when the app returns to the foreground. Elapsed
// time is always derived from stored timestamps, so a paused clock never drifts.
const listeners = new Set<() => void>();
let nowSec = Math.floor(Date.now() / 1000);
let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove(): void } | null = null;

function emit() {
  const next = Math.floor(Date.now() / 1000);
  if (next !== nowSec) {
    nowSec = next;
    listeners.forEach((l) => l());
  }
}

function schedule() {
  timer = setTimeout(
    () => {
      emit();
      schedule();
    },
    1000 - (Date.now() % 1000) + 5,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    nowSec = Math.floor(Date.now() / 1000);
    schedule();
    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') emit();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearTimeout(timer);
      timer = null;
      appStateSub?.remove();
      appStateSub = null;
    }
  };
}

const noopSubscribe = () => () => undefined;
const getNow = () => {
  // Nobody is ticking the clock: refresh lazily so the first render is never stale.
  if (listeners.size === 0) nowSec = Math.floor(Date.now() / 1000);
  return nowSec;
};

/**
 * Current Unix time in whole seconds, re-rendering once per second while `enabled`.
 * When disabled it does not tick.
 */
export function useNowSeconds(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribe : noopSubscribe, getNow);
}
