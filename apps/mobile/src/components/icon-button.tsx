import { useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { cssEasing, motion, radius, touchTarget, useTheme } from '@/theme';

import { Icon, type IconProps } from './icon';

export type IconButtonProps = Pick<IconProps, 'sf' | 'md'> & {
  /** Required: icon-only controls must be labelled. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'plain' | 'tinted' | 'filled';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round icon-only control with a 44/48 pt touch target. */
export function IconButton({
  sf,
  md,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = touchTarget,
  disabled,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  const bg = variant === 'filled' ? colors.accent : variant === 'tinted' ? colors.accentSoft : 'transparent';
  const fg = variant === 'filled' ? colors.onAccent : variant === 'tinted' ? colors.accentText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={Math.max(0, (touchTarget - size) / 2)}
      style={style}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed && variant === 'plain' ? colors.surfaceSunken : bg,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          transitionProperty: ['transform', 'backgroundColor'],
          transitionDuration: motion.duration.fast,
          transitionTimingFunction: cssEasing.standard,
        }}
      >
        <Icon sf={sf} md={md} color={fg} size={Math.round(size * 0.45)} weight="semibold" />
      </Animated.View>
    </Pressable>
  );
}
