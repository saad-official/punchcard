import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { ClientRowContent } from './client-row-content';
import type { ClientRowProps } from './client-row.types';

/** Tap opens the client (actions live on the detail screen on Android). */
export function ClientRow({ client, weekSeconds }: ClientRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the client"
      onPress={() => router.push({ pathname: '/clients/[id]', params: { id: client.id } })}
    >
      {({ pressed }) => <ClientRowContent client={client} weekSeconds={weekSeconds} pressed={pressed} />}
    </Pressable>
  );
}
