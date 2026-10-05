import { Pressable } from 'react-native';

import { EntryRow } from '@/components/entry-row';
import { useEntryPhotos } from '@/hooks/use-entries';
import * as haptics from '@/native/haptics';

import { editEntry } from './entry-actions';
import type { EntryItemProps } from './entry-item.types';

/** Tap opens the edit sheet; long-press opens the action sheet (Material idiom). */
export function EntryItem({ entry, seconds, earningsCents, showClient, onLongPress }: EntryItemProps) {
  const photos = useEntryPhotos(entry.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the entry. Long press for more actions"
      accessibilityActions={[{ name: 'longpress', label: 'More actions' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') onLongPress?.(entry);
      }}
      onPress={() => editEntry(entry)}
      onLongPress={() => {
        haptics.tapLight();
        onLongPress?.(entry);
      }}
    >
      {({ pressed }) => (
        <EntryRow
          entry={entry}
          seconds={seconds}
          earningsCents={earningsCents}
          photoCount={photos.length}
          showClient={showClient}
          pressed={pressed}
        />
      )}
    </Pressable>
  );
}
