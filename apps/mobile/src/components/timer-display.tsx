import { formatDuration } from '@punchcard/shared';
import Animated from 'react-native-reanimated';

import { spokenDuration } from '@/constants/format';
import { cssEasing, motion, tabular, textStyles, useTheme, type TypeToken } from '@/theme';

export type TimerDisplayProps = {
  seconds: number;
  /** Dimmed while on break: the main timer pauses visually. */
  dimmed?: boolean;
  variant?: Extract<TypeToken, 'display' | 'title' | 'headline'>;
  tone?: 'primary' | 'secondary';
  accessibilityLabelPrefix?: string;
};

/**
 * "1:05:09" in tabular (fixed-width) figures so digits never shift as they tick. Long runs
 * shrink to fit instead of wrapping.
 */
export function TimerDisplay({
  seconds,
  dimmed = false,
  variant = 'display',
  tone = 'primary',
  accessibilityLabelPrefix,
}: TimerDisplayProps) {
  const { colors } = useTheme();
  const label = spokenDuration(seconds);
  return (
    <Animated.Text
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabelPrefix ? `${accessibilityLabelPrefix}, ${label}` : label}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={[
        textStyles[variant],
        tabular,
        {
          color: tone === 'primary' ? colors.text : colors.textSecondary,
          opacity: dimmed ? 0.35 : 1,
          transitionProperty: 'opacity',
          transitionDuration: motion.duration.base,
          transitionTimingFunction: cssEasing.standard,
        },
      ]}
    >
      {formatDuration(seconds)}
    </Animated.Text>
  );
}
