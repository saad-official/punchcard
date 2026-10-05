import { type DimensionValue } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { radius as radii, useTheme, type RadiusToken } from '@/theme';

const PULSE = {
  from: { opacity: 1 },
  '50%': { opacity: 0.45 },
  to: { opacity: 1 },
};

/** Placeholder block for content with a known layout that is still loading. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
}: {
  width?: DimensionValue;
  height?: number;
  radius?: RadiusToken;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radii[radius], backgroundColor: colors.surfaceSunken },
        reduced
          ? null
          : {
              animationName: PULSE,
              animationDuration: '1400ms',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
      ]}
    />
  );
}
