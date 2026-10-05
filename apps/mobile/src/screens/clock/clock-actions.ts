import { elapsedSeconds } from '@punchcard/shared';

import { showToast } from '@/components/toast';
import { compactDuration } from '@/constants/format';
import { clockIn, clockOut, getRunningEntry, updateEntry } from '@/data';
import * as haptics from '@/native/haptics';

/** Start the clock for a client (optionally a job) with clock-in haptics. */
export function startClock(clientId: string, jobId: string | null = null, source: 'manual' | 'widget' = 'manual') {
  const t = clockIn({ clientId, jobId, source });
  if (t.events.length) haptics.clockIn();
  return t;
}

/** Clock out with success haptics and an undo toast that reopens the entry. */
export function stopClock() {
  const entry = getRunningEntry();
  if (!entry) return;
  const worked = elapsedSeconds(entry, new Date().toISOString());
  const t = clockOut();
  if (!t.events.length) return;
  haptics.success();
  showToast({
    message: `Clocked out · ${compactDuration(worked)}`,
    actionLabel: 'Undo',
    onAction: () => {
      if (!getRunningEntry()) updateEntry(entry.id, { endedAt: null });
    },
  });
}
