import { getRunningEntry } from '@/data/entries-repo';
import { useLiveQuery } from '@/data/store';

const isRunning = () => getRunningEntry() != null;

/**
 * True while an entry is running. No 1-second tick: re-renders only when the answer flips
 * (a boolean snapshot), so idle/running layout switches stay cheap. Use `useRunningEntry()`
 * for the live elapsed time.
 */
export function useIsRunning(): boolean {
  return useLiveQuery('is-running', ['entries'], isRunning, false);
}
