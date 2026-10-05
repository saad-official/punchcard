import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { hairline, platformColors, radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

/**
 * Inset grouped container (iOS Settings / Material list section). Rows are separated by
 * inset hairlines; the group is defined by surface contrast, not borders.
 */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View
      style={[
        { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
        style,
      ]}
    >
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? (
            <View style={{ height: hairline, backgroundColor: colors.separator, marginStart: spacing.md }} />
          ) : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Trailing secondary value (e.g. the current setting). */
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Shows a disclosure chevron (default: when pressable and no trailing node). */
  chevron?: boolean;
  destructive?: boolean;
  accent?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  numberOfLines?: number;
};

/** One grouped-list row. Rows highlight their background on press; they never scale. */
export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  onPress,
  chevron,
  destructive,
  accent,
  disabled,
  accessibilityHint,
  accessibilityLabel,
  numberOfLines = 2,
}: ListRowProps) {
  const { colors } = useTheme();
  const showChevron = chevron ?? (!!onPress && !trailing && process.env.EXPO_OS === 'ios');
  const content = (pressed: boolean) => (
    <View
      style={{
        minHeight: touchTarget + spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <AppText
          variant="body"
          tone={destructive ? 'danger' : accent ? 'accent' : 'primary'}
          weight={accent ? '600' : undefined}
          numberOfLines={numberOfLines}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={numberOfLines}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="callout" tone="secondary" numberOfLines={1} style={{ flexShrink: 1, maxWidth: '50%' }} tabular>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {showChevron ? <Icon sf="chevron.forward" md="chevron_right" size={14} color={platformColors.tertiaryLabel} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel}>
        {content(false)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}
