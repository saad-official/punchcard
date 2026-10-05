// One theme entry point: `import { spacing, useTheme, textStyles } from '@/theme'`.
// Values come from `@punchcard/shared/tokens`; this folder only resolves them for React Native
// (colour scheme, accent, platform colours, Reanimated easings).
import { motion } from '@punchcard/shared/tokens';
import { Color } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { cubicBezier, Easing } from 'react-native-reanimated';

export { fontWeight, motion, radius, shadows, spacing, type } from '@punchcard/shared/tokens';
export type { ColorScheme, RadiusToken, ShadowLevel, SpacingToken, TypeToken } from '@punchcard/shared/tokens';
export { ACCENTS, DEFAULT_ACCENT, resolveAccent, type AccentDefinition, type AccentId } from './accents';
export { overline, tabular, textStyles, typeStyle } from './typography';
export { buildTheme, useTheme, type Theme, type ThemeColors } from './use-theme';

/** Reanimated `withTiming` easings built from the motion tokens. */
export const easing = {
  standard: Easing.bezier(...motion.easing.standard),
  exit: Easing.bezier(...motion.easing.exit),
} as const;

/** Reanimated CSS-transition timing functions built from the motion tokens. */
export const cssEasing = {
  standard: cubicBezier(...motion.easing.standard),
  exit: cubicBezier(...motion.easing.exit),
} as const;

/** One device pixel: list separators only. */
export const hairline = StyleSheet.hairlineWidth;

/** Minimum touch target (HIG 44 pt / Material 48 dp). Gloves need more: see `PrimaryButton` sizes. */
export const touchTarget = Platform.select({ android: 48, default: 44 });

/** Height of the primary clock button: big enough for a gloved thumb. */
export const clockButtonHeight = 88;

/** Width of a client colour bar (a thin vertical stripe, never a card fill). */
export const clientBarWidth = 4;

/**
 * Semantic platform colours (`Color` from expo-router) for chrome that should match the OS
 * exactly (disclosure chevrons). Brand surfaces and text come from `useTheme().colors`.
 */
export const platformColors = {
  tertiaryLabel: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.outline,
    default: '#868D97',
  })!,
};

/** 2 pt optical nudge (badge padding, tight stacks): below the 4-pt grid on purpose. */
export const microSpacing = 2;
