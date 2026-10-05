import { listEntries, listPhotos, recentClientIds } from '@/data/entries-repo';
import { useLiveQuery } from '@/data/store';
import { toIsoBound } from '@/data/time-math';
import type { DateRange, EntryPhoto, EntryWithClient } from '@/data/types';

const EMPTY: EntryWithClient[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_PHOTOS: EntryPhoto[] = [];

/**
 * Entries overlapping `[range.from, range.to)` (newest first, running entry included) joined
 * with client name/colour/rate and job name. Use `dayRange()` or shared `weekRange()` bounds.
 */
export function useEntries(range: DateRange, opts: { clientId?: string } = {}): EntryWithClient[] {
  const from = toIsoBound(range.from);
  const to = toIsoBound(range.to);
  const clientId = opts.clientId;
  return useLiveQuery(
    `entries:${from}:${to}:${clientId ?? ''}`,
    ['entries', 'clients', 'jobs'],
    () => listEntries({ from, to }, { clientId }),
    EMPTY,
  );
}

/** Ids of the most recently used active clients (idle Clock quick-start cards). */
export function useRecentClientIds(limit = 3): string[] {
  return useLiveQuery(`recent:${limit}`, ['entries', 'clients'], () => recentClientIds(limit), EMPTY_IDS);
}

/** Photos attached to an entry. */
export function useEntryPhotos(entryId: string | null | undefined): EntryPhoto[] {
  return useLiveQuery(
    `photos:${entryId ?? ''}`,
    ['entry_photos'],
    () => (entryId ? listPhotos(entryId) : EMPTY_PHOTOS),
    EMPTY_PHOTOS,
  );
}
