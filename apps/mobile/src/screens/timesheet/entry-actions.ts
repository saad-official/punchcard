import { router } from 'expo-router';

import { showToast } from '@/components/toast';
import { deleteEntry, duplicateEntry, restoreEntry, type EntryWithClient } from '@/data';
import * as haptics from '@/native/haptics';

export function editEntry(entry: Pick<EntryWithClient, 'id'>) {
  router.push({ pathname: '/entry-editor', params: { id: entry.id } });
}

export function duplicate(entry: EntryWithClient) {
  const copy = duplicateEntry(entry.id);
  if (!copy) {
    haptics.warning();
    showToast({ message: 'Stop the clock before duplicating a running entry' });
    return;
  }
  haptics.tapLight();
  showToast({ message: `Duplicated ${entry.clientName}`, actionLabel: 'Undo', onAction: () => deleteEntry(copy.id) });
}

/** Soft delete with an undo toast (routine and reversible: no confirmation alert). */
export function remove(entry: EntryWithClient) {
  deleteEntry(entry.id);
  haptics.warning();
  showToast({ message: 'Entry deleted', actionLabel: 'Undo', onAction: () => restoreEntry(entry.id) });
}
