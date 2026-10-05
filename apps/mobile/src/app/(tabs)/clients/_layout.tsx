import { Stack } from 'expo-router';

import { ErrorView } from '@/components/error-view';
import { useTabStackOptions } from '@/hooks/use-stack-options';

export const ErrorBoundary = ErrorView;

export default function ClientsStack() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Clients' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
