import { useState } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { clockButtonHeight, cssEasing, motion, radius, spacing, useTheme, type ThemeColors } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconProps } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; text: 'callout' | 'body' | 'headline'; icon: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, text: 'callout', icon: 16 },
  md: { height: 48, paddingHorizontal: spacing.md, text: 'body', icon: 18 },
  lg: { height: 56, paddingHorizontal: spacing.lg, text: 'headline', icon: 20 },
  xl: { height: clockButtonHeight, paddingHorizontal: spacing.lg, text: 'headline', icon: 24 },
};

function variantColors(variant: ButtonVariant, c: ThemeColors) {
  switch (variant) {
    case 'primary':
      return { bg: c.accent, bgPressed: c.accentPressed, fg: c.onAccent };
    case 'destructive':
      return { bg: c.danger, bgPressed: c.danger, fg: c.onDanger };
    case 'ghost':
      return { bg: 'transparent', bgPressed: c.surfaceSunken, fg: c.accentText };
    default:
      return { bg: c.surfaceSunken, bgPressed: c.border, fg: c.text };
  }
}

export type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: Pick<IconProps, 'sf' | 'md'>;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width (default true). */
  block?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's button. Feedback on press-in (3% scale + pressed fill in 150 ms), commit on
 * release. `xl` is the gloved-thumb size used for the clock.
 */
export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  block = true,
  accessibilityHint,
  style,
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  // Disabled reads as a sunken, tertiary-label control (no see-through 45% opacity fill).
  const v = disabled
    ? { bg: variant === 'ghost' ? 'transparent' : colors.surfaceSunken, bgPressed: colors.surfaceSunken, fg: colors.textTertiary }
    : variantColors(variant, colors);
  const s = SIZES[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={size === 'sm' ? spacing.xs : 0}
      pressRetentionOffset={spacing.md}
      style={[block ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      <Animated.View
        style={{
          minHeight: s.height,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: spacing.xs,
          borderRadius: size === 'xl' ? radius.lg : radius.md,
          borderCurve: 'continuous',
          backgroundColor: pressed ? v.bgPressed : v.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          transitionProperty: ['transform', 'backgroundColor'],
          transitionDuration: motion.duration.fast,
          transitionTimingFunction: cssEasing.standard,
        }}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon ? <Icon sf={icon.sf} md={icon.md} color={v.fg} size={s.icon} weight="semibold" /> : null}
            <View style={{ flexShrink: 1 }}>
              <AppText variant={s.text} weight="600" style={{ color: v.fg }} numberOfLines={2} align="center">
                {title}
              </AppText>
            </View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
