import { Link } from 'expo-router';
import { Pressable } from 'react-native';

import { EntryRow } from '@/components/entry-row';
import { useEntryPhotos } from '@/hooks/use-entries';

import { duplicate, editEntry, remove } from './entry-actions';
import type { EntryItemProps } from './entry-item.types';

/** Tap opens the edit sheet; long-press shows the native context menu. */
export function EntryItem({ entry, seconds, earningsCents, showClient }: EntryItemProps) {
  const photos = useEntryPhotos(entry.id);
  return (
    <Link href={{ pathname: '/entry-editor', params: { id: entry.id } }} asChild>
      <Link.Trigger>
        <Pressable accessibilityHint="Opens the entry. Long press for more actions">
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
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction title="Edit" icon="pencil" onPress={() => editEntry(entry)} />
        <Link.MenuAction title="Duplicate" icon="plus.square.on.square" disabled={!entry.endedAt} onPress={() => duplicate(entry)} />
        <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => remove(entry)} />
      </Link.Menu>
    </Link>
  );
}
