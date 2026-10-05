import { Link } from 'expo-router';
import { Pressable } from 'react-native';

import { startClock } from '@/screens/clock/clock-actions';

import { archive, editClient, unarchive } from './client-actions';
import { ClientRowContent } from './client-row-content';
import type { ClientRowProps } from './client-row.types';

/** Tap opens the client; press and hold to peek and act. */
export function ClientRow({ client, weekSeconds, plan }: ClientRowProps) {
  const archived = !!client.archivedAt;
  return (
    <Link href={{ pathname: '/clients/[id]', params: { id: client.id } }} asChild>
      <Link.Trigger>
        <Pressable accessibilityHint="Opens the client. Long press for more actions">
          {({ pressed }) => <ClientRowContent client={client} weekSeconds={weekSeconds} pressed={pressed} />}
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        {archived ? null : (
          <Link.MenuAction title="Start clock" icon="play.fill" onPress={() => startClock(client.id)} />
        )}
        <Link.MenuAction title="Edit" icon="pencil" onPress={() => editClient(client)} />
        {archived ? (
          <Link.MenuAction title="Unarchive" icon="tray.and.arrow.up" onPress={() => unarchive(client, plan)} />
        ) : (
          <Link.MenuAction title="Archive" icon="archivebox" onPress={() => archive(client)} />
        )}
      </Link.Menu>
    </Link>
  );
}
