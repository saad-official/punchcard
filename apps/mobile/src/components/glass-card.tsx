import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceTransparency } from '@/hooks/use-accessibility';
import { radius as radii, spacing, useTheme, type RadiusToken } from '@/theme';

const CAN_GLASS = process.env.EXPO_OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassCardProps = {
  children: ReactNode;
  radius?: RadiusToken;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** Interactive glass reacts to touches; only for actual controls. */
  interactive?: boolean;
};

/**
 * A floating surface: Liquid Glass on iOS 26, system material blur on older iOS, and a solid
 * elevated surface on Android or with Reduce Transparency. Never nest one inside another, and
 * never animate its opacity (animate the content instead).
 */
export function GlassCard({ children, radius = 'lg', padding = spacing.md, style, interactive }: GlassCardProps) {
  const { colors, shadow, isDark } = useTheme();
  const reduce = useReduceTransparency();
  const shape: ViewStyle = { borderRadius: radii[radius], borderCurve: 'continuous', padding };

  if (CAN_GLASS && !reduce) {
    return (
      <GlassView isInteractive={interactive} style={[shape, style]}>
        {children}
      </GlassView>
    );
  }
  if (process.env.EXPO_OS === 'ios' && !reduce) {
    return (
      <BlurView
        tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
        intensity={90}
        style={[shape, { overflow: 'hidden' }, style]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[shape, { backgroundColor: colors.surfaceElevated, boxShadow: shadow('md') }, style]}>{children}</View>
  );
}

/** Whether the platform renders real Liquid Glass (used to avoid glass-on-glass). */
export const supportsLiquidGlass = CAN_GLASS;
