import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { showToast, ToastHost } from '@/components/toast';
import { ensureDatabaseReady, useDatabaseMigrations } from '@/data';
import { useSettings } from '@/hooks/use-settings';
import * as haptics from '@/native/haptics';
import type { StatusAction } from '@/native/live-status';
import { startNativeServices } from '@/native/surface-sync';
import { radius, spacing, useAppearanceOverride, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * A Stop / Break / Start pressed on the Lock Screen, Dynamic Island, Live Update or a
 * notification. `startNativeServices` already applies it through the clock repositories;
 * the UI only acknowledges it (and routes "open" to the Clock tab).
 */
function onNativeAction(event: StatusAction) {
  const foreground = AppState.currentState === 'active';
  switch (event.action) {
    case 'stop':
      if (foreground) {
        haptics.success();
        showToast({ message: 'Clocked out' });
      }
      break;
    case 'start':
      if (foreground) {
        haptics.clockIn();
        showToast({ message: 'Clocked in' });
      }
      break;
    case 'break':
      if (foreground) haptics.tapLight();
      break;
    case 'open':
      try {
        router.navigate('/clock');
      } catch {
        // Navigation not mounted yet (cold start): the deep link opens the Clock tab anyway.
      }
      break;
  }
}

export default function RootLayout() {
  const db = useDatabaseMigrations();
  const ready = db.success || !!db.error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (db.error) return <DatabaseErrorScreen error={db.error} />;
  if (!db.success) return null; // the splash screen stays up
  return <App />;
}

function App() {
  const { onboarded } = useSettings();
  useAppearanceOverride();
  const theme = useTheme();
  const { colors, isDark } = theme;

  useEffect(() => startNativeServices({ onAction: onNativeAction }), []);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accentText,
        background: colors.surface,
        card: colors.surface,
        text: colors.text,
        border: colors.separator,
        notification: colors.accent,
      },
    };
  }, [isDark, colors]);

  const sheet = (detents: number[]) =>
    ({
      presentation: 'formSheet',
      sheetGrabberVisible: true,
      sheetAllowedDetents: detents,
      sheetCornerRadius: radius.lg,
      headerShown: false,
      contentStyle: { backgroundColor: colors.surface },
    }) as const;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="client-picker" options={sheet([0.6, 1])} />
            <Stack.Screen name="client-editor" options={sheet([1])} />
            <Stack.Screen name="entry-editor" options={sheet([1])} />
            <Stack.Screen name="paywall" options={sheet([1])} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function DatabaseErrorScreen({ error }: { error: Error }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}
      >
        <EmptyState
          icon={{ sf: 'externaldrive.badge.exclamationmark', md: 'database' }}
          title="Punchcard couldn't open its database"
          body="Nothing has been deleted. Try again; if it keeps failing, restart the app or contact support."
          action={<PrimaryButton title="Try again" block={false} onPress={() => ensureDatabaseReady().catch(() => undefined)} />}
        />
        <AppText variant="caption" tone="tertiary" selectable align="center">
          {error.message}
        </AppText>
      </ScrollView>
    </View>
  );
}
