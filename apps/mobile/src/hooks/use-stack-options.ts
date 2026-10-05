import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { supportsLiquidGlass } from '@/components/glass-card';
import { useTheme } from '@/theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;
type ScreenOptions = Exclude<StackOptions, (...args: never[]) => unknown>;

const IOS = process.env.EXPO_OS === 'ios';

/**
 * Native stack options for every tab: iOS large titles that collapse over a scroll-edge
 * material (system Liquid Glass on iOS 26), a flat Material top app bar on Android.
 */
export function useTabStackOptions(): ScreenOptions {
  const { colors } = useTheme();
  return {
    headerLargeTitleEnabled: IOS,
    headerTransparent: IOS,
    headerBlurEffect: IOS && !supportsLiquidGlass ? 'systemChromeMaterial' : undefined,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerStyle: { backgroundColor: IOS ? 'transparent' : colors.surface },
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerTitleStyle: { color: colors.text },
    headerLargeTitleStyle: { color: colors.text },
    headerTintColor: colors.accentText,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.surface },
  };
}
